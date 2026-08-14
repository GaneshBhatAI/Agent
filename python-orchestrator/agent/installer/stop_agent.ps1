# Stop Python Orchestrator Agent
Write-Host "Stopping Python Orchestrator Agent process..." -ForegroundColor Yellow

$processes = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*PythonOrchestratorAgent*" -or $_.CommandLine -like "*agent.py*"
}

if ($processes) {
    foreach ($p in $processes) {
        Write-Host "Terminating Process ID: $($p.Id)..." -ForegroundColor Yellow
        Stop-Process -Id $p.Id -Force
    }
    Write-Host "Agent processes stopped successfully." -ForegroundColor Green
} else {
    Write-Host "No active Agent processes found." -ForegroundColor Yellow
}
