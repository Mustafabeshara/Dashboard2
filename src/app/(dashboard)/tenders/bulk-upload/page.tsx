/**
 * Bulk Tender Upload Page
 * Upload multiple tender documents at once for AI extraction
 */

'use client';

import { BulkTenderUpload } from '@/components/tenders/bulk-tender-upload';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileArchive, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ExtractedTenderData {
  reference: string;
  title: string;
  organization: string;
  closingDate: string;
  items: Array<{
    itemDescription: string;
    quantity: number;
    unit: string;
  }>;
  notes: string;
}

export default function BulkUploadPage() {
  const router = useRouter();
  const [createdCount, setCreatedCount] = useState(0);

  const handleComplete = (results: any[]) => {
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`Successfully extracted ${successCount} tenders`);
    }
    if (failCount > 0) {
      toast.warning(`${failCount} files failed to process`);
    }
  };

  const handleCreateTender = async (data: ExtractedTenderData) => {
    try {
      // Ensure tender number is unique by adding timestamp if needed
      const tenderNumber = data.reference || `TENDER-${Date.now()}`;

      const response = await fetch('/api/tenders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenderNumber,
          title: data.title || 'Untitled Tender',
          description: `Organization: ${data.organization || 'N/A'}\n\n${data.notes || ''}`,
          submissionDeadline: data.closingDate ? new Date(data.closingDate).toISOString() : null,
          products:
            data.items?.map((item, index) => ({
              id: `item-${index}`,
              name: item.itemDescription || 'Item',
              quantity: item.quantity || 1,
              unit: item.unit || 'unit',
            })) || [],
          notes: data.notes || '',
          status: 'DRAFT',
          currency: 'KWD',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tender');
      }

      const result = await response.json();
      setCreatedCount(prev => prev + 1);
      toast.success(`Tender ${data.reference} created successfully`);

      // Optionally navigate to the new tender
      // router.push(`/tenders/${result.data.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create tender');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/tenders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileArchive className="h-8 w-8 text-primary" />
              Bulk Tender Upload
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI-powered extraction from multiple documents
            </p>
          </div>
        </div>
        {createdCount > 0 && (
          <Button asChild>
            <Link href="/tenders">View Tenders ({createdCount} created)</Link>
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Create a ZIP file containing your tender documents (PDF, PNG, or JPG)</li>
          <li>Upload the ZIP file using the form below</li>
          <li>Our AI will extract tender details from each document</li>
          <li>Review the extracted data and create tenders with one click</li>
        </ol>
      </div>

      {/* Bulk Upload Component */}
      <BulkTenderUpload onComplete={handleComplete} onCreateTender={handleCreateTender} />
    </div>
  );
}
