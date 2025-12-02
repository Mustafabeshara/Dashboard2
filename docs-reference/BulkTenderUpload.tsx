import { Upload, FileArchive, CheckCircle2, XCircle, Loader2, AlertCircle, FileText, Calendar, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ExtractedTender {
  fileName: string;
  documentId: number;
  success: boolean;
  data?: {
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
  };
  error?: string;
}

interface BulkTenderUploadProps {
  onComplete: (results: ExtractedTender[]) => void;
}

export default function BulkTenderUpload({ onComplete }: BulkTenderUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ExtractedTender[] | null>(null);

  const bulkExtractMutation = trpc.documents.bulkExtractTenders.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        toast.error("Please select a ZIP file");
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
        toast.error("File too large. Maximum size is 100MB");
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(10);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:application/zip;base64, prefix

        setProgress(30);

        try {
          const result = await bulkExtractMutation.mutateAsync({
            zipFileName: file.name,
            zipFileData: base64Data,
          });

          setProgress(100);
          setResults(result.results as ExtractedTender[]);
          
          toast.success(
            `Processed ${result.totalFiles} files: ${result.successful} successful, ${result.failed} failed`
          );

          // Call onComplete with results
          onComplete(result.results as ExtractedTender[]);
        } catch (error: any) {
          toast.error(error.message || "Failed to process ZIP file");
          setUploading(false);
          setProgress(0);
        }
      };

      reader.onerror = () => {
        toast.error("Failed to read file");
        setUploading(false);
        setProgress(0);
      };