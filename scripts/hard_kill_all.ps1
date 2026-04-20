param(
    [switch]$IncludeAllPython
)

$ErrorActionPreference = "Continue"

Write-Host "Hard kill started..." -ForegroundColor Yellow

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectRootLower = $projectRoot.ToLowerInvariant()

$killed = New-Object System.Collections.Generic.List[object]

function Stop-ByPid {
    param(
        [int]$ProcessId,
        [string]$Reason
    )

    try {
        taskkill /F /T /PID $ProcessId | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $killed.Add([PSCustomObject]@{
                Pid = $ProcessId
                Reason = $Reason
            }) | Out-Null
            Write-Host "Killed PID $ProcessId ($Reason)" -ForegroundColor Green
        } else {
            Write-Warning "PID $ProcessId was not terminated (exit code $LASTEXITCODE)."
        }
    } catch {
        Write-Warning "Failed to kill PID $ProcessId ($Reason): $($_.Exception.Message)"
    }
}

# 1) Kill by command-line signature (backend + ML scripts + uvicorn).
$targets = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match 'python|uvicorn|py\.exe' -and
    (
        ($_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains("smart-attendance-system")) -or
        ($_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains("run_ml_demo.ps1")) -or
        ($_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains("start_backend.ps1")) -or
        ($_.CommandLine -and $_.CommandLine.ToLowerInvariant().Contains("uvicorn"))
    )
}

foreach ($proc in $targets) {
    Stop-ByPid -ProcessId $proc.ProcessId -Reason "project process"
}

# 2) Optional: kill all Python on machine (useful when camera remains locked).
if ($IncludeAllPython) {
    Write-Host "IncludeAllPython enabled: killing all python/py/uvicorn processes..." -ForegroundColor Yellow
    foreach ($name in @("python.exe", "pythonw.exe", "py.exe", "uvicorn.exe")) {
        try {
            taskkill /F /IM $name | Out-Null
            Write-Host "Killed image $name" -ForegroundColor Green
        } catch {
            # Ignore not found; continue.
        }
    }
}

Start-Sleep -Seconds 1

# 3) Verify leftovers tied to this repo.
$remaining = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -match 'python|uvicorn|py\.exe' -and
    $_.CommandLine -and
    $_.CommandLine.ToLowerInvariant().Contains($projectRootLower)
}

if ($remaining) {
    Write-Warning "Some project-related processes are still running:"
    $remaining | Select-Object ProcessId, Name, CommandLine | Format-Table -AutoSize
} else {
    Write-Host "All project-related processes were stopped." -ForegroundColor Cyan
}

if ($killed.Count -gt 0) {
    Write-Host ""
    Write-Host "Killed process summary:" -ForegroundColor Cyan
    $killed | Format-Table -AutoSize
}
