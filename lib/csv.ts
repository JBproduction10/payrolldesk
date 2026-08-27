// lib/csv.ts
// A small, dependency-free CSV parser — handles quoted fields (including
// embedded commas and escaped "" quotes) and both CRLF and LF line endings.
// Good enough for exports from Excel, Google Sheets, or Numbers, without
// pulling in a parsing library for what's fundamentally simple input.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    pushField();
    rows.push(row);
    row = [];
  }

  while (i < len) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      pushField();
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += char;
    i++;
  }

  // Flush a trailing row that wasn't newline-terminated.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop fully blank rows (common trailing-newline artifact).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

/** Escapes a single field for CSV output, quoting it if it contains a comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Serializes rows of values into a CSV string (CRLF line endings). */
export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\r\n");
}

/** Triggers a browser download of `content` as `filename` with the given MIME type. */
export function downloadText(filename: string, content: string, mimeType = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Serializes rows to CSV and triggers a browser download as `filename`. */
export function downloadCsv(filename: string, rows: unknown[][]): void {
  downloadText(filename, rowsToCsv(rows), "text/csv;charset=utf-8");
}

/** First row becomes lower-cased header keys; every row after becomes an object. */
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] ?? "").trim();
    });
    return obj;
  });
}
