import { Upload, Download, FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

type EntityType = "products" | "customers" | "manufacturers" | "inventory";

const entityLabels: Record<EntityType, string> = {
  products: "Products",
  customers: "Customers",
  manufacturers: "Manufacturers",
  inventory: "Inventory",
};

interface ImportResult {
  importId: number;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  errors: { row: number; error: string }[];
}

export function DataImport() {
  const [open, setOpen] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>("products");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const utils = trpc.useUtils();
