/**
 * Tenders List Page
 * Main tender management interface
 */

'use client';

import { ExportButtons } from '@/components/ExportButtons';
import { TenderCard } from '@/components/tenders/tender-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TenderStatus } from '@prisma/client';
import { FileText, Filter, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  description?: string | null;
  status: TenderStatus;
  submissionDeadline?: Date | string | null;
  estimatedValue?: number | null;
  currency?: string;
  department?: string | null;
  customer?: {
    name: string;
  } | null;
  createdAt: Date | string;
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchTenders();
  }, [page, statusFilter]);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
      });

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/tenders?${params}`);
      const result = await response.json();

      if (result.success) {
        setTenders(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching tenders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTenders();
  };

  // Export configuration for tenders
  const exportConfig = {
    filename: 'tenders',
    title: 'Tenders Report',
    columns: [
      { header: 'Tender Number', key: 'tenderNumber', width: 20 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Organization', key: 'organization', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      {
        header: 'Estimated Value',
        key: 'estimatedValue',
        width: 18,
        format: (val: unknown) => (val ? `${(val as number).toLocaleString()} KWD` : 'N/A'),
      },
      { header: 'Submission Deadline', key: 'submissionDeadline', width: 20 },
      { header: 'Created Date', key: 'createdAt', width: 18 },
    ],
  };

  // Prepare export data
  const exportData = tenders.map(t => ({
    tenderNumber: t.tenderNumber,
    title: t.title,
    status: t.status,
    organization: t.customer?.name || 'N/A',
    department: t.department || 'N/A',
    estimatedValue: t.estimatedValue || 0,
    submissionDeadline: t.submissionDeadline
      ? new Date(t.submissionDeadline).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'N/A',
    createdAt: new Date(t.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenders</h1>
          <p className="text-muted-foreground">Manage government tenders and submissions</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            data={exportData}
            config={exportConfig}
            variant="dropdown"
            disabled={loading || tenders.length === 0}
          />
          <Button asChild>
            <Link href="/tenders/create">
              <Plus className="mr-2 h-4 w-4" />
              New Tender
            </Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/tenders/bulk-upload">
              <FileText className="mr-2 h-4 w-4" />
              Bulk Upload
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/documents?type=TENDER_DOCUMENT">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tender number, title, or organization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="WON">Won</SelectItem>
            <SelectItem value="LOST">Lost</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tenders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No tenders found</h3>
          <p className="text-muted-foreground mt-2">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first tender'}
          </p>
          <Button asChild className="mt-4">
            <Link href="/tenders/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Tender
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenders.map(tender => (
              <TenderCard key={tender.id} tender={tender} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
