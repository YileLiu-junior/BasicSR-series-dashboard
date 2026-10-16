@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================
echo   BasicLLIE workbench  ->  http://localhost:8765
echo   (browser will open automatically, Ctrl-C to stop)
echo ==============================================
start "" cmd /c "timeout /t 2 >nul && start "" http://localhost:8765"
node tools/server.mjs
pause
