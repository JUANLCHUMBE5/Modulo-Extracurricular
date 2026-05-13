@echo off
set "PATH=%~dp0.tools\node-v24.15.0-win-x64;%PATH%"
start "Excel API" /min npm.cmd run api
npm.cmd run dev -- --host 127.0.0.1
