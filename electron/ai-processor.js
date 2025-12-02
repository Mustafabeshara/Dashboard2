/**
 * Electron AI Document Processor
 * Handles AI extraction for local documents
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// AI Processing configuration
const AI_CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  TIMEOUT: 30000,
};

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      success: true,
      text: data.text,
      pages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error('[AI Processor] PDF extraction failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Preprocess document text
 */
function preprocessText(text) {
  if (!text) return '';
  
  // Remove excessive whitespace
  let processed = text.replace(/\s+/g, ' ');
  
  // Remove special characters that might confuse LLM
  processed = processed.replace(/[^\x00-\x7F]+/g, ' ');
  
  // Normalize line breaks
  processed = processed.replace(/\r\n/g, '\n');
  
  // Remove page numbers and headers/footers (common patterns)
  processed = processed.replace(/Page \d+ of \d+/gi, '');
  processed = processed.replace(/^\d+\s*$/gm, '');
  
  // Trim
  processed = processed.trim();
  
  return processed;
}

/**
 * Call Gemini API for tender extraction
 */
async function callGeminiAPI(text) {
  const apiKey = AI_CONFIG.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `Extract tender information from the following document text. Return ONLY valid JSON with this exact structure:
{
  "reference": "tender reference number",
  "title": "tender title",
  "organization": "organization name",
  "closingDate": "closing date in YYYY-MM-DD format",
  "items": [
    {
      "itemDescription": "description",
      "quantity": number,
      "unit": "unit of measurement"
    }
  ],
  "notes": "additional notes",
  "confidence": {
    "overall": 0.85,
    "reference": 0.9,
    "title": 0.85,
    "organization": 0.9,
    "closingDate": 0.8,
    "items": 0.85
  }
}

Document text:
${text.substring(0, 8000)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-002:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const extractedText = data.candidates[0].content.parts[0].text;
    return parseExtractionResult(extractedText);
    
  } catch (error) {
    console.error('[AI Processor] Gemini API error:', error);
    throw error;
  }
}

/**
 * Call Groq API for tender extraction (fallback)
 */
async function callGroqAPI(text) {
  const apiKey = AI_CONFIG.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const prompt = `Extract tender information from the following document. Return ONLY valid JSON with this structure:
{
  "reference": "tender reference",
  "title": "tender title",
  "organization": "organization name",
  "closingDate": "YYYY-MM-DD",
  "items": [{"itemDescription": "desc", "quantity": 0, "unit": "unit"}],
  "notes": "notes",
  "confidence": {"overall": 0.85, "reference": 0.9, "title": 0.85, "organization": 0.9, "closingDate": 0.8, "items": 0.85}
}

Document:
${text.substring(0, 6000)}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a tender document analysis expert. Extract structured information and return valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    const extractedText = data.choices[0].message.content;
    return parseExtractionResult(extractedText);
    
  } catch (error) {
    console.error('[AI Processor] Groq API error:', error);
    throw error;
  }
}

/**
 * Parse extraction result and validate
 */
function parseExtractionResult(text) {
  // Clean markdown formatting
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    
    // Validate required fields
    const required = ['reference', 'title', 'organization', 'closingDate', 'items'];
    for (const field of required) {
      if (!parsed[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Ensure items is an array
    if (!Array.isArray(parsed.items)) {
      parsed.items = [];
    }
    
    // Add default confidence if missing
    if (!parsed.confidence) {
      parsed.confidence = {
        overall: 0.7,
        reference: 0.7,
        title: 0.7,
        organization: 0.7,
        closingDate: 0.7,
        items: 0.7,
      };
    }
    
    return {
      success: true,
      data: parsed,
    };
    
  } catch (error) {
    console.error('[AI Processor] Parsing error:', error);
    console.error('[AI Processor] Raw text:', cleaned);
    
    // Return minimal valid structure
    return {
      success: false,
      error: error.message,
      data: {
        reference: '',
        title: 'Extraction Failed',
        organization: '',
        closingDate: new Date().toISOString().split('T')[0],
        items: [],
        notes: `Extraction failed: ${error.message}. Please enter data manually.`,
        confidence: {
          overall: 0.0,
          reference: 0.0,
          title: 0.0,
          organization: 0.0,
          closingDate: 0.0,
          items: 0.0,
        },
      },
    };
  }
}

/**
 * Process document with AI extraction
 */
async function processDocument(filePath) {
  console.log(`[AI Processor] Processing document: ${filePath}`);
  const startTime = Date.now();

  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Get file info
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    console.log(`[AI Processor] File size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`[AI Processor] File type: ${ext}`);

    // Extract text based on file type
    let extractedText = '';
    
    if (ext === '.pdf') {
      const pdfResult = await extractTextFromPDF(filePath);
      if (!pdfResult.success) {
        throw new Error(pdfResult.error || 'PDF extraction failed');
      }
      extractedText = pdfResult.text;
      console.log(`[AI Processor] Extracted ${pdfResult.pages} pages from PDF`);
    } else if (['.txt', '.text'].includes(ext)) {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else {
      throw new Error(`Unsupported file type: ${ext}. Only PDF and TXT files are supported.`);
    }

    // Preprocess text
    const processedText = preprocessText(extractedText);
    console.log(`[AI Processor] Preprocessed text length: ${processedText.length} characters`);

    if (processedText.length < 50) {
      throw new Error('Extracted text is too short. The document may be empty or unreadable.');
    }

    // Try Gemini first, then Groq as fallback
    let result;
    let provider = 'gemini';
    
    try {
      result = await callGeminiAPI(processedText);
      console.log('[AI Processor] Successfully extracted with Gemini');
    } catch (geminiError) {
      console.warn('[AI Processor] Gemini failed, trying Groq:', geminiError.message);
      provider = 'groq';
      try {
        result = await callGroqAPI(processedText);
        console.log('[AI Processor] Successfully extracted with Groq');
      } catch (groqError) {
        console.error('[AI Processor] Both AI providers failed');
        throw new Error(`AI extraction failed: ${geminiError.message} / ${groqError.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`[AI Processor] Processing completed in ${processingTime}ms`);

    return {
      success: result.success,
      data: result.data,
      provider,
      processingTime,
      textLength: processedText.length,
    };

  } catch (error) {
    console.error('[AI Processor] Processing failed:', error);
    return {
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Check if AI services are configured
 */
function checkAIConfiguration() {
  return {
    gemini: !!AI_CONFIG.GEMINI_API_KEY,
    groq: !!AI_CONFIG.GROQ_API_KEY,
    configured: !!(AI_CONFIG.GEMINI_API_KEY || AI_CONFIG.GROQ_API_KEY),
  };
}

module.exports = {
  processDocument,
  extractTextFromPDF,
  preprocessText,
  checkAIConfiguration,
  AI_CONFIG,
};
