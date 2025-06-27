import type { APIRoute } from "astro";
import { openRouterService, OpenRouterInvalidRequestError } from "../../lib/openrouter.service";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();

    // Simple input validation
    if (!body.message || typeof body.message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required and must be a string" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use the configured singleton instance
    const openrouter = openRouterService;

    // Example for getCompletion
    if (body.type === "text") {
      const completion = await openrouter.getCompletion({
        messages: [{ role: "user", content: body.message }],
        model: body.model || "anthropic/claude-3-haiku-20240307",
        systemPrompt: "You are a helpful assistant who provides concise answers.",
        temperature: 0.7,
        maxTokens: 500,
      });

      return new Response(JSON.stringify({ completion }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Example for getStructuredCompletion
    if (body.type === "structured") {
      const schema = {
        type: "object",
        properties: {
          name: { type: "string", description: "User name." },
          email: { type: "string", format: "email", description: "User email." },
        },
        required: ["name", "email"],
      };

      const structured = await openrouter.getStructuredCompletion({
        messages: [
          {
            role: "user",
            content: `Extract user information from the following text: ${body.message}`,
          },
        ],
        model: body.model || "anthropic/claude-3-haiku-20240307",
        systemPrompt: "You are an assistant who extracts data and returns it in JSON format.",
        schemaName: "extract_user_info",
        schema,
      });

      return new Response(JSON.stringify(structured), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Default response for unknown type
    return new Response(JSON.stringify({ error: 'Invalid type. Use "text" or "structured".' }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const status = error instanceof OpenRouterInvalidRequestError ? 400 : 500;
    const errorMessage = error.message || "An unknown error occurred";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};
