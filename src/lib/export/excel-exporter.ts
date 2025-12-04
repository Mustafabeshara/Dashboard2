/**
 * Excel Export Utility
 * Handles exporting data to Excel format using xlsx library
 */

import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  includeTimestamp?: boolean;
}

/**
 * Export data to Excel file
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, sheetName = 'Sheet1', columns, data, includeTimestamp = true } = options;

  // Prepare worksheet data
  const worksheetData: (string | number)[][] = [];

  // Add headers
  const headers = columns.map(col => col.header);
  worksheetData.push(headers);

  // Add data rows
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : value;
      return String(formatted ?? '');
    });
    worksheetData.push(rowData);
  });

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = columns.map(col => ({
    wch: col.width || 15,
  }));
  worksheet['!cols'] = columnWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate filename with timestamp if requested
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  const finalFilename = `${filename}${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Export multiple sheets to Excel file
 */
export function exportToExcelMultiSheet(
  filename: string,
  sheets: Array<{
    sheetName: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
  }>
): void {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, columns, data }) => {
    // Prepare worksheet data
    const worksheetData: (string | number)[][] = [];

    // Add headers
    const headers = columns.map(col => col.header);
    worksheetData.push(headers);

    // Add data rows
    data.forEach(row => {
      const rowData = columns.map(col => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        return String(formatted ?? '');
      });
      worksheetData.push(rowData);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    const columnWidths = columns.map(col => ({
      wch: col.width || 15,
    }));
    worksheet['!cols'] = columnWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Format currency value for export
 */
export function formatCurrency(value: number | null | undefined, currency = 'KWD'): string {
  if (value === null || value === undefined) return '';
  return `${currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for export
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format datetime for export
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format boolean for export
 */
export function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}

/**
 * Format percentage for export
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return `${value.toFixed(2)}%`;
}
