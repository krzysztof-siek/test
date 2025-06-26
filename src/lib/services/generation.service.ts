import type { SupabaseClient } from "@supabase/supabase-js";
import type { Generation, SuggestionDto } from "../../types";
import { LLMService } from "./llm.service";
import { OPENROUTER_API_KEY } from "astro:env/server";

// Helper function to create SHA-256 hash using Web Crypto API
async function createSHA256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class GenerationService {
  private readonly MODEL = "openai/gpt-4o-mini";
  private llmService: LLMService;

  constructor(private supabase: SupabaseClient) {
    // Create LLM service with proper API key
    this.llmService = new LLMService({
      model: this.MODEL,
      maxRetries: 3,
      timeoutMs: 60000,
      apiKey: OPENROUTER_API_KEY,
    });
  }

  async createGeneration(params: {
    userId: string;
    sourceText: string;
    suggestions: SuggestionDto[];
    model: string;
    generationDurationMs: number;
  }): Promise<Generation> {
    const { userId, sourceText, suggestions, model, generationDurationMs } = params;

    try {
      console.log("[GenerationService] Creating generation record", {
        userId,
        model,
        suggestionsCount: suggestions.length,
        textLength: sourceText.length,
        duration: generationDurationMs,
      });

      const sourceTextHash = await createSHA256Hash(sourceText);

      const { data, error } = await this.supabase
        .from("generations")
        .insert({
          user_id: userId,
          model,
          generated_count: suggestions.length,
          source_text_hash: sourceTextHash,
          source_text_length: sourceText.length,
          generation_duration: generationDurationMs,
          accepted_edited_count: 0,
          accepted_unedited_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("[GenerationService] Failed to create generation record:", error);
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        console.error("[GenerationService] No data returned from insert");
        throw new Error("Failed to create generation record: no data returned");
      }

      return data;
    } catch (error) {
      console.error("[GenerationService] Unexpected error in createGeneration:", error);
      throw error;
    }
  }

  async generateFlashcardSuggestions(params: { userId: string; sourceText: string }): Promise<{
    generation: Generation;
    suggestions: SuggestionDto[];
  }> {
    const { userId, sourceText } = params;

    try {
      console.log("[GenerationService] Starting flashcard generation", {
        userId,
        textLength: sourceText.length,
        model: this.MODEL,
      });

      const startTime = Date.now();

      // Generowanie fiszek za pomocą LLMService
      const result = await this.llmService.generateFlashcardSuggestions(sourceText);
      const generationDurationMs = Date.now() - startTime;

      console.log("[GenerationService] LLM service response:", {
        success: !result.error,
        duration: generationDurationMs,
        suggestionsCount: result.suggestions?.length || 0,
      });

      // Tworzenie rekordu generacji w bazie danych
      if (result.error) {
        // Logowanie błędu, jeśli wystąpił
        const sourceTextHash = await createSHA256Hash(sourceText);

        console.error("[GenerationService] LLM service error:", {
          errorCode: result.error.code,
          errorMessage: result.error.message,
        });

        await this.logGenerationError({
          userId,
          sourceTextHash,
          sourceTextLength: sourceText.length,
          model: this.MODEL,
          errorCode: result.error.code,
          errorMessage: result.error.message,
        });

        // Zwracamy puste wyniki w przypadku błędu
        throw new Error(`LLM service error (${result.error.code}): ${result.error.message}`);
      }

      // Zapisujemy wygenerowane fiszki
      if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
        console.error("[GenerationService] No valid suggestions returned");
        throw new Error("No valid flashcard suggestions to save");
      }

      const generation = await this.createGeneration({
        userId,
        sourceText,
        suggestions: result.suggestions,
        model: this.MODEL,
        generationDurationMs,
      });

      return {
        generation,
        suggestions: result.suggestions,
      };
    } catch (error) {
      console.error("[GenerationService] Unexpected error in generateFlashcardSuggestions:", error);
      throw error;
    }
  }

  async logGenerationError(params: {
    userId: string;
    sourceTextHash: string;
    sourceTextLength: number;
    model: string;
    errorCode: string;
    errorMessage: string;
  }): Promise<void> {
    try {
      console.log("[GenerationService] Logging generation error", {
        userId: params.userId,
        model: params.model,
        errorCode: params.errorCode,
      });

      const { error } = await this.supabase.from("generation_error_logs").insert({
        user_id: params.userId,
        source_text_hash: params.sourceTextHash,
        source_text_length: params.sourceTextLength,
        model: params.model,
        error_code: params.errorCode,
        error_message: params.errorMessage,
      });

      if (error) {
        console.error("[GenerationService] Failed to log generation error:", error);
      }
    } catch (error) {
      console.error("[GenerationService] Unexpected error while logging generation error:", error);
    }
  }
}
