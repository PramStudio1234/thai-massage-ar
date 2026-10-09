@echo off
cd /d "%~dp0"
title Thai Massage & Wellness AR Training Platform
echo ========================================================
echo   Thai Massage & Wellness AR Training Platform (v2.4)
echo   ระบบฝึกทักษะนวดแผนไทยเสมือนจริงด้วยเทคโนโลยี AR & AI
echo ========================================================
echo.
echo Starting Web Server...
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js LTS and reopen this file.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b 1
)
call npm run dev -- --port 5173 --host --open
pause
