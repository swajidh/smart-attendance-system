param(
  [int]$Port = 8000
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$venvPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$alembicIni = Join-Path $backendDir "alembic.ini"
$requirements = Join-Path $backendDir "requirements.txt"

if (!(Test-Path $venvPython)) {
  throw "Backend venv not found at $venvPython. Create it first."
}

Write-Host "Installing backend dependencies..."
& $venvPython -m pip install -r $requirements

Write-Host "Running migrations..."
Push-Location $backendDir
& $venvPython -m alembic -c $alembicIni upgrade head

Write-Host "Starting backend on port $Port..."
& $venvPython -m uvicorn app.main:app --host 0.0.0.0 --port $Port
Pop-Location
