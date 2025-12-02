import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  LLMProvider,
  getAvailableProviders,
  getProviderDisplayName,
  getProviderModels,
  isProviderAvailable,
} from "../_core/llmProvider";

export const llmSettingsRouter = router({
  /**
   * Get list of available LLM providers
   */
  getAvailableProviders: protectedProcedure.query(async () => {
    const providers = getAvailableProviders();
    
    return providers.map(provider => ({
      id: provider,
      name: getProviderDisplayName(provider),
      available: isProviderAvailable(provider),
      models: getProviderModels(provider),
    }));
  }),

  /**
   * Get current LLM provider configuration
   * Note: This is stored in environment variables, not database
   */
  getCurrentConfig: protectedProcedure.query(async () => {
    const groqConfigured = isProviderAvailable(LLMProvider.GROQ);
    const geminiConfigured = isProviderAvailable(LLMProvider.GEMINI);
    
    return {
      defaultProvider: groqConfigured ? LLMProvider.GROQ : LLMProvider.GEMINI,
      groqConfigured,
      geminiConfigured,
      recommendation: {
        pdf: LLMProvider.GEMINI,
        image: groqConfigured ? LLMProvider.GROQ : LLMProvider.GEMINI,
        text: groqConfigured ? LLMProvider.GROQ : LLMProvider.GEMINI,
      },
    };
  }),
});
