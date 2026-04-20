param(
  [int]$CameraIndex = 0,
  [string]$BackendUrl = "http://localhost:8000/api/v1/mark-attendance",
  [string]$YoloModelPath = "",
  [string]$YoloDevice = "0",
  [string]$ModelName = "Facenet512",
  [string]$DetectorBackend = "skip",
  [double]$SimilarityThreshold = 0.60,
  [double]$MinSimilarityGap = 0.03,
  [double]$FrameScale = 1.0,
  [int]$InferenceEveryNFrames = 2,
  [int]$MaxFacesPerFrame = 2,
  [double]$RecognitionCooldownSeconds = 0.8,
  [switch]$AdaptiveRecognitionCooldown,
  [double]$MultiFaceRecognitionCooldownSeconds = 0.25,
  [switch]$LivenessEnabled,
  [switch]$UnknownSaveEnabled
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$mlDir = Join-Path $repoRoot "ml"
$mlPython = Join-Path $mlDir ".venv\Scripts\python.exe"
$requirements = Join-Path $mlDir "requirements.txt"
$inferenceScript = Join-Path $repoRoot "ml\src\inference\main.py"
$knownFacesPath = Join-Path $repoRoot "ml\src\config\known_faces.pkl"
if ([string]::IsNullOrWhiteSpace($YoloModelPath)) {
  $YoloModelPath = Join-Path $repoRoot "yolov8n-face-lindevs.pt"
}

if (!(Test-Path $mlPython)) {
  throw "ML venv not found at $mlPython. Create it first."
}
if (!(Test-Path $knownFacesPath)) {
  throw "Known faces index not found at $knownFacesPath. Run encoder first."
}
if (!(Test-Path $YoloModelPath)) {
  throw "YOLO face model not found at $YoloModelPath. Download it or pass -YoloModelPath."
}

Write-Host "Installing ML dependencies..."
& $mlPython -m pip install -r $requirements

$argsList = @(
  $inferenceScript,
  "--camera-index", $CameraIndex,
  "--display",
  "--backend-url", $BackendUrl,
  "--yolo-model", $YoloModelPath,
  "--yolo-device", $YoloDevice,
  "--known-faces", $knownFacesPath,
  "--model-name", $ModelName,
  "--detector-backend", $DetectorBackend,
  "--similarity-threshold", $SimilarityThreshold,
  "--min-similarity-gap", $MinSimilarityGap,
  "--frame-scale", $FrameScale,
  "--inference-every-n-frames", $InferenceEveryNFrames,
  "--max-faces-per-frame", $MaxFacesPerFrame,
  "--recognition-cooldown-seconds", $RecognitionCooldownSeconds,
  "--multi-face-recognition-cooldown-seconds", $MultiFaceRecognitionCooldownSeconds
)

if ($LivenessEnabled) {
  $argsList += "--liveness-enabled"
}
if ($AdaptiveRecognitionCooldown) {
  $argsList += "--adaptive-recognition-cooldown"
}
if ($UnknownSaveEnabled) {
  $argsList += "--unknown-save-enabled"
}

Write-Host "Starting ML demo..."
& $mlPython @argsList
