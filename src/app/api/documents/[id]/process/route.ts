/**
 * Document Processing API
 * Enhanced with direct PDF processing via Gemini file_url
 */

import {
  extractTenderFromDocument,
  extractTenderFromText,
  needsHumanReview,
  validateTenderExtraction,
} from '@/lib/ai/tender-extraction';
import { audit } from '@/lib/audit';
import { preprocessDocument } from '@/lib/document-preprocessor';
import {
  downloadFileAsBuffer,
  extractTextFromBuffer,
  extractTextFromBufferWithChunking,
} from '@/lib/document-processor';
import { email, EmailTemplate } from '@/lib/email';
import { ocr } from '@/lib/ocr';
import { prisma } from '@/lib/prisma';
import { WebSocketHelpers } from '@/lib/websocket';
import { ExtractionType } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

// Map document types to extraction types
const DOCUMENT_TO_EXTRACTION_TYPE: Record<string, ExtractionType> = {
  TENDER_DOCUMENT: 'TENDER_EXTRACTION',
  TENDER_SPECS: 'TENDER_EXTRACTION',
  TENDER_BOQ: 'TENDER_EXTRACTION',
  TENDER_COMMERCIAL: 'TENDER_EXTRACTION',
  INVOICE: 'INVOICE_EXTRACTION',
  EXPENSE_RECEIPT: 'EXPENSE_EXTRACTION',
  RECEIPT: 'EXPENSE_EXTRACTION',
  DELIVERY_NOTE: 'DELIVERY_EXTRACTION',
  PRODUCT_DATASHEET: 'PRODUCT_EXTRACTION',
};

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const startTime = Date.now();

  try {
    // Get document
    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document has a URL (required for AI processing)
    if (!document.url) {
      return NextResponse.json(
        { error: 'Document URL not available. Please ensure document is uploaded to S3.' },
        { status: 400 }
      );
    }

    // Update document status to processing
    await prisma.document.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    // Get extraction type
    const extractionType = DOCUMENT_TO_EXTRACTION_TYPE[document.type] || 'OCR_TEXT';

    // Check if extraction already exists
    const existingExtraction = await prisma.documentExtraction.findFirst({
      where: {
        documentId: id,
        extractionType,
        status: 'COMPLETED',
      },
    });

    if (existingExtraction) {
      return NextResponse.json({
        success: true,
        extraction: existingExtraction,
        message: 'Document already processed',
        cached: true,
      });
    }

    // Create pending extraction record
    const extraction = await prisma.documentExtraction.create({
      data: {
        documentId: id,
        extractionType,
        provider: 'pending',
        model: 'pending',
        extractedData: {},
        status: 'PROCESSING',
      },
    });

    // Only tender extraction is implemented with new system
    // Other document types will be added later
    if (extractionType !== 'TENDER_EXTRACTION') {
      await prisma.documentExtraction.update({
        where: { id: extraction.id },
        data: {
          status: 'FAILED',
          errorMessage: `Extraction type ${extractionType} not yet implemented with new system`,
        },
      });

      await prisma.document.update({
        where: { id },
        data: { status: 'FAILED' },
      });

      return NextResponse.json(
        {
          success: false,
          error: `Extraction type ${extractionType} not yet implemented`,
        },
        { status: 501 }
      );
    }

    // Check if document needs OCR (scanned image)
    let documentUrl = document.url;
    let ocrText = '';
    if (ocr.isScannedDocument(document.mimeType)) {
      try {
        const ocrResult = await ocr.extractText(document.url);
        ocrText = ocrResult.text;

        // If OCR confidence is high enough, we can use it directly
        if (ocrResult.confidence > 0.8 && ocrResult.text.length > 100) {
          // We'll use the OCR text as input to our extraction
        }
      } catch (error) {
        console.warn('[ProcessDocument] OCR failed, using direct file processing:', error);
      }
    }

    // Extract tender data using new system

    let extractedData;
    try {
      // If we have high confidence OCR text, use it for extraction
      if (ocrText && ocrText.length > 100) {
        // Preprocess the OCR text before extraction
        const preprocessed = await preprocessDocument(ocrText, {
          cleanText: true,
          normalizeText: true,
          removeHeadersFooters: true,
        });
        extractedData = await extractTenderFromText(preprocessed.content);
      } else {
        // Use the original document processing approach
        extractedData = await extractTenderFromDocument(documentUrl, document.mimeType);
      }
    } catch (extractError: any) {
      console.warn(
        `[ProcessDocument] LLM extraction failed, trying fallback text extraction:`,
        extractError
      );

      // Fallback to text extraction + simpler LLM call
      try {
        const buffer = await downloadFileAsBuffer(documentUrl);
        const processedDoc = await extractTextFromBuffer(buffer, document.mimeType);

        // For very large documents, use chunking
        if (processedDoc.text.length > 100000) {
          // If document is larger than 100K characters

          // Extract text with chunking
          const chunks = await extractTextFromBufferWithChunking(buffer, document.mimeType, 50000);

          // Process each chunk and combine results
          let combinedResults: any[] = [];
          let combinedText = '';

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Preprocess the chunk
            const preprocessed = await preprocessDocument(chunk.text, {
              cleanText: true,
              normalizeText: true,
              removeHeadersFooters: true,
            });

            // Extract from chunk
            try {
              const chunkResult = await extractTenderFromText(preprocessed.content);
              combinedResults.push(chunkResult);
              combinedText += `\n\n--- CHUNK ${i + 1} ---\n${preprocessed.content}`;
            } catch (chunkError) {
              console.warn(`[ProcessDocument] Failed to process chunk ${i + 1}:`, chunkError);
            }
          }

          // Combine results from all chunks
          if (combinedResults.length > 0) {
            extractedData = combineChunkResults(combinedResults);
          } else {
            throw new Error('Failed to extract data from any chunk');
          }
        } else {
          // Combine OCR text with extracted text if both are available
          let combinedText = processedDoc.text;
          if (ocrText && ocrText.length > 0) {
            combinedText = `${ocrText}

---EXTRACTED_TEXT---

${processedDoc.text}`;
          }

          // If we got text, try a simpler extraction approach
          if (combinedText && combinedText.length > 0) {

            // Preprocess the combined text before extraction
            const preprocessed = await preprocessDocument(combinedText, {
              cleanText: true,
              normalizeText: true,
              removeHeadersFooters: true,
            });

            // Try extracting with just the text content
            extractedData = await extractTenderFromText(preprocessed.content);
          } else {
            throw new Error('No text extracted from document');
          }
        }
      } catch (fallbackError: any) {
        console.error(`[ProcessDocument] Fallback extraction also failed:`, fallbackError);

        await prisma.documentExtraction.update({
          where: { id: extraction.id },
          data: {
            status: 'FAILED',
            errorMessage: extractError.message || 'Extraction failed',
            processingTime: Date.now() - startTime,
          },
        });

        await prisma.document.update({
          where: { id },
          data: { status: 'FAILED' },
        });

        return NextResponse.json(
          {
            success: false,
            error: extractError.message || 'Extraction failed',
            processingTime: Date.now() - startTime,
          },
          { status: 500 }
        );
      }
    }

    // Validate extraction
    const validationErrors = validateTenderExtraction(extractedData);
    const requiresReview = needsHumanReview(extractedData);

    const processingTime = Date.now() - startTime;

    // Calculate overall confidence
    const confidence = extractedData.confidence?.overall || 0;

    // Determine which provider was actually used
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    const geminiAvailable = geminiKey && geminiKey.length > 20 && !geminiKey.includes('your-');
    const actualProvider = geminiAvailable ? 'gemini' : 'groq';
    const actualModel = geminiAvailable ? 'gemini-2.0-flash' : 'llama-3.1-70b-versatile';

    // Update extraction with results
    const updatedExtraction = await prisma.documentExtraction.update({
      where: { id: extraction.id },
      data: {
        provider: actualProvider,
        model: actualModel,
        extractedData: extractedData as any,
        confidence,
        status: 'COMPLETED',
        processingTime,
        isApproved: !requiresReview && validationErrors.length === 0,
      },
    });

    // Update document status
    await prisma.document.update({
      where: { id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    });


    // Audit trail
    await audit.logUpdate('Document', id, { status: 'PROCESSING' }, { status: 'PROCESSED' });

    // WebSocket notification
    WebSocketHelpers.notifyDocumentProcessed(
      { id, fileName: document.name, status: 'PROCESSED' },
      document.uploadedById || 'system'
    );

    // Email notification if user exists
    const user = document.uploadedById
      ? await prisma.user.findUnique({ where: { id: document.uploadedById } })
      : null;
    if (user?.email) {
      await email
        .sendTemplate(EmailTemplate.DOCUMENT_PROCESSED, user.email, {
          documentName: document.name,
          documentType: document.type,
          confidence: Math.round(confidence * 100),
          requiresReview,
          validationErrors: validationErrors.length,
        })
        .catch(err => console.error('Failed to send email:', err));
    }

    return NextResponse.json({
      success: true,
      extraction: updatedExtraction,
      extractedData,
      confidence,
      requiresReview,
      validationErrors,
      processingTime,
    });
  } catch (error) {
    console.error('Error processing document:', error);

    // Update document status
    await prisma.document
      .update({
        where: { id },
        data: { status: 'FAILED' },
      })
      .catch(console.error);

    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}

// GET /api/documents/[id]/process - Get extraction status
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        extractions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      document,
      latestExtraction: document.extractions[0] || null,
    });
  } catch (error) {
    console.error('Error getting extraction status:', error);
    return NextResponse.json({ error: 'Failed to get extraction status' }, { status: 500 });
  }
}

// Helper function to combine results from multiple chunks
function combineChunkResults(results: any[]): any {
  if (results.length === 0) {
    return null;
  }

  if (results.length === 1) {
    return results[0];
  }

  // Combine the best results from all chunks
  const combined: any = {
    reference: '',
    title: '',
    organization: '',
    closingDate: '',
    items: [],
    notes: '',
    confidence: {
      overall: 0,
      reference: 0,
      title: 0,
      organization: 0,
      closingDate: 0,
      items: 0,
    },
  };

  // Find the best values for each field based on confidence
  for (const result of results) {
    if (result.confidence?.reference > combined.confidence.reference) {
      combined.reference = result.reference;
      combined.confidence.reference = result.confidence.reference;
    }

    if (result.confidence?.title > combined.confidence.title) {
      combined.title = result.title;
      combined.confidence.title = result.confidence.title;
    }

    if (result.confidence?.organization > combined.confidence.organization) {
      combined.organization = result.organization;
      combined.confidence.organization = result.confidence.organization;
    }

    if (result.confidence?.closingDate > combined.confidence.closingDate) {
      combined.closingDate = result.closingDate;
      combined.confidence.closingDate = result.confidence.closingDate;
    }

    // Combine items from all chunks
    if (Array.isArray(result.items) && result.items.length > 0) {
      combined.items = [...combined.items, ...result.items];
      // Update items confidence as average
      if (result.confidence?.items) {
        const currentItemsConf = combined.confidence.items;
        const newItemsConf = result.confidence.items;
        combined.confidence.items = (currentItemsConf + newItemsConf) / 2;
      }
    }
  }

  // Calculate overall confidence as average of all field confidences
  const confidences = [
    combined.confidence.reference,
    combined.confidence.title,
    combined.confidence.organization,
    combined.confidence.closingDate,
    combined.confidence.items,
  ];

  combined.confidence.overall =
    confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

  return combined;
}
