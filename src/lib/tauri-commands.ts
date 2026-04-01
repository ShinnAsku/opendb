import { invoke } from "@tauri-apps/api/core";
import type { ConnectionConfig, QueryResult, ExecuteResult, TableInfo, ColumnInfo, ConnectionHealth } from "@/stores/app-store";

// Check if running inside Tauri
const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function connectDatabase(config: ConnectionConfig): Promise<string> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<string>("connect_to_database", { config });
}

export async function disconnectDatabase(id: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<void>("disconnect_database", { id });
}

export async function executeQuery(id: string, sql: string): Promise<QueryResult> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  const raw = await invoke<any>("execute_query", { id, sql });
  // Map camelCase from Rust to our frontend format
  return {
    columns: (raw.columns || []).map((c: any) => ({
      name: c.name,
      dataType: c.dataType,
      nullable: c.nullable,
      isPrimaryKey: c.isPrimaryKey,
    })),
    rows: raw.rows || [],
    rowCount: raw.rowCount ?? 0,
    executionTime: raw.executionTimeMs ?? 0,
  };
}

export async function executeSql(id: string, sql: string): Promise<ExecuteResult> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  const raw = await invoke<any>("execute_sql", { id, sql });
  return {
    success: true,
    message: `${raw.rowsAffected ?? 0} rows affected`,
    affectedRows: raw.rowsAffected ?? 0,
    executionTime: raw.executionTimeMs ?? 0,
  };
}

export async function getTables(id: string): Promise<TableInfo[]> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  const raw = await invoke<any[]>("get_tables", { id });
  return raw.map((t: any) => ({
    name: t.name,
    schema: t.schema,
    type: (t.tableType || "table").toLowerCase() as "table" | "view",
  }));
}

export async function getColumns(id: string, table: string, schema?: string): Promise<ColumnInfo[]> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  const raw = await invoke<any[]>("get_columns", { id, table, schema });
  return raw.map((c: any) => ({
    name: c.name,
    dataType: c.dataType,
    nullable: c.nullable,
    isPrimaryKey: c.isPrimaryKey,
  }));
}

export async function getSchemas(id: string): Promise<string[]> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<string[]>("get_schemas", { id });
}

export async function testConnection(config: ConnectionConfig): Promise<boolean> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<boolean>("test_connection_cmd", { config });
}

export async function exportDatabase(id: string, tables?: string[]): Promise<string> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<string>("export_database", { id, tables: tables ?? null });
}

export async function exportTableSql(id: string, table: string, schema?: string): Promise<string> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  return invoke<string>("export_table_sql", { id, table, schema: schema ?? null });
}

export async function getConnectionStatus(id: string): Promise<ConnectionHealth> {
  if (!isTauri()) {
    throw new Error("This feature is only available in Tauri environment");
  }
  const raw = await invoke<any>("get_connection_status", { id });
  return {
    healthy: raw.healthy ?? true,
    reconnectCount: raw.reconnectCount ?? 0,
    lastHeartbeat: raw.lastHeartbeat ?? "",
  };
}
