@echo off
title TikTok Replicator
echo ============================================
echo    TikTok Replicator - Starting...
echo ============================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Run the processor
node batch-processor.js

echo.
echo ============================================
echo    Processing Complete
echo ============================================
pause
