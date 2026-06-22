param(
  [string]$TaskName = "Cafeteria POS Backup Nocturno",
  [string]$AppEnv = "development",
  [string]$Time = "02:00"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$BackupScript = Join-Path $ProjectRoot "scripts\backup-database.ps1"

if (-not (Test-Path -LiteralPath $BackupScript)) {
  throw "No se encontro $BackupScript"
}

$action = New-ScheduledTaskAction `
  -Execute "powershell.exe" `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$BackupScript`" -AppEnv $AppEnv"

$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Backup nocturno de PostgreSQL para Cafeteria POS ($AppEnv)." `
  -Force | Out-Null

Write-Host "Tarea registrada: $TaskName todos los dias a las $Time."
