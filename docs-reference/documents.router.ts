          let extractionError = null;
          try {
            console.log(`[MultiFileUpload] Starting extraction for document ${document.documentId}`);
            extractedData = await withTimeout(
              extractTenderFromDocument(document.documentId, url),
              EXTRACTION_TIMEOUT_MS,
              "Extraction timeout"
            );
            console.log(`[MultiFileUpload] Successfully extracted data for ${file.fileName}`);
          } catch (extractError: any) {
            console.error(`[MultiFileUpload] Extraction error for ${file.fileName}:`, extractError);
            extractionSuccess = false;
            extractionError = extractError.message || 'Unknown extraction error';
          }

          results.push({
            fileName: file.fileName,
            documentId: document.documentId,
            success: extractionSuccess,
            data: extractionSuccess ? extractedData : undefined,