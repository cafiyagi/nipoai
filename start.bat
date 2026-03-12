@echo off
cd /d "%~dp0"

echo Stopping existing Next.js processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000.*LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=2" %%a in ('tasklist ^| findstr "next-server"') do taskkill /F /PID %%a >nul 2>&1

echo Starting NipoAI dev server...
infisical run --env=dev -- npx next dev
pause
