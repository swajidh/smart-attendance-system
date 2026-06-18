# backup_db.ps1 — Windows PowerShell wrapper for backup_db.py
# Usage: .\scripts\backup_db.ps1 [-OutputDir .\backups] [-Keep 7]
param(
    [string]$OutputDir = ".\backups",
    [int]$Keep = 7
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir

Push-Location $RepoRoot
try {
    python scripts\backup_db.py --output-dir "$OutputDir" --keep $Keep
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backup failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
