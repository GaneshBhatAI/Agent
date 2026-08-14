# Running Machine Agent as a Windows Background Service

To ensure the Machine Agent remains online and automatically resumes on system reboot without requiring an active user desktop session, you can run it as a Windows Service using **NSSM (Non-Sucking Service Manager)** or **Windows Task Scheduler**.

---

## Method 1: NSSM (Recommended for Enterprise)

### 1. Download NSSM
Download `nssm.exe` from [https://nssm.cc/download](https://nssm.cc/download) and place it in `C:\PythonOrchestratorAgent\nssm.exe` (or in PATH).

### 2. Install the Service
Open PowerShell as **Administrator** and run:

```powershell
$nssm = "C:\PythonOrchestratorAgent\nssm.exe"
$python = "C:\PythonOrchestratorAgent\venv\Scripts\python.exe"
$appDir = "C:\PythonOrchestratorAgent"

# Install service
& $nssm install PythonOrchestratorAgent $python agent.py
& $nssm set PythonOrchestratorAgent AppDirectory $appDir
& $nssm set PythonOrchestratorAgent DisplayName "Python Orchestrator Machine Agent"
& $nssm set PythonOrchestratorAgent Description "Outbound worker agent for executing Python jobs from GitHub Orchestrator"
& $nssm set PythonOrchestratorAgent Start SERVICE_AUTO_START

# Configure automatic restarts
& $nssm set PythonOrchestratorAgent AppRestartDelay 5000

# Start the service
Start-Service PythonOrchestratorAgent
```

### 3. Verify Status
```powershell
Get-Service PythonOrchestratorAgent
```

---

## Method 2: Windows Task Scheduler (No Extra Downloads Required)

If you cannot install third-party utilities, use Windows Task Scheduler to start the Agent automatically at system startup:

```powershell
$action = New-ScheduledTaskAction `
    -Execute "C:\PythonOrchestratorAgent\venv\Scripts\python.exe" `
    -Argument "agent.py" `
    -WorkingDirectory "C:\PythonOrchestratorAgent"

$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask `
    -TaskName "PythonOrchestratorAgent" `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Description "Starts Python Orchestrator Agent at boot"

Start-ScheduledTask -TaskName "PythonOrchestratorAgent"
```
