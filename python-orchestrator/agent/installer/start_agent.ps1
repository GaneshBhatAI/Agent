# Start Python Orchestrator Agent
param (
    [string]$InstallDir = "C:\PythonOrchestratorAgent"
)

if (-not (Test-Path "$InstallDir\venv\Scripts\python.exe")) {
    Write-Host "Agent not installed in $InstallDir. Please run install_agent.ps1 first." -ForegroundColor Red
    exit 1
}

Set-Location $InstallDir
Write-Host "Starting Python Orchestrator Agent..." -ForegroundColor Green
& "$InstallDir\venv\Scripts\python.exe" agent.py
