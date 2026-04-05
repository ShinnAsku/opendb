# openDB v2.0 - Windows 构建指南

## 快速开始（推荐）

### 方式一：一键构建（最简单）

1. 将源码解压到 Windows 电脑
2. **双击运行 `setup-windows.bat`** — 自动检测并安装所有构建工具
3. **双击运行 `build-windows.bat`** — 自动完成构建
4. 构建完成后会自动打开输出目录，里面有 `.exe` 安装包

### 方式二：手动构建

如果自动脚本不工作，按以下步骤操作：

---

## 环境要求

| 工具 | 版本要求 | 下载地址 |
|------|---------|---------|
| Node.js | v18+ (推荐 v22 LTS) | https://nodejs.org/ |
| pnpm | 最新版 | `npm install -g pnpm` |
| Rust | stable (最新) | https://rustup.rs/ |
| Visual Studio Build Tools 2022 | 含 C++ 桌面开发 | https://visualstudio.microsoft.com/visual-cpp-build-tools/ |

---

## 详细步骤

### 第一步：安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 **LTS** 版本（v22.x）
3. 运行安装程序，**务必勾选 "Add to PATH"**
4. 验证：打开 CMD，输入 `node --version`

### 第二步：安装 pnpm

```cmd
npm install -g pnpm
```

验证：`pnpm --version`

### 第三步：安装 Rust

1. 访问 https://rustup.rs/
2. 下载 `rustup-init.exe`
3. 运行安装程序，选择 **默认安装**（选项 1）
4. 安装完成后**重启终端**
5. 验证：`rustc --version` 和 `cargo --version`

### 第四步：安装 Visual Studio Build Tools

1. 访问 https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/
2. 下载并运行安装程序
3. 勾选 **"C++ 桌面开发"** 工作负载（约 6-8 GB）
4. 在右侧确保包含：
   - MSVC v143 - VS 2022 C++ x64/x86 生成工具
   - Windows 11 SDK（或 Windows 10 SDK）
   - C++ ATL（最新版本）
5. 点击安装，等待完成

### 第五步：构建 OpenDB

打开 CMD 或 PowerShell，进入项目根目录：

```cmd
# 1. 安装前端依赖
pnpm install

# 2. 安装 Tauri CLI
pnpm add -D @tauri-apps/cli@latest

# 3. 构建前端
pnpm build

# 4. 构建 Windows 安装包（首次约 5-15 分钟）
pnpm tauri build
```

---

## 构建产物

构建成功后，安装包位于：

```
src-tauri/target/release/bundle/
├── msi/
│   └── openDB_0.1.0_x64_en-US.msi      # MSI 安装包
├── nsis/
│   └── openDB_0.1.0_x64-setup.exe       # NSIS 安装包（推荐）
└── ...
```

**推荐使用 NSIS 安装包**（`OpenDB_0.1.0_x64-setup.exe`），它提供了更好的安装体验。

也可以直接运行免安装版本：
```
src-tauri/target/release/opendb.exe
```

---

## 常见问题

### Q: 构建报错 "link.exe not found"
**A:** Visual Studio Build Tools 未正确安装或环境变量未生效。尝试：
- 重启电脑
- 或在 "VS 2022 x64 Native Tools Command Prompt" 中运行构建命令

### Q: 构建报错 "error: linker 'link.exe' not found"
**A:** 需要在 VS Developer Command Prompt 中构建：
1. 开始菜单搜索 "Developer Command Prompt"
2. 选择 "VS 2022 x64 Native Tools Command Prompt"
3. cd 到项目目录，运行 `pnpm tauri build`

### Q: 首次构建非常慢
**A:** 首次构建需要下载和编译所有 Rust 依赖（约 200+ crates），耗时 5-15 分钟。
后续构建会快很多（增量编译）。

### Q: 构建报错 "cargo: rustc --lib --manifest-path ... failed"
**A:** 尝试清理后重试：
```cmd
cd src-tauri
cargo clean
cd ..
pnpm tauri build
```

### Q: 网络问题导致 crates 下载失败
**A:** 配置国内镜像源，编辑 `%USERPROFILE%\.cargo\config.toml`：
```toml
[source.crates-io]
replace-with = 'ustc'

[source.ustc]
registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"
```

### Q: "error: could not find native TLS library"
**A:** 项目依赖 native-tls，需要 OpenSSL。Windows 上通常由 Visual Studio 提供，确保已安装。

### Q: 如何只构建 .exe 不打安装包？
**A:** 运行 `pnpm tauri build` 会同时生成 .exe 和安装包。如果只需要 .exe：
```cmd
cd src-tauri
cargo build --release
```

---

## 系统要求

- **操作系统**: Windows 10/11 (x64)
- **内存**: 至少 8 GB（构建时推荐 16 GB）
- **磁盘空间**: 至少 10 GB（构建工具 + 依赖 + 产物）
- **网络**: 需要下载 npm 包和 Rust crates

---

## 开发模式

如果只想开发调试，不需要打包：

```cmd
pnpm tauri dev
```

这会启动开发服务器，支持热更新，修改代码后自动刷新。
