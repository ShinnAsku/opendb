# OpenDB - Bun 集成指南

本项目已集成 Bun 作为可选的包管理器和测试运行工具，主要用于测试和开发流程的优化。

## 前提条件

- 安装 Bun：https://bun.sh/docs/installation
- Rust（最新稳定版）
- Tauri 所需的平台工具链

## 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 启动开发服务

#### Mock 模式（推荐用于 UI 开发）

无需连接真实数据库，使用模拟数据进行前端开发：

```bash
bun run dev:mock
```

#### 完整模式（Tauri + Rust）

```bash
bun run tauri dev
```

## 测试命令

### 快速质量检查

```bash
bun run test:smoke
```

运行类型检查和 Rust 编译检查，适合日常开发快速验证。

### 完整测试套件

```bash
bun run test:all
```

运行所有测试，包括：
- TypeScript 类型检查
- Prettier 格式化检查
- Rust 编译检查
- Rust 单元测试
- 前端单元测试

### CI 级测试

```bash
bun run test:ci
```

### 单项测试

```bash
# TypeScript 类型检查
bun run typecheck

# 代码格式化
bun run format

# Rust 编译检查
bun run rust:check

# Rust 格式化
bun run rust:fmt

# 前端单元测试
bun run test:unit

# 前端测试监听模式
bun run test:watch

# Rust 单元测试
bun run rust:test
```

## 性能测试

### 基准测试

可以使用 Bun 进行简单的性能基准测试：

```bash
# 在项目根目录创建性能测试文件
cat > test/benchmark/simple.bench.ts << 'EOF'
import { describe, it, expect } from 'bun:test'

describe('Performance Benchmarks', () => {
  it('should measure loop performance', () => {
    const start = performance.now()
    let sum = 0
    for (let i = 0; i < 1_000_000; i++) {
      sum += i
    }
    const end = performance.now()
    console.log(`Loop took ${end - start}ms`)
    expect(sum).toBe(499999500000)
  })
})
EOF

# 运行基准测试
bun test test/benchmark/
```

### 数据库操作性能测试

使用 Mock 模式测试前端数据库操作的性能：

```bash
bun run test:unit
```

## Mock 模式详解

Mock 模式允许你在没有真实数据库连接的情况下开发 UI 功能：

### 环境变量

通过环境变量启用 Mock 模式：

```bash
VITE_MOCK_MODE=true bun run dev
```

### 可用的 Mock 数据

- PostgreSQL 和 SQLite 连接示例
- 用户表和订单表
- 示例查询结果
- Schema 节点数据

### 扩展 Mock 数据

编辑 `test/mock/tauri-commands.ts` 文件来添加或修改 Mock 数据。

## 保持兼容性

### npm/pnpm 仍然可用

你仍然可以使用 npm 或 pnpm，项目保持完全兼容：

```bash
# 使用 pnpm
pnpm install
pnpm dev

# 使用 npm
npm install
npm run dev
```

### 何时使用 Bun

- 需要快速运行测试时
- UI 开发使用 Mock 模式时
- 想要更快的包安装速度时
- 性能基准测试时

### 何时继续使用 npm/pnpm

- 生产环境构建
- 完整 Tauri 应用开发
- 需要稳定的依赖管理时

## 项目结构（测试相关）

```
opendb/
├── test/
│   ├── setup.ts              # 测试环境设置
│   ├── mock/
│   │   └── tauri-commands.ts # Mock Tauri 命令
│   ├── unit/                 # 单元测试
│   │   ├── connection-store.test.ts
│   │   └── tauri-commands-mock.test.ts
│   └── benchmark/            # 性能测试（可选）
├── vitest.config.ts          # Vitest 配置
├── bunfig.toml               # Bun 配置
└── .prettierrc               # Prettier 配置
```

## 开发工作流推荐

### 日常 UI 开发

```bash
bun install
bun run dev:mock
# 在另一个终端运行测试
bun run test:smoke
```

### 功能开发后测试

```bash
# 先运行快速检查
bun run test:smoke

# 确保代码格式化
bun run format
bun run rust:fmt

# 运行完整测试
bun run test:all
```

### 提交前检查

```bash
bun run test:ci
```

## 注意事项

1. **轻量优化**：本集成保持轻量，没有对现有代码进行大改动
2. **向后兼容**：保留了 npm/pnpm 的完整支持
3. **Mock 优先**：Mock 模式主要用于 UI 开发，不涉及真实数据库操作
4. **测试优先**：Bun 主要用于测试和开发流程的优化

## 故障排除

### Bun 安装问题

参考官方文档：https://bun.sh/docs/installation

### 依赖安装问题

如果遇到问题，可以尝试：

```bash
# 删除旧的依赖
rm -rf node_modules bun.lockb

# 重新安装
bun install
```

### Mock 模式不生效

确保：
1. 环境变量 `VITE_MOCK_MODE=true` 已设置
2. 使用 `bun run dev:mock` 命令
3. 检查浏览器控制台是否有相关日志

## 总结

Bun 集成提供了：
- 🚀 更快的依赖安装
- 🧪 便捷的测试运行
- 🎭 Mock 模式用于 UI 开发
- 📊 性能基准测试能力
- 🔄 完全向后兼容

选择适合你的工作流的工具即可！
