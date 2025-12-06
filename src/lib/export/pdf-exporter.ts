/**
 * PDF Export Utility
 * Handles exporting data to PDF format using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
}

export interface PDFExportOptions {
  filename: string;
  title: string;
  columns: PDFColumn[];
  data: Record<string, unknown>[];
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'a4' | 'letter' | 'legal';
  includeTimestamp?: boolean;
  subtitle?: string;
}

/**
 * Export data to PDF file
 */
export function exportToPDF(options: PDFExportOptions): void {
  const {
    filename,
    title,
    subtitle,
    columns,
    data,
    orientation = 'portrait',
    pageSize = 'a4',
    includeTimestamp = true,
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  // Add subtitle if provided
  let startY = 30;
  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 28);
    startY = 35;
  }

  // Add timestamp
  if (includeTimestamp) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated: ${new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`,
      14,
      startY
    );
    startY += 10;
  }

  // Prepare table data
  const tableColumns = columns.map(col => ({
    header: col.header,
    dataKey: col.dataKey,
  }));

  const tableData = data.map(row => {
    const rowData: Record<string, unknown> = {};
    columns.forEach(col => {
      rowData[col.dataKey] = row[col.dataKey] ?? '';
    });
    return rowData;
  });

  // Add table
  autoTable(doc, {
    startY,
    head: [tableColumns.map(col => col.header)],
    body: tableData.map(row => tableColumns.map(col => String(row[col.dataKey] ?? ''))),
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { left: 14, right: 14 },
  });

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Generate filename with timestamp
  const timestamp = includeTimestamp ? `_${new Date().toISOString().slice(0, 10)}` : '';
  const finalFilename = `${filename}${timestamp}.pdf`;

  // Save PDF
  doc.save(finalFilename);
}

/**
 * Export multiple tables to PDF
 */
export function exportMultiTablePDF(
  filename: string,
  title: string,
  tables: Array<{
    subtitle: string;
    columns: PDFColumn[];
    data: Record<string, unknown>[];
  }>,
  options?: {
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter' | 'legal';
  }
): void {
  const { orientation = 'portrait', pageSize = 'a4' } = options || {};

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  // Add main title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 20);

  // Add timestamp
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated: ${new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    14,
    30
  );

  let currentY = 45;

  tables.forEach((table, index) => {
    // Add subtitle for each table
    if (index > 0) {
      currentY += 15;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(table.subtitle, 14, currentY);
    currentY += 5;

    // Prepare table data
    const tableColumns = table.columns.map(col => ({
      header: col.header,
      dataKey: col.dataKey,
    }));

    const tableData = table.data.map(row => {
      const rowData: Record<string, unknown> = {};
      table.columns.forEach(col => {
        rowData[col.dataKey] = row[col.dataKey] ?? '';
      });
      return rowData;
    });

    // Add table
    autoTable(doc, {
      startY: currentY,
      head: [tableColumns.map(col => col.header)],
      body: tableData.map(row => tableColumns.map(col => String(row[col.dataKey] ?? ''))),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 14, right: 14 },
    });

    // Update currentY for next table
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  });

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save PDF
  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`${filename}_${timestamp}.pdf`);
}
