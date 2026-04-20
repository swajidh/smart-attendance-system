param(
  [string]$BackendBaseUrl = "http://localhost:8000"
)

$uri = "$BackendBaseUrl/api/v1/attendance/today"
Write-Host "Fetching attendance from: $uri"

try {
  $resp = Invoke-RestMethod -Method Get -Uri $uri -ContentType "application/json"
  Write-Host "Success: $($resp.success)"

  if ($resp.success -and $resp.data -and $resp.data.items) {
    Write-Host "Present students today:"
    foreach ($item in $resp.data.items) {
      Write-Host ("- {0} ({1}) marked_at={2}" -f $item.student_id, $item.name, $item.marked_at)
    }
  } else {
    Write-Host "No attendance items or API returned an error envelope."
  }
} catch {
  Write-Host "Failed to fetch attendance: $($_.Exception.Message)"
  exit 1
}
