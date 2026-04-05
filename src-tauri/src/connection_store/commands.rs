use super::models::Connection;
use super::ConnectionStore;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn get_connections(
    state: State<'_, Arc<ConnectionStore>>,
) -> Result<Vec<Connection>, String> {
    println!("[ConnectionStore] get_connections: 开始查询所有连接...");
    let result = state.get_all_connections();
    match &result {
        Ok(conns) => {
            println!("[ConnectionStore] get_connections: 成功返回 {} 个连接", conns.len());
            for (i, c) in conns.iter().enumerate() {
                println!("  [{}] id={}, name={}, db_type={:?}, host={:?}:{:?}", i, c.id, c.name, c.db_type, c.host, c.port);
            }
        }
        Err(e) => println!("[ConnectionStore] get_connections: 查询失败: {}", e),
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_connection(
    state: State<'_, Arc<ConnectionStore>>,
    connection: Connection,
) -> Result<(), String> {
    println!("[ConnectionStore] add_connection: 新增连接 id={}, name={}, db_type={:?}, host={:?}:{:?}", 
        connection.id, connection.name, connection.db_type, connection.host, connection.port);
    let result = state.create_connection(&connection);
    match &result {
        Ok(_) => println!("[ConnectionStore] add_connection: 成功写入 SQLite"),
        Err(e) => println!("[ConnectionStore] add_connection: 写入失败: {}", e),
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, Arc<ConnectionStore>>,
    connection: Connection,
) -> Result<(), String> {
    println!("[ConnectionStore] update_connection: 更新连接 id={}, name={}, db_type={:?}, host={:?}:{:?}", 
        connection.id, connection.name, connection.db_type, connection.host, connection.port);
    let result = state.update_connection(&connection);
    match &result {
        Ok(_) => println!("[ConnectionStore] update_connection: 成功更新 SQLite"),
        Err(e) => println!("[ConnectionStore] update_connection: 更新失败: {}", e),
    }
    result.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_connection(
    state: State<'_, Arc<ConnectionStore>>,
    id: String,
) -> Result<(), String> {
    println!("[ConnectionStore] delete_connection: 删除连接 id={}", id);
    let result = state.delete_connection(&id);
    match &result {
        Ok(_) => println!("[ConnectionStore] delete_connection: 成功从 SQLite 删除"),
        Err(e) => println!("[ConnectionStore] delete_connection: 删除失败: {}", e),
    }
    result.map_err(|e| e.to_string())
}
