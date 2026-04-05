use async_trait::async_trait;

use super::types::{ColumnInfo, DatabaseType, DbError, ExecuteResult, QueryResult, TableInfo};

/// Trait defining the interface for database connections.
/// Each database type implements this trait with its own specific behavior.
#[async_trait]
pub trait DatabaseConnection: Send + Sync {
    // --- Core operations ---
    async fn execute_sql(&self, sql: &str) -> Result<ExecuteResult, DbError>;
    async fn query_sql(&self, sql: &str) -> Result<QueryResult, DbError>;
    #[allow(dead_code)]
    fn db_type(&self) -> DatabaseType;
    async fn close(&self);

    // --- Metadata ---
    async fn get_tables(&self) -> Result<Vec<TableInfo>, DbError>;
    async fn get_columns(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<ColumnInfo>, DbError>;
    async fn get_schemas(&self) -> Result<Vec<String>, DbError>;
    async fn export_table_sql(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<String, DbError>;
    async fn get_views(&self, schema: Option<&str>) -> Result<Vec<TableInfo>, DbError>;
    async fn get_indexes(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<serde_json::Value>, DbError>;
    async fn get_foreign_keys(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<serde_json::Value>, DbError>;

    // --- Data operations ---
    async fn get_table_row_count(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<u64, DbError>;
    async fn get_table_data(
        &self,
        table: &str,
        schema: Option<&str>,
        page: u32,
        page_size: u32,
        order_by: Option<&str>,
    ) -> Result<QueryResult, DbError>;
    async fn update_table_rows(
        &self,
        table: &str,
        schema: Option<&str>,
        updates: &[(String, serde_json::Value)],
        where_clause: &str,
    ) -> Result<ExecuteResult, DbError>;
    async fn insert_table_row(
        &self,
        table: &str,
        schema: Option<&str>,
        values: &[(String, serde_json::Value)],
    ) -> Result<ExecuteResult, DbError>;
    async fn delete_table_rows(
        &self,
        table: &str,
        schema: Option<&str>,
        where_clause: &str,
    ) -> Result<ExecuteResult, DbError>;
}

/// Serialize a JSON value to a SQL literal string
pub fn json_value_to_sql(val: &serde_json::Value) -> String {
    match val {
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => format!("'{}'", s.replace('\'', "''")),
        _ => format!("'{}'", val.to_string().replace('\'', "''")),
    }
}
