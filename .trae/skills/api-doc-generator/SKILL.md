---
name: api-doc-generator
description: Tauri Commands API 文档生成器。当用户提到"生成文档"、"API 文档"、"写接口说明"、"命令文档"、"前端对接文档"时自动触发
---

# Tauri Commands API 文档生成专家

你是资深技术文档工程师，专精为 Tauri 应用生成清晰、完整的 API 文档。

## 核心能力

### 1. 从 Rust 代码自动生成文档

#### 输入示例
```rust
/// 测试数据库连接
/// 
/// 验证数据库连接是否可用，并返回连接延迟和版本信息。
/// 
/// # Arguments
/// * `state` - 数据库连接池状态
/// 
/// # Returns
/// * `ConnectionTestResult` - 连接测试结果
/// 
/// # Errors
/// 返回错误如果：
/// - 数据库无法连接
/// - 查询超时
/// - 认证失败
#[tauri::command]
pub async fn test_database_connection(
    state: State<'_, DbPool>,
) -> Result<ConnectionTestResult, String> {
    // ...
}
```

#### 生成的 Markdown 文档
```markdown
# API 参考文档

## 数据库操作

### `test_database_connection`

测试数据库连接是否可用。

**功能描述**:  
验证数据库连接是否可用，并返回连接延迟和数据库版本信息。

**调用方式**:
```typescript
import { invoke } from '@tauri-apps/api/core'

const result = await invoke<ConnectionTestResult>('test_database_connection')
```

**参数**:  
无（使用已配置的数据库连接池）

**返回值**:
```typescript
interface ConnectionTestResult {
  success: boolean           // 是否成功
  message: string            // 结果描述
  latency_ms?: number        // 连接延迟 (毫秒)
  database_version?: string  // 数据库版本
}
```

**错误情况**:
- 数据库无法连接
- 查询超时
- 认证失败

**示例**:
```typescript
try {
  const result = await invoke('test_database_connection')
  if (result.success) {
    console.log(`连接成功！延迟：${result.latency_ms}ms`)
    console.log(`数据库版本：${result.database_version}`)
  }
} catch (error) {
  console.error('连接失败:', error)
}
```

---
```

### 2. 完整文档模板

```markdown
# {{项目名称}} - API 文档

> 最后更新：{{日期}}  
> 版本：{{版本号}}

## 目录

1. [快速开始](#快速开始)
2. [数据库管理](#数据库管理)
3. [查询执行](#查询执行)
4. [数据浏览](#数据浏览)
5. [错误处理](#错误处理)

## 快速开始

### 初始化连接

在开始任何操作前，需要先建立数据库连接：

```typescript
import { invoke } from '@tauri-apps/api/core'

// 配置连接
const config = {
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  username: 'postgres',
  password: 'secret'
}

// 测试连接
const result = await invoke('test_connection', config)
console.log(result) // { success: true, message: '连接成功' }
```

## 数据库管理

### `create_connection`

创建新的数据库连接配置。

**参数**:
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| `name` | string | ✅ | 连接名称 |
| `host` | string | ✅ | 主机地址 |
| `port` | number | ✅ | 端口号 |
| `database` | string | ✅ | 数据库名 |
| `username` | string | ✅ | 用户名 |
| `password` | string | ✅ | 密码 |
| `ssl_mode` | string | ❌ | SSL 模式 (`disable`, `require`, `verify-full`) |

**返回值**:
```typescript
interface ConnectionConfig {
  id: string
  name: string
  created_at: string
  last_used?: string
}
```

**示例**:
```typescript
const config = await invoke('create_connection', {
  name: '生产数据库',
  host: 'prod-db.example.com',
  port: 5432,
  database: 'production',
  username: 'app_user',
  password: 'secure_password',
  ssl_mode: 'require'
})
```

### `list_connections`

获取所有已保存的连接配置。

**参数**: 无

**返回值**:
```typescript
ConnectionConfig[]
```

### `delete_connection`

删除指定的连接配置。

**参数**:
| 参数名 | 类型 | 描述 |
|--------|------|------|
| `id` | string | 连接配置 ID |

**返回值**: `boolean` (是否成功删除)

## 查询执行

### `execute_query`

执行 SQL 查询并返回结果。

**参数**:
| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| `connection_id` | string | ✅ | 连接配置 ID |
| `query` | string | ✅ | SQL 查询语句 |
| `params` | string[] | ❌ | 参数化查询的参数列表 |
| `timeout_ms` | number | ❌ | 超时时间 (毫秒)，默认 30000 |

**返回值**:
```typescript
interface QueryResult {
  columns: string[]           // 列名
  rows: Record<string, any>[] // 行数据
  affected_rows?: number      // 受影响的行数 (INSERT/UPDATE/DELETE)
  execution_time_ms: number   // 执行时间
}
```

**示例**:
```typescript
// 简单查询
const result = await invoke('execute_query', {
  connection_id: 'conn_123',
  query: 'SELECT * FROM users WHERE id = $1',
  params: ['42']
})

console.log(result.columns) // ['id', 'username', 'email']
console.log(result.rows)    // [{ id: 42, username: 'john', email: 'john@example.com' }]
console.log(result.execution_time_ms) // 15.3
```

**安全提醒**:
- ⚠️ 始终使用参数化查询防止 SQL 注入
- ⚠️ 不要在前端直接拼接 SQL 字符串
- ⚠️ 敏感操作（DELETE/UPDATE）需要二次确认

### `explain_query`

分析 SQL 查询的执行计划。

**参数**: 同 `execute_query`

**返回值**:
```typescript
interface ExplainResult {
  plan: string              // 执行计划文本
  estimated_cost: number    // 预估成本
  actual_rows?: number      // 实际行数 (如果已执行)
  recommendations: string[] // 优化建议
}
```

## 数据浏览

### `list_tables`

获取数据库中所有表的列表。

**参数**:
| 参数名 | 类型 | 描述 |
|--------|------|------|
| `connection_id` | string | 连接 ID |
| `schema` | string | Schema 名称 (默认 'public') |

**返回值**:
```typescript
interface TableInfo {
  name: string
  schema: string
  row_count?: number
  size_bytes?: number
}
```

### `get_table_schema`

获取指定表的结构定义。

**参数**:
| 参数名 | 类型 | 描述 |
|--------|------|------|
| `connection_id` | string | 连接 ID |
| `table_name` | string | 表名 |
| `schema` | string | Schema 名称 |

**返回值**:
```typescript
interface ColumnInfo {
  name: string
  type: string
  nullable: boolean
  default?: string
  is_primary_key: boolean
  is_unique: boolean
}
```

## 错误处理

### 错误码对照表

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `CONNECTION_FAILED` | 连接失败 | 检查网络、凭证、数据库服务状态 |
| `QUERY_TIMEOUT` | 查询超时 | 优化查询、增加 timeout_ms、添加索引 |
| `SQL_SYNTAX_ERROR` | SQL 语法错误 | 检查 SQL 语句、使用参数化查询 |
| `PERMISSION_DENIED` | 权限不足 | 联系 DBA 授予相应权限 |
| `POOL_EXHAUSTED` | 连接池耗尽 | 增加连接池大小、检查连接泄露 |

### 错误处理最佳实践

```typescript
import { invoke } from '@tauri-apps/api/core'

async function safeQuery(sql: string, params?: string[]) {
  try {
    return await invoke('execute_query', { sql, params })
  } catch (error) {
    const err = error as string
    
    if (err.includes('CONNECTION_FAILED')) {
      // 提示用户检查连接
      showConnectionError()
    } else if (err.includes('QUERY_TIMEOUT')) {
      // 建议优化查询
      suggestOptimization()
    } else {
      // 通用错误处理
      showError(err)
    }
    
    throw error // 继续向上抛出
  }
}
```

## 附录

### 类型定义汇总

```typescript
// 完整类型定义方便前端引用
interface ConnectionTestResult {
  success: boolean
  message: string
  latency_ms?: number
  database_version?: string
}

interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  affected_rows?: number
  execution_time_ms: number
}

// ... 其他类型
```

### 更新日志

- **v0.1.0** (2026-04-02): 初始版本
  - 数据库连接管理
  - SQL 查询执行
  - 基础数据浏览

```

### 3. 自动化脚本

#### 从 Cargo.toml 提取版本
```bash
#!/bin/bash
# scripts/generate-docs.sh

VERSION=$(grep '^version =' src-tauri/Cargo.toml | head -1 | cut -d'"' -f2)
DATE=$(date +%Y-%m-%d)

echo "Generating docs for version $VERSION ($DATE)..."

# 调用 Rust 程序解析源代码并生成文档
cargo run --bin doc-generator -- \
  --input src-tauri/src/commands.rs \
  --output docs/API.md \
  --version "$VERSION" \
  --date "$DATE"
```

#### TypeScript 类型生成
```typescript
// scripts/generate-types.ts
import { writeFileSync } from 'fs'

const types = `
// 自动生成的 API 类型定义
// 不要手动修改此文件

export interface ConnectionTestResult {
  success: boolean
  message: string
  latency_ms?: number
  database_version?: string
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, any>[]
  affected_rows?: number
  execution_time_ms: number
}

// ... 导出所有类型
`

writeFileSync('src/types/api.ts', types)
console.log('✅ Types generated!')
```

### 4. 文档部署

#### VitePress 配置
```javascript
// docs/.vitepress/config.js
export default {
  title: '数据库运维工具 - API 文档',
  description: '完整的 Tauri Commands API 参考',
  themeConfig: {
    nav: [
      { text: '快速开始', link: '/guide/' },
      { text: 'API 参考', link: '/api/' }
    ],
    sidebar: {
      '/api/': [
        { text: '数据库管理', link: '/api/database' },
        { text: '查询执行', link: '/api/query' },
        { text: '数据浏览', link: '/api/browse' },
        { text: '错误处理', link: '/api/errors' }
      ]
    }
  }
}
```

#### GitHub Pages 部署
```yaml
# .github/workflows/deploy-docs.yml
name: Deploy Docs

on:
  push:
    branches: [main]
    paths: ['docs/**', 'src-tauri/src/commands.rs']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
      
      - name: Install dependencies
        run: npm ci
        working-directory: docs
      
      - name: Build
        run: npx vitepress build
        working-directory: docs
      
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

## 工作流程

### 当用户请求生成文档时：

1. **收集源代码**
   - Rust Command 定义
   - 类型定义
   - 注释文档

2. **选择文档格式**
   - Markdown (README/GitHub)
   - VitePress (静态网站)
   - OpenAPI/Swagger (RESTful 风格)

3. **生成完整文档**
   - 包含所有 Commands
   - 添加使用示例
   - 错误处理说明

## 输出格式

```markdown
# {{标题}}

## 概述
[简短介绍]

## API 列表

### `command_name`

**描述**: [功能说明]

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|

**返回值**: [类型定义]

**示例**:
```typescript
[调用示例代码]
```

**错误**: [可能的错误]
```

## 主动询问

如果信息不足，问：
1. 要生成什么格式的文档？(Markdown/VitePress/Swagger)
2. 有现有的 Rust 代码吗？
3. 需要包含哪些部分？(示例/错误处理/类型定义)
4. 要部署到哪儿？(GitHub Pages/内部 Wiki)
