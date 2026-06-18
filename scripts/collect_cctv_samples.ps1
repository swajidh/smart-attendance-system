# collect_cctv_samples.ps1 — Windows PowerShell wrapper for collect_cctv_samples.py
# Usage: .\scripts\collect_cctv_samples.ps1 -StudentId STU-001 -Name "Ali Hamza"
param(
    [Parameter(Mandatory=$true)][string]$StudentId,
    [Parameter(Mandatory=$true)][string]$Name,
    [string]$Source = "0",
    [string]$OutputDir = "",
    [int]$Count = 50,
    [int]$EveryNFrames = 15,
    [int]$Quality = 95
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = Split-Path -Parent $ScriptDir

Push-Location $RepoRoot
try {
    $args_list = @(
        "scripts\collect_cctv_samples.py",
        "--student-id", $StudentId,
        "--name", $Name,
        "--source", $Source,
        "--count", $Count,
        "--every-n-frames", $EveryNFrames,
        "--quality", $Quality
    )
    if ($OutputDir -ne "") {
        $args_list += @("--output-dir", $OutputDir)
    }
    python @args_list
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Collection failed with exit code $LASTEXITCODE"
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
