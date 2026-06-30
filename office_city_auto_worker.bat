@echo off
title Office City Auto Worker (Images and Descriptions)

echo ==========================================================
echo   OFFICE CITY AUTO WORKER (RESILIENT PIPELINE)
echo ==========================================================
echo This worker automatically resumes and continues downloading
echo images and generating descriptions. It is self-healing,
echo idempotent, and survives internet outages and restarts.
echo ==========================================================

:: Set the workspace path
set "WORK_DIR=c:\Users\barca2\.gemini\antigravity\playground\drifting-magnetosphere\caanma"
cd /d "%WORK_DIR%"

:: Set NODE_PATH so Prisma can be resolved
set NODE_PATH=%WORK_DIR%\node_modules

:loop
echo ==========================================================
echo [%date% %time%] Checking connection and resuming process...
echo ==========================================================

:: Check internet connection by pinging a public DNS (8.8.8.8)
ping -n 1 8.8.8.8 >nul
if %errorlevel% neq 0 (
    echo [WARNING] No internet connection detected. Retrying in 1 minute...
    timeout /t 60 /nobreak >nul
    goto loop
)

echo [OK] Internet connection is active.

echo ----------------------------------------------------------
echo 1. Syncing local image cache with database...
C:\PROGRA~1\nodejs\node.exe scratch_import_office_city_images.js --sync-only

echo ----------------------------------------------------------
echo 2. Checking and generating missing AI descriptions...
C:\PROGRA~1\nodejs\node.exe scratch_generate_office_city_descriptions.js --limit 100

echo ----------------------------------------------------------
echo 3. Crawling and downloading missing images (Batch of 150)...
C:\PROGRA~1\nodejs\node.exe scratch_import_office_city_images.js --crawl 150

echo ----------------------------------------------------------
echo [%date% %time%] Batch completed successfully. Sleeping for 30 minutes...
timeout /t 1800 /nobreak >nul
goto loop
