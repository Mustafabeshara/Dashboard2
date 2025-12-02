/**
 * Unified LLM Provider System
 * Ported from Dashboard repository with enhancements
 * Supports Gemini (with file_url for PDFs) and Groq
 */

import { getForgeApiKey, getGroqApiKey, getGeminiApiKey } from './api-keys'

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

/**
 * Ensure content is an array
 */
const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

/**
 * Normalize content part to proper format
 */
const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
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
    return part;
  }

  throw new Error("Unsupported message content part");
};

/**
 * Normalize message for API consumption
 */
const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

/**
 * Normalize tool choice
 */
const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

/**
 * Normalize response format
 */
const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

/**
 * Get API configuration - tries Gemini first, then Forge, then OpenAI
 */
const getGeminiConfig = async (): Promise<{ apiKey: string; apiUrl: string; useGoogleApi: boolean }> => {
  // First try Google's Gemini API directly
  const geminiKey = await getGeminiApiKey() || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  // Check if it's a real key (not placeholder)
  const placeholderPatterns = [
    'your-', '-key', 'placeholder', 'changeme', 'replace-me',
    'example', 'xxx', 'test-', 'dummy', 'sample', 'temp-',
  ]
  const isPlaceholder = geminiKey && placeholderPatterns.some(p => 
    geminiKey.toLowerCase().includes(p.toLowerCase())
  )
  
  if (geminiKey && !isPlaceholder && geminiKey.length > 20) {
    return {
      apiKey: geminiKey,
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      useGoogleApi: true
    };
  }

  // Fall back to Forge/OpenAI compatible API
  const forgeKey = await getForgeApiKey() || process.env.FORGE_API_KEY || process.env.OPENAI_API_KEY;
  const apiUrl = process.env.FORGE_API_URL || process.env.OPENAI_API_BASE;

  if (!forgeKey) {
    throw new Error("No AI API key configured. Please set GEMINI_API_KEY, GROQ_API_KEY, or configure via Settings > AI Provider API Keys.");
  }

  const resolvedUrl = apiUrl && apiUrl.trim().length > 0
    ? `${apiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

  return { apiKey: forgeKey, apiUrl: resolvedUrl, useGoogleApi: false };
};

/**
 * Convert messages to Google Gemini format
 */
function convertToGeminiFormat(messages: Message[]): { contents: unknown[]; systemInstruction?: unknown } {
  const contents: unknown[] = [];
  let systemInstruction: unknown = undefined;

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = { parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }] };
      continue;
    }

    const parts: unknown[] = [];
    const contentArray = Array.isArray(msg.content) ? msg.content : [msg.content];

    for (const content of contentArray) {
      if (typeof content === 'string') {
        parts.push({ text: content });
      } else if (content.type === 'text') {
        parts.push({ text: content.text });
      } else if (content.type === 'image_url') {
        // For images, extract base64 data
        const url = content.image_url.url;
        if (url.startsWith('data:')) {
          const [header, base64Data] = url.split(',');
          const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
          parts.push({ inlineData: { mimeType, data: base64Data } });
        } else {
          parts.push({ text: `[Image: ${url}]` });
        }
      } else if (content.type === 'file_url') {
        // For files/PDFs - use file URI
        parts.push({ 
          fileData: { 
            mimeType: content.file_url.mime_type || 'application/pdf',
            fileUri: content.file_url.url 
          } 
        });
      }
    }

    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts
    });
  }

  return { contents, systemInstruction };
}

/**
 * Invoke Google's Gemini API directly
 */
async function invokeGoogleGemini(params: InvokeParams, apiKey: string): Promise<InvokeResult> {
  const { messages, outputSchema, output_schema, responseFormat, response_format } = params;
  
  const { contents, systemInstruction } = convertToGeminiFormat(messages);
  
  const payload: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = systemInstruction;
  }

  // Handle JSON response format
  const format = responseFormat || response_format;
  const schema = outputSchema || output_schema;
  if (format?.type === 'json_object' || format?.type === 'json_schema' || schema) {
    payload.generationConfig = {
      ...payload.generationConfig as Record<string, unknown>,
      responseMimeType: 'application/json',
    };
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${response.statusText} – ${errorText}`);
  }

  const data = await response.json();
  
  // Convert Google's response to OpenAI-compatible format
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  return {
    id: `gemini-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gemini-1.5-flash',
    choices: [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: data.candidates?.[0]?.finishReason || 'stop',
    }],
    usage: {
      prompt_tokens: data.usageMetadata?.promptTokenCount || 0,
      completion_tokens: data.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: data.usageMetadata?.totalTokenCount || 0,
    },
  };
}

/**
 * Invoke Gemini - uses Google API directly if GEMINI_API_KEY is set, otherwise Forge
 * Supports direct PDF processing via file_url
 */
export async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  const config = await getGeminiConfig();
  
  // If using Google's native API
  if (config.useGoogleApi) {
    console.log('[LLM] Using Google Gemini API directly');
    return invokeGoogleGemini(params, config.apiKey);
  }

  // Otherwise use Forge/OpenAI compatible API
  console.log('[LLM] Using Forge API for Gemini');
  const { apiKey, apiUrl } = config;

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768;
  payload.thinking = {
    budget_tokens: 128,
  };

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

/**
 * Check if Groq is configured - now async to support database keys
 */
export async function isGroqConfigured(): Promise<boolean> {
  const apiKey = await getGroqApiKey()
  return !!apiKey
}

/**
 * Invoke Groq API
 */
export async function invokeGroq(
  params: InvokeParams & { model?: string }
): Promise<InvokeResult> {
  const apiKey = await getGroqApiKey() || process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured. Please configure via Admin > API Keys.");
  }

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    model = "llama-3.1-70b-versatile",
  } = params;

  const payload: Record<string, unknown> = {
    model,
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Groq invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

/**
 * LLM Provider enum
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
  model?: string;
}

/**
 * Get recommended provider for a specific task - now async
 */
export async function getRecommendedProvider(taskType: "pdf" | "image" | "text"): Promise<LLMProvider> {
  switch (taskType) {
    case "pdf":
      // Gemini has better PDF support with file_url
      return LLMProvider.GEMINI;
    case "image":
    case "text":
      // Groq is faster for images and text
      return (await isGroqConfigured()) ? LLMProvider.GROQ : LLMProvider.GEMINI;
    default:
      return LLMProvider.GEMINI;
  }
}

/**
 * Unified LLM invocation with automatic fallback
 */
export async function invokeUnifiedLLM(
  params: InvokeParams,
  config?: LLMConfig
): Promise<InvokeResult> {
  const effectiveConfig = config || { provider: LLMProvider.GEMINI };
  const provider = effectiveConfig.provider;

  try {
    if (provider === LLMProvider.GROQ) {
      if (!(await isGroqConfigured())) {
        console.warn("Groq not configured, falling back to Gemini");
        return await invokeGemini(params);
      }

      const model = effectiveConfig.model || "llama-3.1-70b-versatile";
      return await invokeGroq({ ...params, model });
    }

    // Default to Gemini
    return await invokeGemini(params);
  } catch (error) {
    console.error(`LLM invocation failed with ${provider}:`, error);

    // If Groq fails, try Gemini as fallback
    if (provider === LLMProvider.GROQ) {
      console.log("Falling back to Gemini after Groq failure");
      return await invokeGemini(params);
    }

    throw error;
  }
}
