@echo off
chcp 65001 >nul 2>&1
title OpenDB - 环境安装脚本
color 0B

echo ╔══════════════════════════════════════════════════╗
echo ║       OpenDB v2.0 - 构建环境自动安装            ║
echo ║   自动检测并安装所有必要的构建工具              ║
echo ╚══════════════════════════════════════════════════╝
echo.

:: ============================================
:: 1. 检查 Node.js
:: ============================================
echo [1/4] 检查 Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 未安装 Node.js
    echo.
    echo 正在下载 Node.js LTS 安装程序...
    
    :: 使用 PowerShell 下载
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'" 2>nul
    
    if exist "%TEMP%\node-installer.msi" (
        echo 正在安装 Node.js（静默安装）...
        msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
        del "%TEMP%\node-installer.msi"
        
        :: 刷新 PATH
        call refreshenv 2>nul || (
            set "PATH=%PATH%;C:\Program Files\nodejs"
        )
        echo [√] Node.js 安装完成
    ) else (
        echo [!] 自动安装失败，请手动安装:
        echo     下载地址: https://nodejs.org/
        echo     选择 LTS 版本 (v22.x)
        echo     安装时勾选 "Add to PATH"
        pause
    )
) else (
    echo [√] Node.js 已安装: 
    node --version
)
echo.

:: ============================================
:: 2. 安装 pnpm
:: ============================================
echo [2/4] 检查 pnpm...
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 未安装 pnpm，正在通过 npm 安装...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [!] pnpm 安装失败，尝试使用 corepack...
        call corepack enable
        call corepack prepare pnpm@latest --activate
    )
    echo [√] pnpm 安装完成
) else (
    echo [√] pnpm 已安装:
    pnpm --version
)
echo.

:: ============================================
:: 3. 检查 Rust
:: ============================================
echo [3/4] 检查 Rust...
where rustc >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 未安装 Rust
    echo.
    echo 正在下载 Rust 安装程序 (rustup-init.exe)...
    
    powershell -Command "Invoke-WebRequest -Uri 'https://win.rustup.rs/x86_64' -OutFile '%TEMP%\rustup-init.exe'" 2>nul
    
    if exist "%TEMP%\rustup-init.exe" (
        echo 正在安装 Rust（默认选项，静默安装）...
        %TEMP%\rustup-init.exe -y --default-toolchain stable --default-host x86_64-pc-windows-msvc
        del "%TEMP%\rustup-init.exe"
        
        :: 刷新 PATH
        set "PATH=%PATH%;%USERPROFILE%\.cargo\bin"
        echo [√] Rust 安装完成
    ) else (
        echo [!] 自动安装失败，请手动安装:
        echo     下载地址: https://rustup.rs/
        echo     运行 rustup-init.exe，选择默认安装 (选项 1)
        pause
    )
) else (
    echo [√] Rust 已安装:
    rustc --version
)
echo.

:: ============================================
:: 4. 检查 Visual Studio Build Tools
:: ============================================
echo [4/4] 检查 Visual Studio Build Tools...
where cl >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 未检测到 MSVC 编译器
    echo.
    echo Tauri 需要 Visual Studio Build Tools 来编译 C/C++ 代码
    echo.
    echo 请按以下步骤安装:
    echo.
    echo   1. 下载 Visual Studio Build Tools 2022:
    echo      https://visualstudio.microsoft.com/zh-hans/visual-cpp-build-tools/
    echo.
    echo   2. 运行安装程序，勾选以下工作负载:
    echo      [√] C++ 桌面开发 (Desktop development with C++)
    echo.
    echo   3. 在 "单个组件" 中确保勾选:
    echo      [√] MSVC v143 - VS 2022 C++ x64/x86 生成工具
    echo      [√] Windows 11 SDK (或 Windows 10 SDK)
    echo      [√] C++ ATL (最新版本)
    echo.
    echo   安装大小约 6-8 GB，安装完成后重新运行此脚本验证
    echo.
    
    :: 尝试通过 winget 安装
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        echo.
        echo 检测到 winget，是否自动安装 Visual Studio Build Tools?
        echo   按 Y 自动安装 (需要管理员权限)
        echo   按 N 跳过，手动安装
        echo.
        choice /C YN /M "自动安装"
        if %errorlevel% equ 1 (
            echo 正在通过 winget 安装...
            winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"
            echo [√] Visual Studio Build Tools 安装完成
        )
    )
) else (
    echo [√] Visual Studio Build Tools 已安装
)
echo.

:: ============================================
:: 最终验证
:: ============================================
echo ══════════════════════════════════════════════════
echo   环境检查结果
echo ══════════════════════════════════════════════════
echo.

set "ALL_OK=1"

where node >nul 2>&1 && (echo [√] Node.js:    OK) || (echo [×] Node.js:    未安装 & set "ALL_OK=0")
where pnpm >nul 2>&1 && (echo [√] pnpm:      OK) || (echo [×] pnpm:      未安装 & set "ALL_OK=0")
where rustc >nul 2>&1 && (echo [√] Rust:      OK) || (echo [×] Rust:      未安装 & set "ALL_OK=0")
where cargo >nul 2>&1 && (echo [√] Cargo:     OK) || (echo [×] Cargo:     未安装 & set "ALL_OK=0")
where cl >nul 2>&1 && (echo [√] MSVC:      OK) || (echo [×] MSVC:      未安装 & set "ALL_OK=0")
echo.

if "%ALL_OK%"=="1" (
    echo ╔══════════════════════════════════════════════════╗
    echo ║     所有构建工具已就绪！                        ║
    echo ║     请运行 build-windows.bat 开始构建           ║
    echo ╚══════════════════════════════════════════════════╝
) else (
    echo ╔══════════════════════════════════════════════════╗
    echo ║     部分工具未安装，请根据上方提示安装          ║
    echo ║     安装完成后重新运行此脚本验证                ║
    echo ╚══════════════════════════════════════════════════╝
)

echo.
pause
