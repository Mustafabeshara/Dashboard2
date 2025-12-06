'use client';

/**
 * Export Buttons Component
 * Provides UI buttons for exporting data to various formats
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, type CSVColumn } from '@/lib/export/csv-exporter';
import { exportToExcel, type ExportColumn } from '@/lib/export/excel-exporter';
import { exportToPDF } from '@/lib/export/pdf-exporter';
import { Download, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface ExportConfig {
  filename: string;
  title?: string;
  columns: Array<{
    header: string;
    key: string;
    width?: number;
    format?: (value: unknown) => string | number;
  }>;
}

interface ExportButtonsProps {
  data: Record<string, unknown>[];
  config: ExportConfig;
  variant?: 'dropdown' | 'buttons';
  disabled?: boolean;
}

export function ExportButtons({
  data,
  config,
  variant = 'dropdown',
  disabled = false,
}: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    if (data.length === 0) {
      toast.error('No data to export. Please add some data before exporting.');
      return;
    }

    setLoading(format);

    try {
      switch (format) {
        case 'excel':
          exportToExcel({
            filename: config.filename,
            sheetName: config.title || 'Data',
            columns: config.columns as ExportColumn[],
            data,
            includeTimestamp: true,
          });
          break;

        case 'csv':
          exportToCSV({
            filename: config.filename,
            columns: config.columns as CSVColumn[],
            data,
            includeTimestamp: true,
          });
          break;

        case 'pdf':
          exportToPDF({
            filename: config.filename,
            title: config.title || config.filename,
            columns: config.columns.map(col => ({
              header: col.header,
              dataKey: col.key,
              width: col.width,
            })),
            data,
            orientation: 'landscape',
            includeTimestamp: true,
          });
          break;
      }

      toast.success(`${data.length} records exported to ${format.toUpperCase()}.`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('An error occurred while exporting data.');
    } finally {
      setLoading(null);
    }
  };

  if (variant === 'buttons') {
    return (
      <div className="flex gap-2">
        <Button
          onClick={() => handleExport('excel')}
          disabled={disabled || loading !== null}
          size="sm"
          variant="outline"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          {loading === 'excel' ? 'Exporting...' : 'Excel'}
        </Button>
        <Button
          onClick={() => handleExport('csv')}
          disabled={disabled || loading !== null}
          size="sm"
          variant="outline"
        >
          <FileText className="mr-2 h-4 w-4" />
          {loading === 'csv' ? 'Exporting...' : 'CSV'}
        </Button>
        <Button
          onClick={() => handleExport('pdf')}
          disabled={disabled || loading !== null}
          size="sm"
          variant="outline"
        >
          <FileType className="mr-2 h-4 w-4" />
          {loading === 'pdf' ? 'Exporting...' : 'PDF'}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={disabled || loading !== null} size="sm" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          {loading ? 'Exporting...' : 'Export'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('excel')} disabled={loading !== null}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export to Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('csv')} disabled={loading !== null}>
          <FileText className="mr-2 h-4 w-4" />
          Export to CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')} disabled={loading !== null}>
          <FileType className="mr-2 h-4 w-4" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
