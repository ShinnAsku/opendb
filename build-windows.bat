@echo off
chcp 65001 >nul 2>&1
title openDB - Windows Build Script
color 0A

echo ╔══════════════════════════════════════════════════╗
echo ║          openDB v2.0 - Windows Build            ║
echo ║     一键构建 Windows 安装包 (.exe/.msi)         ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: ============================================
:: 检查必要工具
:: ============================================
echo [1/6] 检查构建环境...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先运行 setup-windows.bat 安装依赖
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 未找到 pnpm，正在通过 npm 安装...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [错误] pnpm 安装失败
        pause
        exit /b 1
    )
)

where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Rust，请先运行 setup-windows.bat 安装依赖
    echo 下载地址: https://rustup.rs/
    pause
    exit /b 1
)

where cargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Cargo，请先安装 Rust
    pause
    exit /b 1
)

:: 检查 Rust target
rustup target list --installed | findstr "x86_64-pc-windows-msvc" >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 添加 Windows MSVC target...
    rustup target add x86_64-pc-windows-msvc
)

:: 检查 Visual Studio Build Tools
where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未检测到 MSVC 编译器 (cl.exe)
    echo 请确保已安装 Visual Studio Build Tools 2022
    echo 下载地址: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo 选择 "C++ 桌面开发" 工作负载
    echo.
    echo 尝试使用 vcvarsall.bat 设置环境...
    if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x64
    ) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" (
        call "C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Auxiliary\Build\vcvarsall.bat" x64
    ) else (
        echo [错误] 未找到 Visual Studio，请先安装
        echo.
        echo 快速安装方式:
        echo   1. 下载 Visual Studio Build Tools 2022
        echo   2. 安装时勾选 "C++ 桌面开发"
        echo   3. 重新运行此脚本
        pause
        exit /b 1
    )
)

echo [√] Node.js:    OK
node --version
echo [√] pnpm:      OK
pnpm --version
echo [√] Rust:      OK
rustc --version
echo [√] Cargo:     OK
cargo --version
echo.

:: ============================================
:: 安装前端依赖
:: ============================================
echo [2/6] 安装前端依赖...
call pnpm install
if %errorlevel% neq 0 (
    echo [错误] 前端依赖安装失败
    pause
    exit /b 1
)
echo [√] 前端依赖安装完成
echo.

:: ============================================
:: 安装 Tauri CLI
:: ============================================
echo [3/6] 安装 Tauri CLI...
call pnpm add -D @tauri-apps/cli@latest
if %errorlevel% neq 0 (
    echo [错误] Tauri CLI 安装失败
    pause
    exit /b 1
)
echo [√] Tauri CLI 安装完成
echo.

:: ============================================
:: 构建前端
:: ============================================
echo [4/6] 构建前端资源...
call pnpm build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败
    pause
    exit /b 1
)
echo [√] 前端构建完成
echo.

:: ============================================
:: 构建 Tauri 应用
:: ============================================
echo [5/6] 构建 openDB Windows 安装包...
echo 这可能需要 5-15 分钟（首次构建需要下载和编译 Rust 依赖）...
echo.
call pnpm tauri build
if %errorlevel% neq 0 (
    echo [错误] Tauri 构建失败
    echo.
    echo 常见问题排查:
    echo   1. 确保 Visual Studio Build Tools 已安装（C++ 桌面开发）
    echo   2. 确保 Rust 已更新: rustup update
    echo   3. 清理后重试: cargo clean
    echo   4. 检查网络连接（需要下载 crates.io 依赖）
    pause
    exit /b 1
)
echo.

:: ============================================
:: 输出结果
:: ============================================
echo [6/6] 构建完成！
echo.
echo ══════════════════════════════════════════════════
echo   构建产物位置:
echo ══════════════════════════════════════════════════
echo.

set "BUILD_DIR=%~dp0src-tauri\target\release\bundle"

if exist "%BUILD_DIR%\msi\openDB_0.1.0_x64_en-US.msi" (
    echo [√] MSI 安装包:
    echo     %BUILD_DIR%\msi\openDB_0.1.0_x64_en-US.msi
    echo.
)

if exist "%BUILD_DIR%\nsis\openDB_0.1.0_x64-setup.exe" (
    echo [√] NSIS 安装包 (.exe):
    echo     %BUILD_DIR%\nsis\openDB_0.1.0_x64-setup.exe
    echo.
)

echo [√] 可执行文件:
echo     %~dp0src-tauri\target\release\opendb.exe
echo.

:: 打开输出目录
echo 正在打开构建输出目录...
explorer "%BUILD_DIR%"

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║          构建成功！可以安装测试了 🎉           ║
echo ╚══════════════════════════════════════════════════╝
echo.
pause
