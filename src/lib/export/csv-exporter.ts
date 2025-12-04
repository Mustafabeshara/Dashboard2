/**
 * CSV Export Utility
 * Handles exporting data to CSV format
 */

export interface CSVColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

export interface CSVExportOptions {
  filename: string;
  columns: CSVColumn[];
  data: Record<string, unknown>[];
  includeTimestamp?: boolean;
}

/**
 * Export data to CSV file
 */
export function exportToCSV(options: CSVExportOptions): void {
  const { filename, columns, data, includeTimestamp = true } = options;

  // Build CSV content
  const csvContent: string[] = [];

  // Add headers
  const headers = columns.map(col => escapeCSVValue(col.header));
  csvContent.push(headers.join(','));

  // Add data rows
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.format ? col.format(value) : String(value ?? '');
      return escapeCSVValue(formattedValue);
    });
    csvContent.push(rowData.join(','));
  });

  // Create CSV string
  const csvString = csvContent.join('\n');

  // Create blob and download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  // Generate filename with timestamp if requested
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  const finalFilename = `${filename}${timestamp}.csv`;

  link.href = URL.createObjectURL(blob);
  link.download = finalFilename;
  link.click();

  // Cleanup
  URL.revokeObjectURL(link.href);
}

/**
 * Escape CSV value to handle special characters
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape double quotes by doubling them
    const escapedValue = value.replace(/"/g, '""');
    return `"${escapedValue}"`;
  }
  return value;
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data: Record<string, unknown>[], columns: CSVColumn[]): string {
  const csvContent: string[] = [];

  // Add headers
  const headers = columns.map(col => escapeCSVValue(col.header));
  csvContent.push(headers.join(','));

  // Add data rows
  data.forEach(row => {
    const rowData = columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.format ? col.format(value) : String(value ?? '');
      return escapeCSVValue(formattedValue);
    });
    csvContent.push(rowData.join(','));
  });

  return csvContent.join('\n');
}
