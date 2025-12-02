import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScanLine, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BarcodeScannerProps {
  /** Callback when barcode/QR code is scanned */
  onScan: (code: string) => void;
  /** Button label */
  label?: string;
  /** Custom trigger button */
  trigger?: React.ReactNode;
}

/**
 * Barcode/QR Code Scanner Component
 * Uses device camera to scan barcodes and QR codes
 */
export function BarcodeScanner({
  onScan,
  label = "Scan Barcode",
  trigger,
}: BarcodeScannerProps) {
  const [open, setOpen] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerInitialized = useRef(false);

  useEffect(() => {
    if (open && !scannerInitialized.current) {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [
            Html5QrcodeScanType.SCAN_TYPE_CAMERA,
          ],
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success callback
          setScannedCode(decodedText);
          setError(null);
          onScan(decodedText);
          
          // Auto-close after successful scan
          setTimeout(() => {
            scanner.clear();
            scannerInitialized.current = false;
            setOpen(false);
          }, 1500);
        },
        (errorMessage) => {
          // Error callback (can be ignored for scanning errors)
          // Only show critical errors
          if (errorMessage.includes("NotAllowedError")) {
            setError("Camera permission denied. Please allow camera access.");
          }
        }
      );

      scannerRef.current = scanner;
      scannerInitialized.current = true;
    }

    return () => {
      if (scannerRef.current && scannerInitialized.current) {
        scannerRef.current.clear().catch(console.error);
        scannerInitialized.current = false;
      }
    };
  }, [open, onScan]);

  const handleClose = () => {
    if (scannerRef.current && scannerInitialized.current) {
      scannerRef.current.clear().catch(console.error);
      scannerInitialized.current = false;
    }
    setOpen(false);
    setScannedCode(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ScanLine className="h-4 w-4 mr-2" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Barcode or QR Code</DialogTitle>
          <DialogDescription>
            Position the barcode or QR code within the camera frame
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner container */}
          <div id="qr-reader" className="w-full" />

          {/* Error message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success message */}
          {scannedCode && (
            <Alert className="border-green-600 bg-green-50">
              <AlertDescription className="text-green-600 font-medium">
                ✓ Scanned: {scannedCode}
              </AlertDescription>
            </Alert>
          )}

          {/* Manual close button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleClose}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generate QR code as data URL
 */
export async function generateQRCode(text: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });
}

/**
 * QR Code Display Component
 */
interface QRCodeDisplayProps {
  text: string;
  size?: number;
}

export function QRCodeDisplay({ text, size = 200 }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    generateQRCode(text).then(setQrCodeUrl);
  }, [text]);

  if (!qrCodeUrl) {
    return <div className="animate-pulse bg-muted rounded" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={qrCodeUrl}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded border"
    />
  );
}
