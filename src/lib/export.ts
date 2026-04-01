import Papa from "papaparse";
import type { ColumnInfo } from "@/stores/app-store";

/**
 * Export query results to CSV format
 */
export function exportToCSV(columns: ColumnInfo[], rows: any[]): string {
  const headers = columns.map((c) => c.name);
  const data = rows.map((row) =>
    columns.map((col) => {
      const val = row[col.name];
      if (val === null || val === undefined) return "";
      return String(val);
    })
  );
  return Papa.unparse({
    fields: headers,
    data,
  });
}

/**
 * Export query results to JSON format
 */
export function exportToJSON(columns: ColumnInfo[], rows: any[]): string {
  return JSON.stringify(
    rows.map((row) => {
      const obj: Record<string, any> = {};
      for (const col of columns) {
        obj[col.name] = row[col.name] ?? null;
      }
      return obj;
    }),
    null,
    2
  );
}

/**
 * Export query results to SQL INSERT statements
 */
export function exportToSQL(
  columns: ColumnInfo[],
  rows: any[],
  tableName: string
): string {
  if (rows.length === 0) return "";

  const colNames = columns.map((c) => c.name).join(", ");
  const statements: string[] = [];

  for (const row of rows) {
    const values = columns.map((col) => {
      const val = row[col.name];
      if (val === null || val === undefined) return "NULL";
      if (typeof val === "number") return String(val);
      if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
      // Escape single quotes
      return `'${String(val).replace(/'/g, "''")}'`;
    });
    statements.push(`INSERT INTO ${tableName} (${colNames}) VALUES (${values.join(", ")});`);
  }

  return statements.join("\n");
}

/**
 * Trigger file download using browser fallback or Tauri dialog
 */
export async function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): Promise<void> {
  // Try Tauri dialog first
  const isTauri =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  if (isTauri) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeTextFile } = await import("@tauri-apps/plugin-fs");
      const filePath = await save({
        defaultPath: filename,
        filters: [{ name: filename.split(".").pop() || "File", extensions: [filename.split(".").pop() || "*"] }],
      });
      if (filePath) {
        await writeTextFile(filePath, content);
        return;
      }
    } catch {
      // Fall through to browser download
    }
  }

  // Browser fallback
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from a CSV file
 */
export function importFromCSV(file: File): Promise<{ columns: string[]; rows: any[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields || [];
        const rows = results.data as any[];
        resolve({ columns, rows });
      },
      error: (err: Error) => {
        reject(err);
      },
    });
  });
}

/**
 * Import data from a JSON file
 */
export async function importFromJSON(file: File): Promise<{ columns: string[]; rows: any[] }> {
  const text = await file.text();
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) {
    return { columns: [], rows: [] };
  }
  const columns = Object.keys(arr[0]);
  return { columns, rows: arr };
}
