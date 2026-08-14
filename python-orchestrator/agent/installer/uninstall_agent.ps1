# Uninstall Python Orchestrator Agent
param (
    [string]$InstallDir = "C:\PythonOrchestratorAgent",
    [string]$WorkspaceDir = "C:\PythonOrchestrator",
    [switch]$KeepWorkspaces
)

Write-Host "Stopping any running agent..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptDir\stop_agent.ps1"

Write-Host "Removing agent installation directory: $InstallDir..." -ForegroundColor Yellow
if (Test-Path $InstallDir) {
    Remove-Item -Path $InstallDir -Recurse -Force
}

if (-not $KeepWorkspaces -and (Test-Path $WorkspaceDir)) {
    Write-Host "Removing workspaces directory: $WorkspaceDir..." -ForegroundColor Yellow
    Remove-Item -Path $WorkspaceDir -Recurse -Force
}

Write-Host "Machine Agent uninstalled successfully." -ForegroundColor Green
