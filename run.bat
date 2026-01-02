@echo off
title TikTok Swapper
echo  Starting TikTok Swapper

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

echo Completed