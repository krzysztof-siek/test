import type { APIContext } from "astro";
import { authService } from "../../../lib/services/auth.service";
import { loginSchema } from "../../../lib/schemas/auth.schema";
import type { AuthResponseDTO, LoginDTO } from "../../../types";
import { rateLimitService } from "../../../lib/services/rate-limit.service";

export const prerender = false;

export async function POST({ request }: APIContext): Promise<Response> {
  try {
    console.log("[Login] Starting login process");

    // Zastosowanie rate limitingu dla endpointu logowania
    const clientIp = request.headers.get("x-forwarded-for") || "unknown";
    console.log("[Login] Client IP:", clientIp);
    const { allowed } = await rateLimitService.checkRateLimit(`login-${clientIp}`);

    if (!allowed) {
      console.log("[Login] Rate limit exceeded for IP:", clientIp);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.",
        } as AuthResponseDTO),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parsowanie danych wejściowych
    const body = await request.json();
    console.log("[Login] Received request body:", { email: body.email, password: "***" });

    // Walidacja danych
    const result = loginSchema.safeParse(body);
    console.log("[Login] Schema validation result:", result.success);

    if (!result.success) {
      console.log("[Login] Validation failed:", result.error.format());
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nieprawidłowe dane logowania",
          errors: result.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = result.data as LoginDTO;

    // Wywołanie serwisu autentykacji
    console.log("[Login] Attempting to authenticate user:", email);
    const { user, session, error } = await authService.login(email, password);
    console.log("[Login] Auth result:", {
      userExists: !!user,
      sessionExists: !!session,
      error: error ? { message: error.message, status: error.status } : null,
    });

    if (error || !user || !session) {
      console.log("[Login] Authentication failed:", error?.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nieprawidłowe dane logowania",
          error: error?.message,
        } as AuthResponseDTO),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Sukces - zwracamy odpowiedź z przekierowaniem
    console.log("[Login] Authentication successful, redirecting to /flashcards");
    return new Response(
      JSON.stringify({
        success: true,
        redirectTo: "/flashcards",
      } as AuthResponseDTO),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Obsługa błędu
    console.error("[Login] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Wystąpił błąd podczas logowania",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
