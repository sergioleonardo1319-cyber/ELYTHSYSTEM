@echo off
setlocal
cd /d "%~dp0.."
node scripts\backup-database.js --env sandbox
