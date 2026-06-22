param(
  [string]$AppEnv = $env:APP_ENV,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

function Import-EnvFile {
  param(
    [string]$Path,
    [bool]$Override = $false
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      return
    }

    $separator = $line.IndexOf("=")
    $key = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($Override -or -not [Environment]::GetEnvironmentVariable($key, "Process")) {
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }
}

if (-not $AppEnv) {
  $AppEnv = "development"
}

Import-EnvFile -Path (Join-Path $ProjectRoot ".env")
Import-EnvFile -Path (Join-Path $ProjectRoot ".env.$AppEnv") -Override $true

$dbHost = $env:DB_HOST
$dbPort = $env:DB_PORT
$dbName = $env:DB_NAME
$dbUser = $env:DB_USER
$dbPassword = $env:DB_PASSWORD
$backupDir = $env:BACKUP_DIR
$retentionDays = [int]($env:BACKUP_RETENTION_DAYS -as [int])
$pgDumpPath = $env:PG_DUMP_PATH

if (-not $dbHost) { $dbHost = "127.0.0.1" }
if (-not $dbPort) { $dbPort = "5432" }
if (-not $dbName) { throw "DB_NAME no esta configurado." }
if (-not $dbUser) { $dbUser = "postgres" }
if (-not $backupDir) { $backupDir = "backups" }
if ($retentionDays -le 0) { $retentionDays = 30 }
if (-not $pgDumpPath) { $pgDumpPath = "pg_dump" }

if (-not [System.IO.Path]::IsPathRooted($backupDir)) {
  $backupDir = Join-Path $ProjectRoot $backupDir
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDir "$dbName-$AppEnv-$timestamp.backup"

Write-Host "Ambiente: $AppEnv"
Write-Host "Base de datos: $dbName en $dbHost`:$dbPort"
Write-Host "Destino: $backupFile"

if ($DryRun) {
  Write-Host "DryRun activo: no se creara archivo de respaldo."
  exit 0
}

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

$env:PGPASSWORD = $dbPassword

& $pgDumpPath `
  -h $dbHost `
  -p $dbPort `
  -U $dbUser `
  -F c `
  -b `
  -v `
  -f $backupFile `
  $dbName

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump termino con error $LASTEXITCODE."
}

$cutoff = (Get-Date).AddDays(-$retentionDays)
Get-ChildItem -LiteralPath $backupDir -Filter "*.backup" -File |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Host "Backup creado correctamente."
