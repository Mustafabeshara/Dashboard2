import Groq from "groq-sdk";
import type { Message, InvokeResult, InvokeParams } from "./llm";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

// Available Groq models
export const GROQ_MODELS = {
  LLAMA_70B: "llama-3.1-70b-versatile",
  MIXTRAL_8X7B: "mixtral-8x7b-32768",
  LLAMA_8B: "llama-3.1-8b-instant",
} as const;

export type GroqModel = (typeof GROQ_MODELS)[keyof typeof GROQ_MODELS];

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY environment variable is not set");
  }
  
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: GROQ_API_KEY,
    });
  }
  
  return groqClient;
}

/**
 * Convert our unified message format to Groq's format
 */
function convertMessageToGroq(message: Message): any {
  const { role, content } = message;
  
  // Handle simple string content
  if (typeof content === "string") {
    return { role, content };
  }
  
  // Handle array content
  if (Array.isArray(content)) {
    // Groq doesn't support file_url, so we need to handle it differently
    const parts = content.map(part => {
      if (typeof part === "string") {
        return { type: "text", text: part };
      }
      
      if (part.type === "text") {
        return part;
      }
      
      if (part.type === "image_url") {
        return part;
      }
      
      if (part.type === "file_url") {
        // For PDFs, we'll need to convert to text or skip
        // Groq doesn't support direct PDF processing
        console.warn("Groq does not support file_url content type. Skipping PDF content.");
        return {
          type: "text",
          text: "[PDF content - not supported by Groq. Please use Gemini for PDF extraction.]"
        };
      }
      
      return part;
    });
    
    return { role, content: parts };
  }
  
  return { role, content };
}

/**
 * Invoke Groq LLM with our unified interface
 */
export async function invokeGroq(
  params: InvokeParams & { model?: GroqModel }
): Promise<InvokeResult> {
  const client = getGroqClient();
  
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    maxTokens,
    max_tokens,
    responseFormat,
    response_format,
    model = GROQ_MODELS.LLAMA_70B, // Default to llama-3.1-70b
  } = params;
  
  // Convert messages to Groq format
  const groqMessages = messages.map(convertMessageToGroq);
  
  // Build request parameters
  const requestParams: any = {
    model,
    messages: groqMessages,
    max_tokens: maxTokens || max_tokens || 8000,
  };
  
  // Add tools if provided
  if (tools && tools.length > 0) {
    requestParams.tools = tools;
    
    const choice = toolChoice || tool_choice;
    if (choice) {
      if (choice === "none" || choice === "auto" || choice === "required") {
        requestParams.tool_choice = choice;
      } else if ("name" in choice) {
        requestParams.tool_choice = {
          type: "function",
          function: { name: choice.name }
        };
      } else {
        requestParams.tool_choice = choice;
      }
    }
  }
  
  // Add response format if provided
  const format = responseFormat || response_format;
  if (format) {
    if (format.type === "json_object") {
      requestParams.response_format = { type: "json_object" };
    } else if (format.type === "json_schema") {
      // Groq supports JSON mode but not full JSON schema
      requestParams.response_format = { type: "json_object" };
      console.warn("Groq does not support json_schema response format. Using json_object instead.");
    }
  }
  
  try {
    const completion = await client.chat.completions.create(requestParams);
    
    // Convert Groq response to our unified format
    const result: InvokeResult = {
      id: completion.id,
      created: completion.created,
      model: completion.model,
      choices: completion.choices.map(choice => ({
        index: choice.index,
        message: {
          role: choice.message.role as any,
          content: choice.message.content || "",
          tool_calls: choice.message.tool_calls as any,
        },
        finish_reason: choice.finish_reason,
      })),
      usage: completion.usage ? {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
      } : undefined,
    };
    
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if Groq API is configured
 */
export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
}
