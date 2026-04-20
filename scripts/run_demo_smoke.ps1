param(
  [string]$BackendBaseUrl = "http://localhost:8000"
)

Write-Host "Smoke check: backend + API readiness"

$healthUri = "$BackendBaseUrl/health"
$todayUri = "$BackendBaseUrl/api/v1/attendance/today"

try {
  $health = Invoke-RestMethod -Method Get -Uri $healthUri
  Write-Host "Health response: $($health.status)"
} catch {
  Write-Host "Health check failed: $($_.Exception.Message)"
  exit 1
}

try {
  $today = Invoke-RestMethod -Method Get -Uri $todayUri
  Write-Host "Attendance endpoint reachable. success=$($today.success)"
} catch {
  Write-Host "Attendance endpoint failed: $($_.Exception.Message)"
  exit 1
}

Write-Host "Smoke check passed. Start inference manually:"
Write-Host "  ./scripts/run_ml_demo.ps1"
