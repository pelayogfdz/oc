@echo off
title CAANMA PRO - WhatsApp Microservice
color 0A

echo ==========================================================
echo   CAANMA PRO - WHATSAPP MICROSERVICE (RESILIENT PIPELINE)
echo ==========================================================
echo This worker handles the active connection with WhatsApp Web.
echo It is self-healing, handles QR code generation, and 
echo automatically restarts if a crash or Puppeteer error occurs.
echo ==========================================================

:: Set the workspace path
set "WORK_DIR=c:\Users\barca2\.gemini\antigravity\playground\drifting-magnetosphere\caanma"
cd /d "%WORK_DIR%"

:: Set NODE_PATH so Prisma resolves correctly
set NODE_PATH=%WORK_DIR%\node_modules

:loop
echo ==========================================================
echo [%date% %time%] Starting WhatsApp Microservice...
echo ==========================================================

C:\PROGRA~1\nodejs\node.exe whatsapp-service\index.js >> whatsapp_service_output.log 2>&1

echo ----------------------------------------------------------
echo [WARNING] WhatsApp Microservice stopped or crashed with exit code %errorlevel%.
echo Auto-restarting in 10 seconds...
echo ----------------------------------------------------------
timeout /t 10 /nobreak >nul
goto loop
