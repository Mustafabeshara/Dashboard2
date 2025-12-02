import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Download, AlertCircle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { parseImportFile, validateImportData, downloadImportTemplate } from "@/lib/importUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface BulkImportProps {
  /** Button label */
  label?: string;
  /** Template filename */
  templateFilename: string;
  /** Template fields with examples */
  templateFields: { name: string; example: string }[];
  /** Required field names */
  requiredFields: string[];
  /** Optional field names */
  optionalFields?: string[];
  /** Callback when data is successfully imported */
  onImport: (data: Record<string, any>[]) => Promise<void>;
  /** Custom trigger button (optional) */
  trigger?: React.ReactNode;
}

export function BulkImport({
  label = "Bulk Import",
  templateFilename,
  templateFields,
  requiredFields,
  optionalFields = [],
  onImport,
  trigger,
}: BulkImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setParsedData(null);
    setSuccess(false);

    try {
      // Parse file
      const data = await parseImportFile(selectedFile);
      
      // Validate data
      const validation = validateImportData(data, requiredFields, optionalFields);
      
      if (!validation.valid) {
        setErrors(validation.errors);
        return;
      }

      setParsedData(data);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Failed to parse file"]);
    }
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await onImport(parsedData);

      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);

      // Close dialog after success
      setTimeout(() => {
        setOpen(false);
        resetState();
      }, 1500);
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Failed to import data"]);
    } finally {
      setImporting(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
    setProgress(0);
    setSuccess(false);
  };

  const handleDownloadTemplate = () => {
    downloadImportTemplate(templateFilename, templateFields);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import multiple records at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Download Template</p>
                <p className="text-xs text-muted-foreground">
                  Get a template with the correct column format
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Upload File</label>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 disabled:opacity-50"
            />
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Validation Errors:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {errors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {errors.length > 5 && (
                    <li className="text-muted-foreground">
                      ... and {errors.length - 5} more errors
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Preview */}
          {parsedData && errors.length === 0 && !success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-600">File validated successfully!</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Ready to import {parsedData.length} record{parsedData.length !== 1 ? "s" : ""}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importing...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-600 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600 font-medium">
                Import completed successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={importing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsedData || errors.length > 0 || importing || success}
          >
            {importing ? "Importing..." : `Import ${parsedData?.length || 0} Records`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
