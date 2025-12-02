import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, Download, Calendar, Folder, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DocumentSearch() {
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState<string>("");
  const [folderName, setFolderName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: results = [], isLoading } = trpc.documentFolders.searchDocuments.useQuery(
    {
      query: query || undefined,
      entityType: entityType || undefined,
      folderName: folderName || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: 50,
    },
    {
      enabled: !!(query || entityType || folderName || dateFrom || dateTo),
    }
  );

  const clearFilters = () => {
    setQuery("");
    setEntityType("");
    setFolderName("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = query || entityType || folderName || dateFrom || dateTo;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Document Search
          </CardTitle>
          <CardDescription>
            Search across all documents and folders with advanced filters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div>
            <Label>Search Query</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by file name or notes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Entity Type Filter */}
            <div>
              <Label>Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All types</SelectItem>
                  <SelectItem value="tender">Tenders</SelectItem>
                  <SelectItem value="manufacturer">Manufacturers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Folder Name Filter */}
            <div>
              <Label>Folder Name</Label>
              <div className="relative">
                <Folder className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by folder..."
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <Label>Date From</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <Label>Date To</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Search Results</span>
            {results.length > 0 && (
              <Badge variant="secondary">{results.length} document(s)</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasFilters ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Enter search criteria to find documents</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No documents found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{doc.fileName}</p>
                        <Badge variant="outline" className="text-xs">
                          {doc.entityType}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {doc.folderName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                        {doc.fileSize && (
                          <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                        )}
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {doc.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    className="shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
