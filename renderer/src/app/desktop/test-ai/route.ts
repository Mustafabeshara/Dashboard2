/**
 * Desktop AI Test Route
 * Test endpoint for desktop AI processing
 */

import { NextResponse } from 'next/server';
import { desktopAIProcessor } from '@/lib/desktop-ai-processor';

export async function GET() {
  try {
    // Test adding items to queue
    const testItem1 = await desktopAIProcessor.addToQueue(
      'test-doc-1', 
      '/Users/test/Documents/sample1.pdf', 
      'application/pdf'
    );
    
    const testItem2 = await desktopAIProcessor.addToQueue(
      'test-doc-2', 
      '/Users/test/Documents/sample2.jpg', 
      'image/jpeg'
    );
    
    // Get queue status
    const queueStatus = desktopAIProcessor.getQueueStatus();
    
    return NextResponse.json({
      success: true,
      message: 'Desktop AI processor test completed',
      queueItems: [testItem1, testItem2],
      queueStatus
    });
    
  } catch (error) {
    console.error('Desktop AI test failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, documentPath, mimeType } = body;
    
    if (!documentId || !documentPath || !mimeType) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: documentId, documentPath, mimeType' 
        },
        { status: 400 }
      );
    }
    
    // Add to processing queue
    const queueItem = await desktopAIProcessor.addToQueue(documentId, documentPath, mimeType);
    
    return NextResponse.json({
      success: true,
      message: 'Document added to AI processing queue',
      queueItem
    });
    
  } catch (error) {
    console.error('Failed to add document to queue:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}