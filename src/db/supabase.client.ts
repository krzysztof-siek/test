import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "astro:env/server";

import type { Database } from "./database.types";

// Add logging to debug configuration
console.log("[Supabase] Initializing client with URL:", SUPABASE_URL);
console.log("[Supabase] Key length:", SUPABASE_KEY?.length || 0);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("[Supabase] Missing required environment variables");
}

// Validate URL format
try {
  new URL(SUPABASE_URL);
} catch (error) {
  throw new Error(`[Supabase] Invalid URL format: ${error instanceof Error ? error.message : "unknown error"}`);
}

export const supabaseClient = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
