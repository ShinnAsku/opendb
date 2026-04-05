# 连接存储迁移指南

## 概述

本文档描述如何从 localStorage 迁移到新的 SQLite 加密存储方案。

## 架构对比

### 旧方案（localStorage）
- **存储位置**: `localStorage.getItem('opendb-connections')`
- **数据格式**: JSON 数组
- **密码存储**: 系统钥匙串（tauri-plugin-secure-storage）
- **限制**: 
  - 存储容量有限（~5MB）
  - 不支持复杂查询
  - 无加密（除密码外）
  - 不支持分组、标签等高级功能

### 新方案（SQLite）
- **存储位置**: `~/.local/share/opendb/connections.db` (Linux/macOS)
- **数据格式**: SQLite 数据库
- **加密**: AES-256-GCM 加密敏感字段
- **密钥管理**: 系统钥匙串存储主密钥
- **优势**:
  - 支持大量连接
  - 支持分组、标签、颜色标记
  - 完整的审计日志（连接时间、次数）
  - 支持复杂查询和过滤

## 数据库表结构

### connections 表
```sql
CREATE TABLE connections (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    db_type TEXT NOT NULL,
    host TEXT,
    port INTEGER,
    username TEXT,
    password_encrypted TEXT,
    database TEXT,
    enable_ssl BOOLEAN DEFAULT 0,
    ssl_ca_cert TEXT,
    ssl_client_cert TEXT,
    ssl_client_key TEXT,
    ssh_tunnel_enabled BOOLEAN DEFAULT 0,
    ssh_host TEXT,
    ssh_port INTEGER,
    ssh_username TEXT,
    ssh_password_encrypted TEXT,
    ssh_private_key TEXT,
    keepalive_interval INTEGER DEFAULT 30,
    auto_reconnect BOOLEAN DEFAULT 1,
    color_label TEXT,
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP,
    connection_count INTEGER DEFAULT 0
);
```

### connection_groups 表
```sql
CREATE TABLE connection_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES connection_groups(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### connection_group_mapping 表
```sql
CREATE TABLE connection_group_mapping (
    connection_id TEXT REFERENCES connections(id) ON DELETE CASCADE,
    group_id TEXT REFERENCES connection_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (connection_id, group_id)
);
```

## 迁移步骤

### 1. 前端迁移脚本

创建 `src/lib/migrate-connections.ts`:

```typescript
import { getAllConnections as getLocalStorageConnections } from '@/stores/modules/connection';
import { createConnection } from './connection-store-api';
import type { Connection } from '@/types';

export async function migrateConnections(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Get connections from localStorage
    const oldConnections = getLocalStorageConnections();
    
    console.log(`Found ${oldConnections.length} connections in localStorage`);

    // Migrate each connection
    for (const conn of oldConnections) {
      try {
        await createConnection({
          ...conn,
          // Map old fields to new format
          type: conn.type,
          host: conn.host,
          port: conn.port,
          username: conn.username,
          password: conn.password,
          database: conn.database,
          enableSsl: conn.enableSsl,
          keepaliveInterval: conn.keepaliveInterval ?? 30,
          autoReconnect: conn.autoReconnect ?? true,
        });
        
        migrated++;
        console.log(`Migrated connection: ${conn.name}`);
      } catch (err) {
        const errorMsg = `Failed to migrate ${conn.name}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Clear localStorage after successful migration
    if (errors.length === 0) {
      localStorage.removeItem('opendb-connections');
      console.log('Migration completed successfully');
    }

    return {
      success: errors.length === 0,
      migrated,
      errors,
    };
  } catch (err) {
    const errorMsg = `Migration failed: ${err instanceof Error ? err.message : String(err)}`;
    errors.push(errorMsg);
    return {
      success: false,
      migrated: 0,
      errors,
    };
  }
}
```

### 2. 在应用启动时检查迁移

修改 `src/components/MainLayout.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { migrateConnections } from '@/lib/migrate-connections';
import { initConnectionStore } from '@/lib/connection-store-api';

function MainLayout() {
  const [migrationComplete, setMigrationComplete] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Initialize SQLite store
      await initConnectionStore();
      
      // Check if migration is needed
      const hasOldConnections = localStorage.getItem('opendb-connections');
      if (hasOldConnections) {
        const result = await migrateConnections();
        if (result.success) {
          console.log(`Migrated ${result.migrated} connections`);
        } else {
          console.error(`Migration errors:`, result.errors);
        }
      }
      
      setMigrationComplete(true);
    };
    
    init();
  }, []);

  if (!migrationComplete) {
    return <div>Initializing...</div>;
  }

  return (
    // ... existing code
  );
}
```

### 3. 更新 ConnectionStore

修改 `src/stores/modules/connection.ts`:

```typescript
import { 
  getAllConnections as getSQLiteConnections,
  createConnection as createSQLiteConnection,
  updateConnection as updateSQLiteConnection,
  deleteConnection as deleteSQLiteConnection,
} from '@/lib/connection-store-api';

class ConnectionStore {
  // ... existing code

  async loadConnections() {
    // Load from SQLite instead of localStorage
    const connections = await getSQLiteConnections();
    this.connections = connections;
    this.persist(); // Still persist to localStorage as cache
  }

  async addConnection(connection: Connection) {
    this.connections.push(connection);
    await createSQLiteConnection(connection);
    this.persist();
  }

  async updateConnection(id: string, config: Partial<Connection>) {
    const index = this.connections.findIndex(c => c.id === id);
    if (index !== -1) {
      const updated = { ...this.connections[index], ...config };
      this.connections[index] = updated;
      await updateSQLiteConnection(updated);
      this.persist();
    }
  }

  async removeConnection(id: string) {
    this.connections = this.connections.filter(c => c.id !== id);
    await deleteSQLiteConnection(id);
    this.persist();
  }
}
```

## API 使用示例

### 创建连接
```typescript
import { createConnection } from '@/lib/connection-store-api';

await createConnection({
  id: 'uuid-123',
  name: 'Production DB',
  type: 'postgresql',
  host: 'prod.example.com',
  port: 5432,
  username: 'admin',
  password: 'secret',
  database: 'myapp',
  enableSsl: true,
  keepaliveInterval: 30,
  autoReconnect: true,
});
```

### 获取所有连接
```typescript
import { getAllConnections } from '@/lib/connection-store-api';

const connections = await getAllConnections();
```

### 更新连接
```typescript
import { updateConnection } from '@/lib/connection-store-api';

await updateConnection({
  ...existingConnection,
  name: 'Updated Name',
  host: 'new-host.example.com',
});
```

### 删除连接
```typescript
import { deleteConnection } from '@/lib/connection-store-api';

await deleteConnection('connection-id');
```

### 使用分组
```typescript
import { 
  createGroup, 
  addConnectionToGroup,
  getConnectionsInGroup 
} from '@/lib/connection-store-api';

// Create group
await createGroup({
  id: 'group-prod',
  name: 'Production',
  sortOrder: 1,
});

// Add connection to group
await addConnectionToGroup('connection-id', 'group-prod');

// Get connections in group
const prodConnections = await getConnectionsInGroup('group-prod');
```

## 安全说明

### 加密机制
1. **主密钥生成**: 使用加密安全的随机数生成器生成 32 字节密钥
2. **密钥存储**: 主密钥存储在系统钥匙串中
   - macOS: Keychain
   - Windows: Credential Manager
   - Linux: Secret Service (GNOME Keyring / KWallet)
3. **数据加密**: 使用 AES-256-GCM 加密敏感字段
   - 密码
   - SSH 密码
   - 私钥（如果提供）

### 安全最佳实践
1. 永远不要明文存储密码
2. 使用强主密码（如果使用用户密码派生密钥）
3. 定期备份数据库文件
4. 在传输层使用 SSL/TLS

## 故障排除

### 问题：无法初始化主密钥
**解决方案**: 
- 检查系统钥匙串服务是否运行
- Linux: 确保安装了 `gnome-keyring` 或 `kwallet`
- Windows: 检查 Credential Manager 服务
- macOS: 检查 Keychain 访问

### 问题：迁移后连接丢失
**解决方案**:
1. 检查 SQLite 数据库文件位置：`~/.local/share/opendb/connections.db`
2. 使用 SQLite 浏览器查看数据：`sqlite3 connections.db "SELECT * FROM connections;"`
3. 如果数据存在但应用无法读取，检查主密钥是否正确初始化

### 问题：性能缓慢
**解决方案**:
1. 添加索引（已默认添加）
2. 使用连接池（对于大量并发访问）
3. 定期清理旧的审计日志

## 回滚方案

如果需要回滚到 localStorage 方案：

```typescript
// Export from SQLite
const connections = await getAllConnections();

// Clear SQLite
for (const conn of connections) {
  await deleteConnection(conn.id);
}

// Write to localStorage
localStorage.setItem('opendb-connections', JSON.stringify(connections));
```

## 未来增强

1. **云同步**: 支持将连接配置同步到云端
2. **团队共享**: 支持团队间共享连接配置
3. **导入/导出**: 支持导出为 JSON/CSV 格式
4. **连接模板**: 预定义常用连接配置模板
5. **自动备份**: 定期自动备份连接配置
