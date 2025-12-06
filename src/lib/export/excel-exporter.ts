/**
 * Excel Export Utility
 * Handles exporting data to Excel format using exceljs library (secure alternative to xlsx)
 */

import ExcelJS from 'exceljs';

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
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { filename, sheetName = 'Sheet1', columns, data, includeTimestamp = true } = options;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Define columns with headers and widths
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Style the header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach(row => {
    const rowData: Record<string, string | number> = {};
    columns.forEach(col => {
      const value = row[col.key];
      const formatted = col.format ? col.format(value) : value;
      rowData[col.key] = formatted as string | number;
    });
    worksheet.addRow(rowData);
  });

  // Generate filename with timestamp if requested
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  const finalFilename = `${filename}${timestamp}.xlsx`;

  // Write file (browser or Node.js)
  if (typeof window !== 'undefined') {
    // Browser environment
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  } else {
    // Node.js environment
    await workbook.xlsx.writeFile(finalFilename);
  }
}

/**
 * Export multiple sheets to Excel file
 */
export async function exportToExcelMultiSheet(
  filename: string,
  sheets: Array<{
    sheetName: string;
    columns: ExportColumn[];
    data: Record<string, unknown>[];
  }>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ sheetName, columns, data }) => {
    const worksheet = workbook.addWorksheet(sheetName);

    // Define columns with headers and widths
    worksheet.columns = columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach(row => {
      const rowData: Record<string, string | number> = {};
      columns.forEach(col => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value) : value;
        rowData[col.key] = formatted as string | number;
      });
      worksheet.addRow(rowData);
    });
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().slice(0, 10);
  const finalFilename = `${filename}_${timestamp}.xlsx`;

  // Write file (browser or Node.js)
  if (typeof window !== 'undefined') {
    // Browser environment
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    link.click();
    window.URL.revokeObjectURL(url);
  } else {
    // Node.js environment
    await workbook.xlsx.writeFile(finalFilename);
  }
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
