use std::sync::Arc;
use tauri::State;

use super::manager::ConnectionManager;
use super::types::{
    ColumnInfo, ConnectionConfig, ConnectionStatus, ExecuteResult, QueryResult, TableInfo,
};

/// Connect to a database
#[tauri::command]
pub async fn connect_to_database(
    state: State<'_, Arc<ConnectionManager>>,
    config: ConnectionConfig,
) -> Result<String, String> {
    state
        .connect(config)
        .await
        .map_err(|e| e.to_string())
}

/// Disconnect from a database
#[tauri::command]
pub async fn disconnect_database(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
) -> Result<(), String> {
    state
        .disconnect(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Execute a SQL query (SELECT) and return results
#[tauri::command]
pub async fn execute_query(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
    sql: String,
) -> Result<QueryResult, String> {
    state
        .query(&id, &sql)
        .await
        .map_err(|e| e.to_string())
}

/// Execute a SQL statement (INSERT, UPDATE, DELETE, DDL)
#[tauri::command]
pub async fn execute_sql(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
    sql: String,
) -> Result<ExecuteResult, String> {
    state
        .execute(&id, &sql)
        .await
        .map_err(|e| e.to_string())
}

/// Get all tables for a database connection
#[tauri::command]
pub async fn get_tables(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
) -> Result<Vec<TableInfo>, String> {
    state
        .get_tables(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Get columns for a specific table
#[tauri::command]
pub async fn get_columns(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
    table: String,
    schema: Option<String>,
) -> Result<Vec<ColumnInfo>, String> {
    state
        .get_columns(&id, &table, schema.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get all schemas for a database connection
#[tauri::command]
pub async fn get_schemas(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
) -> Result<Vec<String>, String> {
    state
        .get_schemas(&id)
        .await
        .map_err(|e| e.to_string())
}

/// Test a database connection
#[tauri::command]
pub async fn test_connection_cmd(
    state: State<'_, Arc<ConnectionManager>>,
    config: ConnectionConfig,
) -> Result<bool, String> {
    state
        .test_connection(config)
        .await
        .map_err(|e| e.to_string())
}

/// Export a single table as SQL
#[tauri::command]
pub async fn export_table_sql(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
    table: String,
    schema: Option<String>,
) -> Result<String, String> {
    state
        .export_table_sql(&id, &table, schema.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Export entire database as SQL script
#[tauri::command]
pub async fn export_database(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
    tables: Option<Vec<String>>,
) -> Result<String, String> {
    state
        .export_database(&id, tables.as_deref())
        .await
        .map_err(|e| e.to_string())
}

/// Get connection health status
#[tauri::command]
pub async fn get_connection_status(
    state: State<'_, Arc<ConnectionManager>>,
    id: String,
) -> Result<ConnectionStatus, String> {
    state
        .get_connection_status(&id)
        .await
        .map_err(|e| e.to_string())
}
