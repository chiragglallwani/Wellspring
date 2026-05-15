/** Minimal RFC4180-style CSV parse (handles quoted fields). */
export function parseCsv(text: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = splitCsvRecords(text.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function serializeCsv(
  headers: string[],
  rows: Record<string, string>[],
): string {
  const escape = (value: string) => {
    if (/[",\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

function splitCsvRecords(text: string): string[] {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === "\n" || (char === "\r" && next === "\n")) && !inQuotes) {
      if (char === "\r") i++;
      records.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length > 0) records.push(current);
  return records.filter((r) => r.length > 0);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

export const BULK_CSV_REQUIRED_HEADERS = [
  "client_key",
  "type",
  "title",
  "duration",
  "instructor_name",
] as const;

export function validateBulkCsvHeaders(headers: string[]): string | null {
  const normalized = new Set(headers.map(normalizeHeader));
  const missing = BULK_CSV_REQUIRED_HEADERS.filter((h) => !normalized.has(h));
  if (missing.length > 0) {
    return `CSV is missing required columns: ${missing.join(", ")}`;
  }
  return null;
}
