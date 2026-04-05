use async_trait::async_trait;
use futures::StreamExt;
use std::sync::Arc;
use std::time::Instant;
use tokio_util::compat::TokioAsyncWriteCompatExt;

use super::trait_def::{json_value_to_sql, DatabaseConnection};
use super::types::{
    ColumnInfo, ConnectionConfig, DatabaseType, DbError, ExecuteResult, QueryResult, TableInfo,
};

// ============================================================================
// MSSQL Connection (using tiberius - native TDS client)
// ============================================================================

pub struct MSSQLConnection {
    client: Arc<
        tokio::sync::Mutex<
            tiberius::Client<tokio_util::compat::Compat<tokio::net::TcpStream>>,
        >,
    >,
}

impl MSSQLConnection {
    pub async fn new(config: &ConnectionConfig) -> Result<Self, DbError> {
        let host = config.host.as_deref().unwrap_or("localhost");
        let port = config.port.unwrap_or(1433);
        let username = config.username.as_deref().unwrap_or("sa");
        let password = config.password.as_deref().unwrap_or("");

        log::info!("Connecting to MSSQL at {}:{}", host, port);

        let mut config_builder = tiberius::Config::new();
        config_builder.host(host);
        config_builder.port(port);
        config_builder.authentication(tiberius::AuthMethod::sql_server(username, password));
        if let Some(database) = &config.database {
            if !database.is_empty() {
                config_builder.database(database);
            }
        }
        config_builder.trust_cert();

        let tcp = tokio::net::TcpStream::connect(config_builder.get_addr())
            .await
            .map_err(|e| {
                DbError::ConnectionError(format!("Failed to connect to MSSQL TCP: {}", e))
            })?;

        tcp.set_nodelay(true)
            .map_err(|e| DbError::ConnectionError(format!("Failed to set TCP nodelay: {}", e)))?;

        let client = tiberius::Client::connect(config_builder, tcp.compat_write())
            .await
            .map_err(|e| {
                DbError::ConnectionError(format!("Failed to connect to MSSQL: {}", e))
            })?;

        log::info!("Successfully connected to MSSQL");

        Ok(Self {
            client: Arc::new(tokio::sync::Mutex::new(client)),
        })
    }

    /// Convert a ColumnData value to a serde_json::Value
    fn column_data_to_json(data: &tiberius::ColumnData) -> serde_json::Value {
        match data {
            tiberius::ColumnData::U8(Some(v)) => {
                serde_json::Value::Number(serde_json::Number::from(*v))
            }
            tiberius::ColumnData::I16(Some(v)) => {
                serde_json::Value::Number(serde_json::Number::from(*v))
            }
            tiberius::ColumnData::I32(Some(v)) => {
                serde_json::Value::Number(serde_json::Number::from(*v))
            }
            tiberius::ColumnData::I64(Some(v)) => {
                serde_json::Value::Number(serde_json::Number::from(*v))
            }
            tiberius::ColumnData::F32(Some(v)) => serde_json::Number::from_f64(*v as f64)
                .map(serde_json::Value::Number)
                .unwrap_or_else(|| serde_json::Value::String(v.to_string())),
            tiberius::ColumnData::F64(Some(v)) => serde_json::Number::from_f64(*v)
                .map(serde_json::Value::Number)
                .unwrap_or_else(|| serde_json::Value::String(v.to_string())),
            tiberius::ColumnData::Bit(Some(v)) => serde_json::Value::Bool(*v),
            tiberius::ColumnData::String(Some(s)) => serde_json::Value::String(s.to_string()),
            tiberius::ColumnData::Guid(Some(u)) => serde_json::Value::String(u.to_string()),
            tiberius::ColumnData::Numeric(Some(n)) => serde_json::Value::String(n.to_string()),
            tiberius::ColumnData::Xml(Some(x)) => serde_json::Value::String(x.to_string()),
            tiberius::ColumnData::DateTime(Some(dt)) => {
                serde_json::Value::String(format!("{:?}", dt))
            }
            tiberius::ColumnData::SmallDateTime(Some(dt)) => {
                serde_json::Value::String(format!("{:?}", dt))
            }
            tiberius::ColumnData::Time(Some(t)) => {
                serde_json::Value::String(format!("{:?}", t))
            }
            tiberius::ColumnData::Date(Some(d)) => {
                serde_json::Value::String(format!("{:?}", d))
            }
            tiberius::ColumnData::DateTime2(Some(dt)) => {
                serde_json::Value::String(format!("{:?}", dt))
            }
            tiberius::ColumnData::DateTimeOffset(Some(dto)) => {
                serde_json::Value::String(format!("{:?}", dto))
            }
            tiberius::ColumnData::Binary(Some(b)) => serde_json::Value::String(
                b.iter().map(|byte| format!("{:02X}", byte)).collect(),
            ),
            // Null values for all types
            tiberius::ColumnData::U8(None)
            | tiberius::ColumnData::I16(None)
            | tiberius::ColumnData::I32(None)
            | tiberius::ColumnData::I64(None)
            | tiberius::ColumnData::F32(None)
            | tiberius::ColumnData::F64(None)
            | tiberius::ColumnData::Bit(None)
            | tiberius::ColumnData::String(None)
            | tiberius::ColumnData::Guid(None)
            | tiberius::ColumnData::Binary(None)
            | tiberius::ColumnData::Numeric(None)
            | tiberius::ColumnData::Xml(None)
            | tiberius::ColumnData::DateTime(None)
            | tiberius::ColumnData::SmallDateTime(None)
            | tiberius::ColumnData::Time(None)
            | tiberius::ColumnData::Date(None)
            | tiberius::ColumnData::DateTime2(None)
            | tiberius::ColumnData::DateTimeOffset(None) => serde_json::Value::Null,
        }
    }
}

/// Build full table reference for MSSQL with bracket quoting
fn mssql_full_table(table: &str, schema: Option<&str>) -> String {
    let schema_name = schema.unwrap_or("dbo");
    format!("[{}].[{}]", schema_name, table)
}

#[async_trait]
impl DatabaseConnection for MSSQLConnection {
    async fn execute_sql(&self, sql: &str) -> Result<ExecuteResult, DbError> {
        let start = Instant::now();
        let mut client = self.client.lock().await;
        let result = client
            .execute(sql, &[])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;
        let elapsed = start.elapsed().as_millis() as u64;

        Ok(ExecuteResult {
            rows_affected: result.total(),
            execution_time_ms: elapsed,
        })
    }

    async fn query_sql(&self, sql: &str) -> Result<QueryResult, DbError> {
        let start = Instant::now();
        let mut client = self.client.lock().await;

        let stream = client
            .query(sql, &[])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        let mut rows: Vec<tiberius::Row> = vec![];
        let mut column_info: Option<Vec<ColumnInfo>> = None;

        let mut stream = stream.into_row_stream();
        while let Some(item) = stream.next().await {
            let row = item.map_err(|e| DbError::QueryError(e.to_string()))?;
            if column_info.is_none() {
                let cols: Vec<ColumnInfo> = row
                    .columns()
                    .iter()
                    .map(|col: &tiberius::Column| ColumnInfo {
                        name: col.name().to_string(),
                        data_type: format!("{:?}", col.column_type()),
                        nullable: true,
                        is_primary_key: false,
                        default_value: None,
                        comment: None,
                        character_maximum_length: None,
                        numeric_precision: None,
                        numeric_scale: None,
                    })
                    .collect();
                column_info = Some(cols);
            }
            rows.push(row);
        }

        let elapsed = start.elapsed().as_millis() as u64;

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                row_count: 0,
                execution_time_ms: elapsed,
            });
        }

        let columns = column_info.unwrap_or_default();

        let mut result_rows = Vec::new();
        for row in &rows {
            let mut map = serde_json::Map::new();
            for (col, data) in row.cells() {
                let val = Self::column_data_to_json(data);
                map.insert(col.name().to_string(), val);
            }
            result_rows.push(map);
        }

        let row_count = result_rows.len() as u64;

        Ok(QueryResult {
            columns,
            rows: result_rows,
            row_count,
            execution_time_ms: elapsed,
        })
    }

    async fn get_tables(&self) -> Result<Vec<TableInfo>, DbError> {
        let sql = r#"
            SELECT
                TABLE_NAME,
                TABLE_SCHEMA,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        "#;

        let mut client = self.client.lock().await;
        let stream = client
            .query(sql, &[])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        let mut tables = Vec::new();
        let mut stream = stream.into_row_stream();
        while let Some(item) = stream.next().await {
            let row = item.map_err(|e| DbError::QueryError(e.to_string()))?;
            let table_type: &str = row.get(2).unwrap_or("TABLE");
            let table_type = if table_type == "BASE TABLE" {
                "TABLE"
            } else {
                table_type
            };
            tables.push(TableInfo {
                name: row.get::<&str, _>(0).unwrap_or_default().to_string(),
                schema: row.get::<&str, _>(1).map(|s| s.to_string()),
                row_count: None,
                comment: None,
                table_type: table_type.to_string(),
                oid: None,
                owner: None,
                acl: None,
                primary_key: None,
                partition_of: None,
                has_indexes: None,
                has_triggers: None,
                engine: None,
                data_length: None,
                create_time: None,
                update_time: None,
                collation: None,
            });
        }

        Ok(tables)
    }

    async fn get_columns(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<ColumnInfo>, DbError> {
        let schema_name = schema.unwrap_or("dbo");

        let sql = r#"
            SELECT
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.IS_NULLABLE,
                c.COLUMN_DEFAULT,
                c.CHARACTER_MAXIMUM_LENGTH,
                c.NUMERIC_PRECISION,
                c.NUMERIC_SCALE,
                CASE
                    WHEN pk.COLUMN_NAME IS NOT NULL THEN 1
                    ELSE 0
                END AS IS_PRIMARY_KEY
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT
                    kcu.TABLE_SCHEMA,
                    kcu.TABLE_NAME,
                    kcu.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
                    ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
                    AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON pk.TABLE_SCHEMA = c.TABLE_SCHEMA
                AND pk.TABLE_NAME = c.TABLE_NAME
                AND pk.COLUMN_NAME = c.COLUMN_NAME
            WHERE c.TABLE_NAME = @P1 AND c.TABLE_SCHEMA = @P2
            ORDER BY c.ORDINAL_POSITION
        "#;

        let mut client = self.client.lock().await;
        let stream = client
            .query(sql, &[&table, &schema_name])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        let mut columns = Vec::new();
        let mut stream = stream.into_row_stream();
        while let Some(item) = stream.next().await {
            let row = item.map_err(|e| DbError::QueryError(e.to_string()))?;
            let is_nullable: &str = row.get(2).unwrap_or("YES");
            let is_pk: i32 = row.get(9).unwrap_or(0);
            let char_max_len: Option<i32> = row.get(4);
            let num_precision: Option<u8> = row.get(5);
            let num_scale: Option<i32> = row.get(6);
            columns.push(ColumnInfo {
                name: row.get::<&str, _>(0).unwrap_or_default().to_string(),
                data_type: row.get::<&str, _>(1).unwrap_or_default().to_string(),
                nullable: is_nullable == "YES",
                is_primary_key: is_pk == 1,
                default_value: row.get::<&str, _>(3).map(|s| s.to_string()),
                comment: None,
                character_maximum_length: char_max_len.map(|v| v as i64),
                numeric_precision: num_precision.map(|v| v as i64),
                numeric_scale: num_scale.map(|v| v as i64),
            });
        }

        Ok(columns)
    }

    async fn get_schemas(&self) -> Result<Vec<String>, DbError> {
        let sql = r#"
            SELECT DISTINCT SCHEMA_NAME
            FROM INFORMATION_SCHEMA.SCHEMATA
            WHERE SCHEMA_NAME NOT IN ('guest', 'INFORMATION_SCHEMA', 'sys')
            ORDER BY SCHEMA_NAME
        "#;

        let mut client = self.client.lock().await;
        let stream = client
            .query(sql, &[])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        let mut schemas = Vec::new();
        let mut stream = stream.into_row_stream();
        while let Some(item) = stream.next().await {
            let row = item.map_err(|e| DbError::QueryError(e.to_string()))?;
            if let Some(schema) = row.get::<&str, usize>(0) {
                schemas.push(schema.to_string());
            }
        }

        Ok(schemas)
    }

    fn db_type(&self) -> DatabaseType {
        DatabaseType::MSSQL
    }

    async fn export_table_sql(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<String, DbError> {
        let schema_name = schema.unwrap_or("dbo");
        let sql = r#"
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = @P1 AND TABLE_SCHEMA = @P2
            ORDER BY ORDINAL_POSITION
        "#;

        let mut client = self.client.lock().await;
        let stream = client
            .query(sql, &[&table, &schema_name])
            .await
            .map_err(|e| DbError::QueryError(e.to_string()))?;

        let mut col_defs: Vec<String> = Vec::new();
        let mut stream = stream.into_row_stream();
        while let Some(item) = stream.next().await {
            let row = item.map_err(|e| DbError::QueryError(e.to_string()))?;
            let name: &str = row.get(0).unwrap_or_default();
            let data_type: &str = row.get(1).unwrap_or_default();
            let is_nullable: &str = row.get(2).unwrap_or("YES");
            let default: Option<&str> = row.get(3);
            let null_str = if is_nullable == "YES" {
                ""
            } else {
                " NOT NULL"
            };
            let default_str = match default {
                Some(d) => format!(" DEFAULT {}", d),
                None => String::new(),
            };
            col_defs.push(format!(
                "    {} {}{}{}",
                name, data_type, null_str, default_str
            ));
        }

        let full_table = format!("[{}].[{}]", schema_name, table);

        Ok(format!(
            "-- Table: {}\nCREATE TABLE {} (\n{}\n);\n",
            full_table,
            full_table,
            col_defs.join(",\n")
        ))
    }

    async fn close(&self) {
        // The client is dropped automatically when this struct is dropped.
    }

    async fn get_views(&self, _schema: Option<&str>) -> Result<Vec<TableInfo>, DbError> {
        let sql = r#"
            SELECT TABLE_NAME, TABLE_SCHEMA, 'VIEW' as TABLE_TYPE
            FROM INFORMATION_SCHEMA.VIEWS
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        "#;
        let rows = self.query_sql(sql).await?;
        let views = rows
            .rows
            .iter()
            .map(|row| TableInfo {
                name: row
                    .get("TABLE_NAME")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string(),
                schema: row
                    .get("TABLE_SCHEMA")
                    .and_then(|v| v.as_str())
                    .map(|s| s.to_string()),
                row_count: None,
                comment: None,
                table_type: "VIEW".to_string(),
                oid: None,
                owner: None,
                acl: None,
                primary_key: None,
                partition_of: None,
                has_indexes: None,
                has_triggers: None,
                engine: None,
                data_length: None,
                create_time: None,
                update_time: None,
                collation: None,
            })
            .collect();
        Ok(views)
    }

    async fn get_indexes(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<serde_json::Value>, DbError> {
        let schema_name = schema.unwrap_or("dbo");
        let sql = format!(
            r#"
            SELECT i.name as index_name, i.is_unique, i.is_primary_key,
                   STRING_AGG(c.name, ', ') as column_names
            FROM sys.indexes i
            INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            INNER JOIN sys.tables t ON i.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE t.name = '{}' AND s.name = '{}'
            GROUP BY i.name, i.is_unique, i.is_primary_key
            ORDER BY i.name
            "#,
            table.replace('\'', "''"),
            schema_name.replace('\'', "''")
        );
        let rows = self.query_sql(&sql).await?;
        Ok(rows
            .rows
            .into_iter()
            .map(|m| serde_json::Value::Object(m))
            .collect())
    }

    async fn get_foreign_keys(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<Vec<serde_json::Value>, DbError> {
        let schema_name = schema.unwrap_or("dbo");
        let sql = format!(
            r#"
            SELECT
                fk.name as constraint_name,
                c1.name as column_name,
                OBJECT_SCHEMA_NAME(fk.referenced_object_id) as foreign_table_schema,
                OBJECT_NAME(fk.referenced_object_id) as foreign_table_name,
                c2.name as foreign_column_name
            FROM sys.foreign_keys fk
            INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.columns c1 ON fkc.parent_object_id = c1.object_id AND fkc.parent_column_id = c1.column_id
            INNER JOIN sys.columns c2 ON fkc.referenced_object_id = c2.object_id AND fkc.referenced_column_id = c2.column_id
            INNER JOIN sys.tables t ON fk.parent_object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE t.name = '{}' AND s.name = '{}'
            "#,
            table.replace('\'', "''"),
            schema_name.replace('\'', "''")
        );
        let rows = self.query_sql(&sql).await?;
        Ok(rows
            .rows
            .into_iter()
            .map(|m| serde_json::Value::Object(m))
            .collect())
    }

    async fn get_table_row_count(
        &self,
        table: &str,
        schema: Option<&str>,
    ) -> Result<u64, DbError> {
        let full_table = mssql_full_table(table, schema);
        let sql = format!("SELECT COUNT(*) as cnt FROM {}", full_table);
        let rows = self.query_sql(&sql).await?;
        if let Some(row) = rows.rows.first() {
            if let Some(cnt) = row.get("cnt").and_then(|v| v.as_u64()) {
                return Ok(cnt);
            }
        }
        Ok(0)
    }

    async fn get_table_data(
        &self,
        table: &str,
        schema: Option<&str>,
        page: u32,
        page_size: u32,
        order_by: Option<&str>,
    ) -> Result<QueryResult, DbError> {
        let full_table = mssql_full_table(table, schema);
        let order_clause = order_by
            .map(|o| format!(" ORDER BY {}", o))
            .unwrap_or_default();
        let offset = (page - 1) * page_size;

        let sql = if order_by.is_none() {
            format!("SELECT TOP {} * FROM {}", page_size, full_table)
        } else {
            format!(
                "SELECT * FROM {}{} OFFSET {} ROWS FETCH NEXT {} ROWS ONLY",
                full_table, order_clause, offset, page_size
            )
        };
        let mut result = self.query_sql(&sql).await?;
        if result.columns.is_empty() {
            result.columns = self.get_columns(table, schema).await.unwrap_or_default();
        }
        Ok(result)
    }

    async fn update_table_rows(
        &self,
        table: &str,
        schema: Option<&str>,
        updates: &[(String, serde_json::Value)],
        where_clause: &str,
    ) -> Result<ExecuteResult, DbError> {
        let full_table = mssql_full_table(table, schema);
        let set_clauses: Vec<String> = updates
            .iter()
            .map(|(col, val)| format!("{} = {}", col, json_value_to_sql(val)))
            .collect();
        let sql = format!(
            "UPDATE {} SET {} WHERE {}",
            full_table,
            set_clauses.join(", "),
            where_clause
        );
        self.execute_sql(&sql).await
    }

    async fn insert_table_row(
        &self,
        table: &str,
        schema: Option<&str>,
        values: &[(String, serde_json::Value)],
    ) -> Result<ExecuteResult, DbError> {
        let full_table = mssql_full_table(table, schema);
        let columns: Vec<&str> = values.iter().map(|(c, _)| c.as_str()).collect();
        let value_strs: Vec<String> = values.iter().map(|(_, val)| json_value_to_sql(val)).collect();
        let sql = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            full_table,
            columns.join(", "),
            value_strs.join(", ")
        );
        self.execute_sql(&sql).await
    }

    async fn delete_table_rows(
        &self,
        table: &str,
        schema: Option<&str>,
        where_clause: &str,
    ) -> Result<ExecuteResult, DbError> {
        let full_table = mssql_full_table(table, schema);
        let sql = format!("DELETE FROM {} WHERE {}", full_table, where_clause);
        self.execute_sql(&sql).await
    }
}
