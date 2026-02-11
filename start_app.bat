@echo off
title Newsletter Generator Control
echo ==========================================
echo      Stopping old server processes...
echo ==========================================
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.exe >nul 2>&1

echo.
echo ==========================================
echo      Starting Newsletter Generator...
echo ==========================================
echo.
call npm run dev
pause
