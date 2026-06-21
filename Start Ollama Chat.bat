@echo off
setlocal
cd /d "%~dp0"

echo Starting Ollama Chat...
call npm run restart-and-test
if errorlevel 1 (
  echo Setup failed. Try: npm run setup:full
  pause
  exit /b 1
)

echo.
echo Opening https://localhost:3443
start https://localhost:3443

echo.
echo Server is running. Press any key to stop...
pause >nul

call npm run stop
echo Stopped.