import { invokeLLM, type InvokeParams, type InvokeResult } from "./llm";
import { invokeGroq, isGroqConfigured, GROQ_MODELS, type GroqModel } from "./groq";

/**
 * Available LLM providers
 */
export enum LLMProvider {
  GEMINI = "gemini",
  GROQ = "groq",
}

/**
 * LLM provider configuration
 */
export interface LLMConfig {
  provider: LLMProvider;
  model?: string; // For Groq: llama-3.1-70b-versatile, mixtral-8x7b-32768, etc.
}

/**
 * Default LLM configuration
 * Priority: Gemini (more capable for PDFs) > Groq (faster for text/images)
 */
const DEFAULT_CONFIG: LLMConfig = {
  provider: LLMProvider.GEMINI,
};

/**
 * Get the default LLM provider based on availability
 */
export function getDefaultProvider(): LLMProvider {
  // Prefer Gemini for document extraction (better PDF support)
  // Fall back to Groq if Gemini is not available
  if (isGroqConfigured()) {
    return LLMProvider.GROQ;
  }
  return LLMProvider.GEMINI;
}

/**
 * Unified LLM invocation that routes to the appropriate provider
 */
export async function invokeUnifiedLLM(
  params: InvokeParams,
  config?: LLMConfig
): Promise<InvokeResult> {
  const effectiveConfig = config || DEFAULT_CONFIG;
  const provider = effectiveConfig.provider;
  
  try {
    if (provider === LLMProvider.GROQ) {
      if (!isGroqConfigured()) {
        console.warn("Groq not configured, falling back to Gemini");
        return await invokeLLM(params);
      }
      
      const model = (effectiveConfig.model as GroqModel) || GROQ_MODELS.LLAMA_70B;
      return await invokeGroq({ ...params, model });
    }
    
    // Default to Gemini
    return await invokeLLM(params);
  } catch (error) {
    console.error(`LLM invocation failed with ${provider}:`, error);
    
    // If Groq fails, try Gemini as fallback
    if (provider === LLMProvider.GROQ) {
      console.log("Falling back to Gemini after Groq failure");
      return await invokeLLM(params);
    }
    
    throw error;
  }
}

/**
 * Check if a specific provider is configured and available
 */
export function isProviderAvailable(provider: LLMProvider): boolean {
  switch (provider) {
    case LLMProvider.GROQ:
      return isGroqConfigured();
    case LLMProvider.GEMINI:
      return true; // Gemini is always available (built-in)
    default:
      return false;
  }
}

/**
 * Get list of available providers
 */
export function getAvailableProviders(): LLMProvider[] {
  const providers: LLMProvider[] = [];
  
  if (isProviderAvailable(LLMProvider.GEMINI)) {
    providers.push(LLMProvider.GEMINI);
  }
  
  if (isProviderAvailable(LLMProvider.GROQ)) {
    providers.push(LLMProvider.GROQ);
  }
  
  return providers;
}

/**
 * Get recommended provider for a specific task
 */
export function getRecommendedProvider(taskType: "pdf" | "image" | "text"): LLMProvider {
  switch (taskType) {
    case "pdf":
      // Gemini has better PDF support with file_url
      return LLMProvider.GEMINI;
    case "image":
    case "text":
      // Groq is faster for images and text
      return isGroqConfigured() ? LLMProvider.GROQ : LLMProvider.GEMINI;
    default:
      return LLMProvider.GEMINI;
  }
}

/**
 * Get provider display name
 */
export function getProviderDisplayName(provider: LLMProvider): string {
  switch (provider) {
    case LLMProvider.GEMINI:
      return "Google Gemini 2.5 Flash";
    case LLMProvider.GROQ:
      return "Groq (Llama 3.1 70B)";
    default:
      return provider;
  }
}

/**
 * Get available models for a provider
 */
export function getProviderModels(provider: LLMProvider): string[] {
  switch (provider) {
    case LLMProvider.GROQ:
      return Object.values(GROQ_MODELS);
    case LLMProvider.GEMINI:
      return ["gemini-2.5-flash"];
    default:
      return [];
  }
}
