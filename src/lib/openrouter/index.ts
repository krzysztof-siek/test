import {
  OpenRouterAuthenticationError,
  OpenRouterInvalidRequestError,
  OpenRouterRateLimitError,
  OpenRouterServerError,
  JSONParsingError,
  NetworkError,
  OpenRouterError,
} from "./errors";
import type { CompletionOptions, Message, OpenRouterResponse, StructuredCompletionOptions } from "./types";

// Domyślne klucze API dla testów i developerki - zastąp swoim prawdziwym kluczem
const DEFAULT_API_KEY = "sk-or-v1-TWOJA-WERSJA-TESTOWA"; // Ten klucz nie działa, musisz go zastąpić

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    // Sprawdź różne miejsca, gdzie może być dostępny klucz API
    // Note: astro:env variables will be available in proper server context
    const apiKey =
      process.env.OPENROUTER_API_KEY ||
      import.meta.env.OPENROUTER_API_KEY ||
      import.meta.env.PUBLIC_OPENROUTER_API_KEY ||
      DEFAULT_API_KEY;

    this.apiKey = apiKey;

    // Pokaż ostrzeżenie, jeśli używamy domyślnego klucza
    if (this.apiKey === DEFAULT_API_KEY) {
      // Usuń wszystkie console.warn, console.log, console.error
    }
  }

  /**
   * Get a standard text completion from the OpenRouter API
   */
  public async getCompletion(options: CompletionOptions): Promise<string> {
    const payload = this.#buildPayload(options);
    const response = await this.#request<OpenRouterResponse>(payload);

    if (!response.choices || response.choices.length === 0) {
      throw new Error("No completion returned from OpenRouter API");
    }

    return response.choices[0].message.content;
  }

  /**
   * Get a structured completion (JSON response) from the OpenRouter API
   */
  public async getStructuredCompletion<T>(options: StructuredCompletionOptions): Promise<T> {
    const payload = this.#buildPayload(options);
    const response = await this.#request<OpenRouterResponse>(payload);

    if (!response.choices || response.choices.length === 0) {
      // Usuń wszystkie console.warn, console.log, console.error
      throw new Error("No completion returned from OpenRouter API");
    }

    const content = response.choices[0].message.content;
    // Usuń wszystkie console.warn, console.log, console.error

    try {
      // Próba oczyszczenia odpowiedzi z potencjalnych dodatkowych znaków
      const cleanedContent = this.#cleanJsonContent(content);
      // Usuń wszystkie console.warn, console.log, console.error

      let parsed: any;
      try {
        parsed = JSON.parse(cleanedContent);
      } catch {
        // Jeśli parsowanie się nie powiodło, spróbuj jeszcze raz z surową odpowiedzią
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new JSONParsingError("Failed to parse model response as JSON.");
        }
      }

      // Jeśli oczekujemy tablicy, a dostaliśmy obiekt z właściwością zawierającą tablicę
      if (
        Array.isArray(options.schema) ||
        (typeof options.schema === "object" &&
          options.schema !== null &&
          "type" in options.schema &&
          options.schema.type === "array")
      ) {
        if (Array.isArray(parsed)) {
          return parsed as T;
        } else if (typeof parsed === "object" && parsed !== null) {
          // Szukamy pierwszej właściwości, która jest tablicą
          const arrayProp = Object.values(parsed).find(Array.isArray);
          if (arrayProp) {
            return arrayProp as T;
          }
          // Jeśli mamy obiekt z items, spróbujmy go przetworzyć
          if ("items" in parsed && Array.isArray(parsed.items)) {
            return parsed.items as T;
          }
        }
        throw new Error("Response is not an array and does not contain an array property");
      }

      return parsed as T;
    } catch (error: unknown) {
      if (error instanceof JSONParsingError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to process model response: ${errorMessage}`);
    }
  }

  /**
   * Clean up JSON content from potential extra characters or text
   */
  #cleanJsonContent(content: string): string {
    try {
      // Usuń znaki końca linii i niepotrzebne białe znaki
      let cleaned = content.replace(/\r?\n|\r/g, "").trim();

      // Znajdź pierwszy nawias kwadratowy lub klamrowy
      const startBracket = cleaned.indexOf("[");
      const startBrace = cleaned.indexOf("{");

      let startIndex = -1;
      if (startBracket >= 0 && startBrace >= 0) {
        startIndex = Math.min(startBracket, startBrace);
      } else if (startBracket >= 0) {
        startIndex = startBracket;
      } else if (startBrace >= 0) {
        startIndex = startBrace;
      }

      if (startIndex > 0) {
        cleaned = cleaned.substring(startIndex);
      }

      // Znajdź ostatni nawias kwadratowy lub klamrowy
      const endBracket = cleaned.lastIndexOf("]");
      const endBrace = cleaned.lastIndexOf("}");

      let endIndex = -1;
      if (endBracket >= 0 && endBrace >= 0) {
        endIndex = Math.max(endBracket, endBrace) + 1;
      } else if (endBracket >= 0) {
        endIndex = endBracket + 1;
      } else if (endBrace >= 0) {
        endIndex = endBrace + 1;
      }

      if (endIndex > 0 && endIndex < cleaned.length) {
        cleaned = cleaned.substring(0, endIndex);
      }

      // Próba naprawy typowych problemów z formatowaniem
      cleaned = cleaned
        // Usuń dodatkowe przecinki na końcu tablic i obiektów
        .replace(/,(\s*[\]}])/g, "$1")
        // Usuń znaki Unicode i kontrolne
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
        // Normalizuj cudzysłowy
        .replace(/[""]/g, '"')
        // Normalizuj spacje i tabulatory
        .replace(/\s+/g, " ");

      // Sprawdź czy JSON jest poprawny przed zwróceniem
      JSON.parse(cleaned); // To rzuci błąd jeśli JSON jest niepoprawny
      return cleaned;
    } catch {
      // Jeśli czyszczenie się nie powiodło, spróbuj jeszcze raz z oryginalną treścią
      // ale tylko z podstawowym czyszczeniem
      const basicCleaned = content
        .trim()
        .replace(/\r?\n|\r/g, "")
        .replace(/\s+/g, " ")
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "");

      try {
        JSON.parse(basicCleaned);
        return basicCleaned;
      } catch {
        return content; // Zwróć oryginalną treść jako ostateczność
      }
    }
  }

  /**
   * Build request payload based on provided options
   */
  #buildPayload(options: CompletionOptions | StructuredCompletionOptions): object {
    const messages: Message[] = [...options.messages];

    if (options.systemPrompt) {
      messages.unshift({ role: "system", content: options.systemPrompt });
    }

    const payload: Record<string, any> = {
      model: options.model,
      messages,
      temperature: 0.7, // Dodajemy domyślną temperaturę dla lepszej spójności
      max_tokens: 1000, // Dodajemy limit tokenów dla bezpieczeństwa
    };

    // Add optional parameters only if they are defined
    if (options.temperature !== undefined) {
      payload.temperature = options.temperature;
    }

    if (options.maxTokens !== undefined) {
      payload.max_tokens = options.maxTokens;
    }

    // Handle structured completion with JSON schema
    if ("schema" in options) {
      // Nie ustawiamy response_format, ponieważ nie wszystkie modele to wspierają

      // Dodaj instrukcję JSON schema w systemowym promptie
      const schemaInstructions = `\n\nIMPORTANT: Your response must be a valid JSON array of objects matching this schema:\n${JSON.stringify(options.schema, null, 2)}\n\nDo not include any text before or after the JSON. Return ONLY the JSON array.`;

      const systemPrompt = messages.find((m) => m.role === "system");
      if (systemPrompt) {
        systemPrompt.content += schemaInstructions;
      } else {
        messages.unshift({
          role: "system",
          content: `You are a helpful assistant that responds only in JSON format.${schemaInstructions}`,
        });
      }

      // Dodaj przypomnienie o formacie JSON na końcu wiadomości użytkownika
      const lastUserMessageIndex = messages.findLastIndex((m) => m.role === "user");
      if (lastUserMessageIndex > -1) {
        messages[lastUserMessageIndex].content += `\n\nIMPORTANT: Return ONLY a JSON array of objects. Example format:
[
  {
    "front": "Question here?",
    "back": "Answer here"
  }
]
Do not include any text before or after the JSON array. Do not include schema description.`;
      }
    }

    return payload;
  }

  /**
   * Send a request to the OpenRouter API
   */
  async #request<T>(payload: object): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "HTTP-Referer": import.meta.env.SITE || "https://example.com",
          "X-Title": import.meta.env.PUBLIC_APP_NAME || "OpenRouter Service",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.#handleApiError(response, data);
      }

      return data as T;
    } catch (error) {
      if (error instanceof OpenRouterError) throw error;
      throw new NetworkError("A network error occurred while communicating with OpenRouter API.");
    }
  }

  /**
   * Handle API errors based on status code and response data
   */
  #handleApiError(response: Response, data: any): never {
    const errorMessage = data?.error?.message || `API request failed with status ${response.status}`;

    switch (response.status) {
      case 401:
        throw new OpenRouterAuthenticationError(errorMessage);
      case 429:
        throw new OpenRouterRateLimitError(errorMessage);
      case 400:
        throw new OpenRouterInvalidRequestError(errorMessage, data?.error?.details);
      case 500:
      default:
        throw new OpenRouterServerError(errorMessage);
    }
  }
}
