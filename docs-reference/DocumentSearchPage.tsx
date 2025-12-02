import DashboardLayout from "@/components/DashboardLayout";
import { DocumentSearch } from "@/components/DocumentSearch";

export default function DocumentSearchPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Document Search</h1>
          <p className="text-muted-foreground">
            Search and filter documents across all tenders and manufacturers
          </p>
        </div>
        <DocumentSearch />
      </div>
    </DashboardLayout>
  );
}
