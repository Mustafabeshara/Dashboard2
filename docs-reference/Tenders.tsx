import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TenderCardSkeleton } from "@/components/LoadingSkeletons";
import { Plus, Search, Calendar, Building2, FileText, TrendingUp, Award, Upload, FileArchive, Download, Edit, BookTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import TenderForm from "@/components/TenderForm";
import { DeleteButton } from "@/components/DeleteButton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { exportToCSV, formatDateForExport, formatCurrencyForExport } from "@/lib/exportUtils";
import { DateRangeFilter, DateRange } from "@/components/filters/DateRangeFilter";
import { MultiSelectFilter } from "@/components/filters/MultiSelectFilter";

export default function Tenders() {
  const [, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTenderId, setEditingTenderId] = useState<number | null>(null);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [savingTenderId, setSavingTenderId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const { data: tenders, isLoading: tendersLoading, refetch } = trpc.tenders.list.useQuery({
    organizationSearch: searchQuery || undefined,
    showArchived,
  });

  const archiveMutation = trpc.tenders.archive.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const unarchiveMutation = trpc.tenders.unarchive.useMutation({
    onSuccess: () => {
      refetch();
    },