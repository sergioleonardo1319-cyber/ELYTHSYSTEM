@echo off
setlocal
cd /d "%~dp0.."

call scripts\sync-android-sandbox.cmd
if errorlevel 1 exit /b 1

cd android
call gradlew.bat assembleDebug
