import * as XLSX from "exceljs";

/**
 * Parse CSV or Excel file and return rows as array of objects
 */
export async function parseImportFile(file: File): Promise<Record<string, any>[]> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return parseCSV(file);
  } else if (extension === "xlsx" || extension === "xls") {
    return parseExcel(file);
  } else {
    throw new Error("Unsupported file format. Please upload CSV or Excel (.xlsx, .xls) files.");
  }
}

/**
 * Parse CSV file
 */
async function parseCSV(file: File): Promise<Record<string, any>[]> {
  const text = await file.text();
  const lines = text.split("\n").filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error("CSV file must have at least a header row and one data row");
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || values.every(v => !v)) continue; // Skip empty rows
    
    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Parse Excel file
 */
async function parseExcel(file: File): Promise<Record<string, any>[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new XLSX.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  // Get first worksheet
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Excel file has no worksheets");
  }

  const rows: Record<string, any>[] = [];
  let headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = row.values as any[];
    
    // First row is header
    if (rowNumber === 1) {
      headers = values.slice(1).map(v => String(v || "").trim());
      return;
    }

    // Skip empty rows
    const rowData = values.slice(1);
    if (rowData.every(v => !v)) return;

    // Create row object
    const rowObj: Record<string, any> = {};
    headers.forEach((header, index) => {
      rowObj[header] = rowData[index] !== undefined ? String(rowData[index]) : "";
    });
    rows.push(rowObj);
  });

  return rows;
}

/**
 * Validate imported data against expected fields
 */
export function validateImportData(
  data: Record<string, any>[],
  requiredFields: string[],
  optionalFields: string[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.length === 0) {
    errors.push("No data rows found in file");
    return { valid: false, errors };
  }

  // Check if all required fields are present
  const firstRow = data[0];
  const availableFields = Object.keys(firstRow);
  
  const missingFields = requiredFields.filter(field => !availableFields.includes(field));
  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(", ")}`);
  }

  // Validate each row has required fields with values
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!row[field] || String(row[field]).trim() === "") {
        errors.push(`Row ${index + 2}: Missing value for required field "${field}"`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Download import template as CSV
 */
export function downloadImportTemplate(
  filename: string,
  fields: { name: string; example: string }[]
) {
  const headers = fields.map(f => f.name).join(",");
  const examples = fields.map(f => `"${f.example}"`).join(",");
  const csv = `${headers}\n${examples}`;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
