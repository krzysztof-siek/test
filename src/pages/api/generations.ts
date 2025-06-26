import type { APIRoute } from "astro";
import { z } from "zod";
import { GenerationService } from "../../lib/services/generation.service";
import type { GenerateFlashcardsCommand, GenerationCreateResponseDto } from "../../types";
export const prerender = false;

const generateFlashcardsSchema = z.object({
  source_text: z
    .string()
    .min(1000, "Source text must be at least 1000 characters long")
    .max(10000, "Source text cannot exceed 10000 characters"),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    console.log("[GenerationsAPI] Received POST request");

    // Sprawdzenie autoryzacji
    if (!locals.user) {
      console.error("[GenerationsAPI] Unauthorized request");
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "You must be logged in to generate flashcards",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Używamy ID zalogowanego użytkownika
    const userId = locals.user.id;
    const supabase = locals.supabase;
    const generationService = new GenerationService(supabase);

    // Parse and validate input
    let body: GenerateFlashcardsCommand;
    try {
      body = await request.json();
    } catch (error) {
      console.error("[GenerationsAPI] Failed to parse request body:", error);
      return new Response(
        JSON.stringify({
          error: "Invalid Request",
          message: "Failed to parse request body",
          details: error instanceof Error ? error.message : "Unknown parsing error",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validationResult = generateFlashcardsSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("[GenerationsAPI] Validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Validation Error",
          message: "Invalid input data",
          validation_errors: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      console.log("[GenerationsAPI] Starting flashcard generation", {
        userId,
        textLength: body.source_text.length,
      });

      // Generate flashcard suggestions using the integrated GenerationService
      const result = await generationService.generateFlashcardSuggestions({
        userId,
        sourceText: body.source_text,
      });

      console.log("[GenerationsAPI] Generation successful", {
        generationId: result.generation.id,
        suggestionsCount: result.suggestions.length,
      });

      // Return response
      const response: GenerationCreateResponseDto = {
        generation: {
          id: result.generation.id,
          model: result.generation.model,
          generated_count: result.generation.generated_count,
          accepted_unedited_count: result.generation.accepted_unedited_count,
          accepted_edited_count: result.generation.accepted_edited_count,
          source_text_hash: result.generation.source_text_hash,
          source_text_length: result.generation.source_text_length,
          generation_duration: result.generation.generation_duration,
          created_at: result.generation.created_at,
          updated_at: result.generation.updated_at,
        },
        suggestions: result.suggestions,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      // Obsługa błędów związanych z generacją
      console.error("[GenerationsAPI] Generation failed:", error);

      // Determine appropriate status code based on error type
      let statusCode = 503; // Default to Service Unavailable
      let errorType = "Generation Error";
      let errorMessage = "Failed to generate flashcard suggestions";

      if (error instanceof Error) {
        if (error.message.includes("Database error")) {
          statusCode = 500;
          errorType = "Database Error";
        } else if (error.message.includes("LLM service error")) {
          // Keep 503 for LLM service errors
          errorMessage = error.message;
        } else if (error.message.includes("No valid flashcard suggestions")) {
          statusCode = 422;
          errorType = "Processing Error";
          errorMessage = "Failed to generate valid flashcards";
        }
      }

      return new Response(
        JSON.stringify({
          error: errorType,
          message: errorMessage,
          details: error instanceof Error ? { name: error.name, stack: error.stack } : null,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("[GenerationsAPI] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: "An unexpected error occurred",
        details:
          error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
