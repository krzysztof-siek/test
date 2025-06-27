/**
 * OpenRouterService - A service for communicating with OpenRouter API
 * This file re-exports the OpenRouterService from the openrouter directory
 */

import { OPENROUTER_API_KEY, SITE } from "astro:env/server";
import { PUBLIC_APP_NAME } from "astro:env/client";
import { OpenRouterService } from "./openrouter";

// Create a singleton instance with proper server configuration
export const openRouterService = new OpenRouterService(OPENROUTER_API_KEY);

// Utility function to get server configuration for headers
export function getServerConfig() {
  return {
    site: SITE,
    appName: PUBLIC_APP_NAME,
  };
}

// Re-export the class and other utilities
export { OpenRouterService } from "./openrouter";
export * from "./openrouter/errors";
export type * from "./openrouter/types";
