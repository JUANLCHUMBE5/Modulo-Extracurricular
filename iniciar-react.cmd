@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
cd /d "%~dp0"

echo Iniciando Modulo Extracurricular...
echo.
echo URL de la app:
echo   http://127.0.0.1:5173
echo.
echo El API local se inicia en segundo plano. No necesitas abrirlo.
echo.

start "API Local - Modulo Extracurricular" /min npm.cmd run api
start "Abrir Modulo Extracurricular" cmd /c "timeout /t 3 >nul && start http://127.0.0.1:5173"
npm.cmd run dev -- --host 127.0.0.1
