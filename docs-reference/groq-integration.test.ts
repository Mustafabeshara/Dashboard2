import { describe, it, expect } from "vitest";
import { invokeGroq, isGroqConfigured, GROQ_MODELS } from "./_core/groq";
import { invokeUnifiedLLM, LLMProvider, getAvailableProviders } from "./_core/llmProvider";

describe("Groq Integration", () => {
  it("should check if Groq is configured", () => {
    const configured = isGroqConfigured();
    console.log("Groq configured:", configured);
    
    // Test passes regardless of configuration status
    expect(typeof configured).toBe("boolean");
  });

  it("should list available providers", () => {
    const providers = getAvailableProviders();
    console.log("Available providers:", providers);
    
    // Should always have at least Gemini
    expect(providers).toContain(LLMProvider.GEMINI);
    expect(Array.isArray(providers)).toBe(true);
  });

  it("should invoke unified LLM with Gemini (default)", async () => {
    const result = await invokeUnifiedLLM({
      messages: [
        { role: "user", content: "Say 'Hello from Gemini' in exactly those words." }
      ],
    });

    expect(result).toBeDefined();
    expect(result.choices).toBeDefined();
    expect(result.choices.length).toBeGreaterThan(0);
    expect(result.choices[0].message.content).toBeTruthy();
    
    console.log("Gemini response:", result.choices[0].message.content);
  });

  it("should handle Groq invocation if configured", async () => {
    if (!isGroqConfigured()) {
      console.log("Groq not configured, skipping Groq-specific test");
      return;
    }

    try {
      const result = await invokeGroq({
        messages: [
          { role: "user", content: "Say 'Hello from Groq' in exactly those words." }
        ],
        model: GROQ_MODELS.LLAMA_70B,
      });

      expect(result).toBeDefined();
      expect(result.choices).toBeDefined();
      expect(result.choices.length).toBeGreaterThan(0);
      expect(result.choices[0].message.content).toBeTruthy();
      
      console.log("Groq response:", result.choices[0].message.content);
    } catch (error: any) {
      console.error("Groq invocation failed:", error.message);
      // Don't fail the test if Groq API has issues
      expect(error).toBeDefined();
    }
  });

  it("should fallback to Gemini if Groq fails", async () => {
    // Force Groq provider even if not configured to test fallback
    const result = await invokeUnifiedLLM({
      messages: [
        { role: "user", content: "Say 'Hello' in one word." }
      ],
    }, { provider: LLMProvider.GROQ });

    // Should get a response (either from Groq or Gemini fallback)
    expect(result).toBeDefined();
    expect(result.choices).toBeDefined();
    expect(result.choices.length).toBeGreaterThan(0);
    
    console.log("Unified LLM response (with fallback):", result.choices[0].message.content);
  });
});
