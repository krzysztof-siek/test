import type { SupabaseClient } from "@supabase/supabase-js";
import type { Generation, SuggestionDto } from "../../types";
import { llmService } from "./llm.service";

// Helper function to create SHA-256 hash using Web Crypto API
async function createSHA256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class GenerationService {
  constructor(private supabase: SupabaseClient) {}

  async createGeneration(params: {
    userId: string;
    sourceText: string;
    suggestions: SuggestionDto[];
    model: string;
    generationDurationMs: number;
  }): Promise<Generation> {
    const { userId, sourceText, suggestions, model, generationDurationMs } = params;

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
      throw new Error(`Failed to create generation: ${error.message}`);
    }

    return data;
  }

  async generateFlashcardSuggestions(params: { userId: string; sourceText: string }): Promise<{
    generation: Generation;
    suggestions: SuggestionDto[];
  }> {
    const { userId, sourceText } = params;

    const startTime = Date.now();

    // Generowanie fiszek za pomocą LLMService
    const result = await llmService.generateFlashcardSuggestions(sourceText);
    const generationDurationMs = Date.now() - startTime;

    // Tworzenie rekordu generacji w bazie danych
    if (result.error) {
      // Logowanie błędu, jeśli wystąpił
      const sourceTextHash = await createSHA256Hash(sourceText);

      await this.logGenerationError({
        userId,
        sourceTextHash,
        sourceTextLength: sourceText.length,
        model: "openai/gpt-3.5-turbo", // Zaktualizowana nazwa modelu
        errorCode: result.error.code,
        errorMessage: result.error.message,
      });

      // Zwracamy puste wyniki w przypadku błędu
      throw new Error(`Failed to generate flashcards: ${result.error.message}`);
    }

    // Zapisujemy wygenerowane fiszki
    if (!Array.isArray(result.suggestions) || result.suggestions.length === 0) {
      throw new Error("No valid flashcard suggestions to save");
    }

    const generation = await this.createGeneration({
      userId,
      sourceText,
      suggestions: result.suggestions,
      model: "openai/gpt-3.5-turbo", // Zaktualizowana nazwa modelu
      generationDurationMs,
    });

    return {
      generation,
      suggestions: result.suggestions,
    };
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
      // Upewnij się, że nazwy kolumn są zgodne ze schematem bazy danych
      const { error } = await this.supabase.from("generation_error_logs").insert({
        user_id: params.userId,
        source_text_hash: params.sourceTextHash,
        source_text_length: params.sourceTextLength,
        model: params.model,
        error_code: params.errorCode, // Zmieniono z errorCode na error_code
        error_message: params.errorMessage, // Zmieniono z errorMessage na error_message
      });

      if (error) {
        // Ignorowanie błędów logowania
      }
    } catch {
      // Ignorowanie błędów logowania
    }
  }
}
