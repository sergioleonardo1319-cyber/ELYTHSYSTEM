@echo off
setlocal

set "PROJECT_ROOT=%~dp0"
set "POSTGRES_EXE=%PROJECT_ROOT%.postgres-runtime\bin\postgres.exe"
set "DATA_DIR=C:\Program Files\PostgreSQL\11\data"
set "PID_FILE=%DATA_DIR%\postmaster.pid"
set "LOG_OUT=%PROJECT_ROOT%postgres-local.out.log"
set "LOG_ERR=%PROJECT_ROOT%postgres-local.err.log"

netstat -ano | findstr ":5432" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo PostgreSQL ya esta escuchando en el puerto 5432.
  pause
  exit /b 0
)

if exist "%PID_FILE%" (
  set /p PG_PID=<"%PID_FILE%"
  tasklist /FI "PID eq %PG_PID%" | findstr "%PG_PID%" >nul
  if errorlevel 1 (
    echo Eliminando postmaster.pid viejo...
    del /F "%PID_FILE%"
  )
)

if not exist "%POSTGRES_EXE%" (
  echo No existe postgres.exe en:
  echo %POSTGRES_EXE%
  pause
  exit /b 1
)

echo Iniciando PostgreSQL local en puerto 5432...
start "PostgreSQL Local" /min cmd /c ""%POSTGRES_EXE%" -D "%DATA_DIR%" -p 5432 > "%LOG_OUT%" 2> "%LOG_ERR%""

timeout /t 3 /nobreak >nul

netstat -ano | findstr ":5432" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo PostgreSQL iniciado correctamente en puerto 5432.
  pause
  exit /b 0
)

echo No se detecto PostgreSQL en 5432.
echo Revisa el archivo:
echo %LOG_ERR%
pause
exit /b 1
