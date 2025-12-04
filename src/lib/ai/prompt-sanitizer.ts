/**
 * Prompt Injection Prevention Utilities
 * Sanitizes user inputs before interpolating into AI prompts
 */

// Patterns that could indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)/gi,
  /new\s+(system\s+)?instructions?:/gi,
  /system\s*prompt\s*:/gi,
  /\boverride\s+(system|instructions?)/gi,
  /\bbypass\s+(security|filter|restriction)/gi,
  /\breturn\s+(all\s+)?(api[_\s]?keys?|credentials?|secrets?|passwords?)/gi,
  /\bdump\s+(all\s+)?(env|environment|variables?|config)/gi,
  /\bexecute\s+(code|command|script)/gi,
  /\beval\s*\(/gi,
  /<\s*script/gi,
  /javascript\s*:/gi,
  /data\s*:\s*text\/html/gi,
];

// Characters that could be used to break out of template contexts
const DANGEROUS_CHARS = [
  { pattern: /\{\{/g, replacement: '{ {' },
  { pattern: /\}\}/g, replacement: '} }' },
  { pattern: /\{%/g, replacement: '{ %' },
  { pattern: /%\}/g, replacement: '% }' },
  { pattern: /<%-/g, replacement: '< %-' },
  { pattern: /-%>/g, replacement: '-% >' },
];

export interface SanitizeOptions {
  maxLength?: number;
  allowNewlines?: boolean;
  stripHtml?: boolean;
  logAttempts?: boolean;
}

const DEFAULT_OPTIONS: SanitizeOptions = {
  maxLength: 50000,
  allowNewlines: true,
  stripHtml: true,
  logAttempts: true,
};

/**
 * Check if input contains potential injection patterns
 */
export function detectInjectionAttempt(input: string): {
  detected: boolean;
  patterns: string[];
} {
  const detectedPatterns: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }

  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
  };
}

/**
 * Sanitize user input for safe prompt interpolation
 */
export function sanitizePromptInput(
  input: string,
  options: SanitizeOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // 1. Enforce length limit
  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
  }

  // 2. Check for injection attempts
  const injectionCheck = detectInjectionAttempt(sanitized);
  if (injectionCheck.detected && opts.logAttempts) {
    console.warn('[PromptSanitizer] Potential injection attempt detected:', {
      patterns: injectionCheck.patterns,
      inputLength: input.length,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. Remove or neutralize injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[FILTERED]');
  }

  // 4. Escape dangerous template characters
  for (const { pattern, replacement } of DANGEROUS_CHARS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // 5. Strip HTML tags if requested
  if (opts.stripHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // 6. Handle newlines
  if (!opts.allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // 7. Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Sanitize an object's string values recursively
 */
export function sanitizeObjectForPrompt<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizePromptInput(value, options);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string'
          ? sanitizePromptInput(item, options)
          : typeof item === 'object' && item !== null
            ? sanitizeObjectForPrompt(item as Record<string, unknown>, options)
            : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObjectForPrompt(value as Record<string, unknown>, options);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Create a safe prompt by combining system instructions with sanitized user input
 * This ensures user input cannot override system instructions
 */
export function createSafePrompt(
  systemTemplate: string,
  userInputs: Record<string, string>,
  options: SanitizeOptions = {}
): string {
  let prompt = systemTemplate;

  for (const [placeholder, value] of Object.entries(userInputs)) {
    const sanitizedValue = sanitizePromptInput(value, options);
    prompt = prompt.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), sanitizedValue);
  }

  return prompt;
}

/**
 * Validate AI response to ensure it doesn't contain leaked sensitive data
 */
export function validateAIResponse(response: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for potential credential leaks
  const sensitivePatterns = [
    { pattern: /sk-[a-zA-Z0-9]{32,}/g, name: 'OpenAI API key' },
    { pattern: /gsk_[a-zA-Z0-9]{32,}/g, name: 'Groq API key' },
    { pattern: /AIza[a-zA-Z0-9_-]{35,}/g, name: 'Google API key' },
    { pattern: /xox[baprs]-[a-zA-Z0-9-]+/g, name: 'Slack token' },
    { pattern: /ghp_[a-zA-Z0-9]{36,}/g, name: 'GitHub token' },
    { pattern: /postgres:\/\/[^\s]+/g, name: 'Database URL' },
    { pattern: /mongodb(\+srv)?:\/\/[^\s]+/g, name: 'MongoDB URL' },
  ];

  for (const { pattern, name } of sensitivePatterns) {
    if (pattern.test(response)) {
      issues.push(`Potential ${name} leak detected`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
