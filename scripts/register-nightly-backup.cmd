@echo off
setlocal

set "APP_ENV_ARG=%~1"
set "BACKUP_TIME=%~2"

if "%APP_ENV_ARG%"=="" set "APP_ENV_ARG=development"
if "%BACKUP_TIME%"=="" set "BACKUP_TIME=02:00"

set "PROJECT_ROOT=%~dp0.."
set "TASK_NAME=Cafeteria POS Backup Nocturno"
set "BACKUP_CMD=%PROJECT_ROOT%\scripts\backup-development.cmd"

if /I "%APP_ENV_ARG%"=="sandbox" set "BACKUP_CMD=%PROJECT_ROOT%\scripts\backup-sandbox.cmd"

schtasks /Create /TN "%TASK_NAME%" /TR "%BACKUP_CMD%" /SC DAILY /ST %BACKUP_TIME% /F

if not "%ERRORLEVEL%"=="0" (
  echo No fue posible registrar la tarea. Ejecuta este archivo como administrador.
  exit /b 1
)

echo Tarea registrada: %TASK_NAME% todos los dias a las %BACKUP_TIME%.
