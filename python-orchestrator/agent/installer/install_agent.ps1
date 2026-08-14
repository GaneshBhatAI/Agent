# ==============================================================================
# Python GitHub Orchestrator - Windows Agent Installer
# ==============================================================================
# Usage:
#   .\install_agent.ps1 -CentralUrl "http://localhost:8000" -MachineName "Machine-A" -RegistrationToken "xxxxxxxx"
# ==============================================================================

param (
    [string]$CentralUrl = "http://localhost:8000",
    [string]$MachineName = "Machine-A",
    [string]$RegistrationToken = "",
    [string]$InstallDir = "C:\PythonOrchestratorAgent",
    [string]$WorkspaceDir = "C:\PythonOrchestrator"
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Installing Python GitHub Orchestrator Machine Agent    " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Check Python installed
$pythonExe = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonExe) {
    Write-Host "ERROR: Python is not found in PATH. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

$pyVer = & python --version
Write-Host "Detected Python: $pyVer ($pythonExe)" -ForegroundColor Green

# Create installation & workspace directories
Write-Host "Creating target directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path "$WorkspaceDir\jobs" | Out-Null
New-Item -ItemType Directory -Force -Path "$WorkspaceDir\environments" | Out-Null

# Copy agent files to InstallDir
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentSourceDir = Split-Path -Parent $scriptDir

Write-Host "Deploying agent files to $InstallDir..." -ForegroundColor Yellow
Copy-Item -Path "$agentSourceDir\*" -Destination $InstallDir -Recurse -Force -Exclude "installer"

# Setup dedicated Agent Python Virtualenv
Write-Host "Creating dedicated agent runtime virtual environment..." -ForegroundColor Yellow
$agentVenvDir = "$InstallDir\venv"
& python -m venv $agentVenvDir

$agentPip = "$agentVenvDir\Scripts\pip.exe"
$agentPython = "$agentVenvDir\Scripts\python.exe"

Write-Host "Installing Agent dependencies..." -ForegroundColor Yellow
& $agentPip install --upgrade pip
& $agentPip install -r "$InstallDir\requirements.txt"

# Create .env config
$envFile = "$InstallDir\.env"
@"
CENTRAL_URL=$CentralUrl
MACHINE_NAME=$MachineName
REGISTRATION_TOKEN=$RegistrationToken
WORKSPACE_BASE=$WorkspaceDir
"@ | Set-Content -Path $envFile -Encoding UTF8

Write-Host "`nConfiguration written to $envFile" -ForegroundColor Green

# Register machine if token provided
if ($RegistrationToken -ne "") {
    Write-Host "Registering machine with Central Orchestrator ($CentralUrl)..." -ForegroundColor Yellow
    Set-Location $InstallDir
    & $agentPython agent.py --central-url "$CentralUrl" --machine-name "$MachineName" --token "$RegistrationToken"
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Agent Installation Completed Successfully!            " -ForegroundColor Green
Write-Host "  Location: $InstallDir                                  " -ForegroundColor Green
Write-Host "  To run:   cd $InstallDir; .\venv\Scripts\python agent.py" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
