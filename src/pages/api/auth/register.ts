import type { APIContext } from "astro";
import { authService } from "../../../lib/services/auth.service";
import { registerSchema } from "../../../lib/schemas/auth.schema";
import type { AuthResponseDTO, RegisterDTO } from "../../../types";
import { rateLimitService } from "../../../lib/services/rate-limit.service";

export const prerender = false;

export async function POST({ request }: APIContext): Promise<Response> {
  try {
    console.log("[Register] Starting registration process");

    // Zastosowanie rate limitingu dla endpointu rejestracji
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    console.log("[Register] Client IP:", clientIp);
    const { allowed } = await rateLimitService.checkRateLimit(`register-${clientIp}`);

    if (!allowed) {
      console.log("[Register] Rate limit exceeded for IP:", clientIp);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.",
        } as AuthResponseDTO),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parsowanie danych wejściowych
    const body = await request.json();
    console.log("[Register] Received request body:", { email: body.email, password: "***" });

    // Walidacja danych
    const result = registerSchema.safeParse(body);
    console.log("[Register] Schema validation result:", result.success);

    if (!result.success) {
      console.log("[Register] Validation failed:", result.error.format());
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nieprawidłowe dane rejestracji",
          errors: result.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = result.data as RegisterDTO;

    // Wywołanie serwisu autentykacji
    console.log("[Register] Attempting to create user:", email);
    const { user, error } = await authService.register(email, password);
    console.log("[Register] Auth result:", {
      userCreated: !!user,
      error: error ? { message: error.message, status: error.status } : null,
    });

    if (error) {
      // Sprawdzenie konkretnych błędów Supabase
      console.log("[Register] Registration error:", error.message);
      if (error.message.includes("email already registered")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Użytkownik o podanym adresie email już istnieje",
            error: error.message,
          } as AuthResponseDTO),
          {
            status: 409, // Conflict
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: error.message || "Wystąpił błąd podczas rejestracji",
          error: error.message,
        } as AuthResponseDTO),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!user) {
      console.log("[Register] User creation failed without error");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nie udało się utworzyć konta",
        } as AuthResponseDTO),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Sukces - zwracamy odpowiedź z przekierowaniem
    console.log("[Register] Registration successful, redirecting to /flashcards");
    return new Response(
      JSON.stringify({
        success: true,
        message: "Zarejestrowano pomyślnie",
        redirectTo: "/flashcards",
      } as AuthResponseDTO),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Obsługa błędu
    console.error("[Register] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił błąd podczas rejestracji",
        error: error instanceof Error ? error.message : "Unknown error",
      } as AuthResponseDTO),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
