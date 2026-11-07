@echo off
chcp 65001 >nul
setlocal
set "ELECTRON_RUN_AS_NODE="
if exist "%~dp0release\win-unpacked\留白.exe" (
  start "" "%~dp0release\win-unpacked\留白.exe"
  exit /b
)
if exist "%~dp0release\Liubai-1.0.2-Windows.exe" (
  start "" "%~dp0release\Liubai-1.0.2-Windows.exe"
  exit /b
)
echo 尚未找到桌面程序，请先在项目目录运行 npm run dist。
pause
