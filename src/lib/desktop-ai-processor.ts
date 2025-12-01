/**
 * Desktop AI Processor
 * Handles AI document processing in the desktop application
 */

import { extractTextFromBuffer } from './document-processor';
import { preprocessDocument } from './document-preprocessor';
import { extractTenderFromText } from './ai/tender-extraction';
import { validateTenderExtractionWithZod } from './ai/tender-validation';
import { logger } from './logger';

export interface DesktopAIProcessingResult {
  success: boolean;
  documentId: string;
  extractedData?: any;
  confidence?: number;
  errors?: string[];
  processingTime?: number;
}

export interface DesktopAIQueueItem {
  id: string;
  documentId: string;
  documentPath: string;
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  retryCount: number;
  errorMessage?: string;
}

class DesktopAIProcessor {
  private processingQueue: DesktopAIQueueItem[] = [];
  private isProcessing = false;
  private maxRetries = 3;

  /**
   * Add document to AI processing queue
   */
  async addToQueue(documentId: string, documentPath: string, mimeType: string): Promise<DesktopAIQueueItem> {
    const queueItem: DesktopAIQueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      documentId,
      documentPath,
      mimeType,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0
    };

    this.processingQueue.push(queueItem);
    logger.info('Document added to AI processing queue', { 
      context: { documentId, queueLength: this.processingQueue.length } 
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }

    return queueItem;
  }

  /**
   * Process documents in the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const item = this.processingQueue[0];

    try {
      // Update status
      item.status = 'processing';
      logger.info('Starting AI processing for document', { 
        context: { documentId: item.documentId, documentPath: item.documentPath } 
      });

      // Process document
      const result = await this.processDocument(item.documentPath, item.mimeType);
      
      if (result.success) {
        item.status = 'completed';
        logger.info('Document processed successfully', { 
          context: { documentId: item.documentId, confidence: result.confidence } 
        });
      } else {
        throw new Error(result.errors?.join(', ') || 'Processing failed');
      }

      // Remove from queue
      this.processingQueue.shift();

      // Process next item
      setTimeout(() => this.processQueue(), 1000);

    } catch (error: any) {
      logger.error('AI processing failed', error as Error, { documentId: item.documentId });
      item.status = 'failed';
      item.errorMessage = error.message || 'Unknown error';
      item.retryCount++;

      // Retry logic
      if (item.retryCount < this.maxRetries) {
        // Retry
        setTimeout(() => this.processQueue(), 5000);
      } else {
        // Remove from queue after max failures
        this.processingQueue.shift();
        logger.warn('Document processing failed after max retries', { 
          context: { documentId: item.documentId, retries: item.retryCount } 
        });

        // Process next item
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  /**
   * Process a single document
   */
  private async processDocument(documentPath: string, mimeType: string): Promise<DesktopAIProcessingResult> {
    const startTime = Date.now();
    const documentId = documentPath.split('/').pop() || 'unknown';

    try {
      // In a real desktop app, we would read the file from the local filesystem
      // For now, we'll simulate this with a placeholder
      logger.warn('Desktop file reading not implemented in this demo', { documentPath });

      // This is where we would implement the actual file reading and processing
      // For demonstration, we'll return a mock result
      const mockResult: DesktopAIProcessingResult = {
        success: true,
        documentId,
        extractedData: {
          reference: 'MOH-2024-DESKTOP-001',
          title: 'Desktop Processed Tender Document',
          organization: 'Ministry of Health',
          closingDate: '2024-12-31',
          items: [
            {
              itemDescription: 'Medical Equipment',
              quantity: 10,
              unit: 'units'
            }
          ],
          notes: 'Processed by desktop AI engine',
          confidence: {
            overall: 0.85,
            reference: 0.95,
            title: 0.90,
            organization: 0.95,
            closingDate: 0.90,
            items: 0.80
          }
        },
        confidence: 0.85,
        processingTime: Date.now() - startTime
      };

      return mockResult;

    } catch (error: any) {
      logger.error('Document processing failed', error as Error, { documentPath });
      return {
        success: false,
        documentId,
        errors: [error.message || 'Unknown error'],
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { 
    queue: DesktopAIQueueItem[]; 
    isProcessing: boolean; 
    pendingCount: number; 
    processingCount: number; 
    completedCount: number; 
    failedCount: number; 
  } {
    const pendingCount = this.processingQueue.filter(item => item.status === 'pending').length;
    const processingCount = this.processingQueue.filter(item => item.status === 'processing').length;
    const completedCount = this.processingQueue.filter(item => item.status === 'completed').length;
    const failedCount = this.processingQueue.filter(item => item.status === 'failed').length;

    return {
      queue: [...this.processingQueue],
      isProcessing: this.isProcessing,
      pendingCount,
      processingCount,
      completedCount,
      failedCount
    };
  }

  /**
   * Clear the processing queue
   */
  clearQueue(): void {
    this.processingQueue = [];
    this.isProcessing = false;
    logger.info('AI processing queue cleared');
  }
}

// Create singleton instance
export const desktopAIProcessor = new DesktopAIProcessor();