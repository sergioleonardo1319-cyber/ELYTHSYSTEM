@echo off
setlocal
cd /d "%~dp0.."

call node scripts\set-capacitor-env.js sandbox
if errorlevel 1 exit /b 1

call npm.cmd run build:sandbox
if errorlevel 1 exit /b 1

call npx.cmd cap sync android
