@echo off
title Newsletter Generator Setup
echo ==========================================
echo      Newsletter Generator Setup
echo ==========================================
echo.

echo [1/2] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit
)
echo Node.js is installed.
echo.

echo [2/2] Installing dependencies...
echo This may take a few minutes.
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies.
    pause
    exit
)
echoDependencies installed successfully.
echo.

echo ==========================================
echo      Setup Complete!
echo      Starting the application...
echo ==========================================
echo.
call npm run dev
pause
