@echo off
cd /d "%~dp0"
echo Starting Sena Lab...
echo.

set "CODEX_NODE=%LOCALAPPDATA%\OpenAI\Codex\bin\node.exe"

where node >nul 2>nul
if %errorlevel%==0 (
  echo Open this address in your browser:
  echo http://127.0.0.1:5173
  echo.
  node server.js
  pause
  exit /b
)

if exist "%CODEX_NODE%" (
  echo Open this address in your browser:
  echo http://127.0.0.1:5173
  echo.
  "%CODEX_NODE%" server.js
  pause
  exit /b
)

echo Node.js was not found, so the app will open directly as a local file.
echo.
start "" "%~dp0index.html"
pause
