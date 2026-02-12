@echo off
setlocal

echo [Setup] Checking environment...

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [Error] Node.js is not installed. Please install Node.js first.
    exit /b 1
)

:: Install dependencies
if not exist "node_modules" (
    echo [Setup] Installing dependencies...
    call npm install
) else (
    echo [Setup] Dependencies already installed.
)

:: Install pdf2htmlEX
set "TOOLS_DIR=%~dp0server\tools"
set "PDF2HTML_DIR=%TOOLS_DIR%\pdf2htmlEX"
set "PDF2HTML_EXE=%PDF2HTML_DIR%\pdf2htmlEX.exe"

if not exist "%PDF2HTML_EXE%" (
    echo [Setup] pdf2htmlEX not found. Downloading...
    if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"
    if not exist "%PDF2HTML_DIR%" mkdir "%PDF2HTML_DIR%"

    :: Use PowerShell to download and extract
    :: URL points to a reliable Windows build (e.g. from a known repo or mirror)
    :: Using the 0.14.6 version which is stable for Windows
    powershell -Command "& { \
        $url = 'https://github.com/coolwanglu/pdf2htmlEX/releases/download/v0.14.6/pdf2htmlEX-v0.14.6-win32-static.zip'; \
        $dest = '%TOOLS_DIR%\pdf2htmlEX.zip'; \
        echo 'Downloading pdf2htmlEX...'; \
        Invoke-WebRequest -Uri $url -OutFile $dest; \
        echo 'Extracting...'; \
        Expand-Archive -Path $dest -DestinationPath '%PDF2HTML_DIR%' -Force; \
        Remove-Item $dest; \
    }"
    
    if exist "%PDF2HTML_EXE%" (
        echo [Setup] pdf2htmlEX installed successfully.
    ) else (
        echo [Setup] Failed to install pdf2htmlEX. Please install manually.
    )
) else (
    echo [Setup] pdf2htmlEX is already installed.
)

:: Add to PATH (Session only for now, user can make it permanent)
set "PATH=%PDF2HTML_DIR%;%PATH%"
echo [Setup] Added pdf2htmlEX to current session PATH.

echo [Setup] Starting development server...
npm run dev
