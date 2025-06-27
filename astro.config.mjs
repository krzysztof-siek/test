// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: import.meta.env.PROD
        ? {
            "react-dom/server": "react-dom/server.edge",
          }
        : {},
    },
  },
  adapter: cloudflare(),
  experimental: { session: true },
  env: {
    schema: {
      // Supabase configuration (server-only secrets)
      SUPABASE_URL: envField.string({
        context: "server",
        access: "secret",
      }),
      SUPABASE_KEY: envField.string({
        context: "server",
        access: "secret",
      }),

      // OpenRouter API key (server-only secret)
      OPENROUTER_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),

      // Public client variables (available on both client and server)
      PUBLIC_OPENROUTER_API_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_APP_NAME: envField.string({
        context: "client",
        access: "public",
        optional: true,
        default: "10x Cards by Krzysiek",
      }),

      // Site configuration (public server variable)
      SITE: envField.string({
        context: "server",
        access: "public",
        optional: true,
        default: "https://example.com",
      }),
    },
  },
});
