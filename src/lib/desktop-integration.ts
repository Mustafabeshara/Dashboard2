/**
 * Desktop Integration
 * Bridge between Electron main process and Next.js renderer
 */

// This file serves as a bridge between the Electron main process and the Next.js renderer
// It demonstrates how the desktop AI features integrate with the web-based UI components

import { desktopAIProcessor } from './desktop-ai-processor';
import { processDesktopDocument } from './desktop-document-processor';

/**
 * Desktop Integration Service
 * Coordinates between Electron main process and Next.js frontend
 */
export class DesktopIntegrationService {
  /**
   * Process a document using desktop AI capabilities
   * @param documentId - Unique identifier for the document
   * @param documentPath - Path to the document file
   * @param mimeType - MIME type of the document
   * @returns Processing result
   */
  static async processDocument(documentId: string, documentPath: string, mimeType: string) {
    try {
      // Add to AI processing queue
      const queueItem = await desktopAIProcessor.addToQueue(documentId, documentPath, mimeType);

      return {
        success: true,
        queueItem,
        message: 'Document queued for AI processing'
      };
    } catch (error) {
      console.error('Failed to process document:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Get current AI processing queue status
   * @returns Queue status information
   */
  static getQueueStatus() {
    return desktopAIProcessor.getQueueStatus();
  }

  /**
   * Clear the AI processing queue
   * @returns Confirmation of queue clearance
   */
  static clearQueue() {
    desktopAIProcessor.clearQueue();
    return {
      success: true,
      message: 'Processing queue cleared'
    };
  }

  /**
   * Process document synchronously (for immediate results)
   * @param documentPath - Path to the document file
   * @param mimeType - MIME type of the document
   * @returns Processing result
   */
  static async processDocumentSync(documentPath: string, mimeType: string) {
    try {
      const result = await processDesktopDocument(documentPath, mimeType);
      return {
        success: true,
        result,
        message: 'Document processed successfully'
      };
    } catch (error) {
      console.error('Failed to process document synchronously:', error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }
}

// Export for use in Electron main process
export { desktopAIProcessor, processDesktopDocument };

// Example usage in Electron main process:
/*
ipcMain.handle('ai:add-to-queue', async (event, { documentId, documentPath, mimeType }) => {
  return await DesktopIntegrationService.processDocument(documentId, documentPath, mimeType);
});

ipcMain.handle('ai:get-queue', () => {
  return DesktopIntegrationService.getQueueStatus();
});

ipcMain.handle('ai:clear-queue', () => {
  return DesktopIntegrationService.clearQueue();
});
*/