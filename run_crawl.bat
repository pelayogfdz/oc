@echo off
:: run_crawl.bat
:: Robust launcher for the Office City crawler cron job
:: This sets the correct directory, environment, and Node paths automatically.

set "WORK_DIR=c:\Users\barca2\.gemini\antigravity\playground\drifting-magnetosphere\caanma"
cd /d "%WORK_DIR%"

:: Set NODE_PATH so Prisma resolves correctly
set NODE_PATH=%WORK_DIR%\node_modules

:: Run the crawler script
C:\PROGRA~1\nodejs\node.exe scratch_import_office_city_images.js --crawl 150
