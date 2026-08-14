# Windows Agent Installation & Deployment Guide

The **Python Orchestrator Agent** is designed Windows-first to execute Python applications from GitHub in isolated environments without installing dependencies globally.

---

## 1. Prerequisites on Windows Worker

- **Windows 10 / 11 / Windows Server 2016+**
- **Python 3.10+** (Ensure "Add Python to PATH" is checked during installation)
- **PowerShell 5.1+** (Built-in on Windows)
- *(Optional)* **Git for Windows** (If absent, demo repository execution will operate seamlessly)

---

## 2. Automated PowerShell Installation

1. Open PowerShell on the target Windows machine.
2. Navigate to the agent installer directory:
   ```powershell
   cd python-orchestrator\agent\installer
   ```
3. Run the installer script with your Control Room URL and Registration Token:
   ```powershell
   .\install_agent.ps1 -CentralUrl "http://orchestrator.company.com" -MachineName "Machine-A" -RegistrationToken "YOUR_REGISTRATION_TOKEN"
   ```

The script will automatically:
1. Create `C:\PythonOrchestratorAgent` and workspace directories `C:\PythonOrchestrator\jobs` & `C:\PythonOrchestrator\environments`.
2. Build a dedicated agent virtual environment (`C:\PythonOrchestratorAgent\venv`).
3. Install agent runtime dependencies (`httpx`, `psutil`, `pydantic`).
4. Perform the secure registration handshake with the Control Room.
5. Save the unique `machine_id` and secret `agent_token`.

---

## 3. Starting the Agent

### Method 1: Foreground Interactive Run
```powershell
.\start_agent.ps1
```

### Method 2: Windows Background Service (NSSM)
To keep the agent running in the background across reboots:

```powershell
# Open Administrator PowerShell
nssm install PythonOrchestratorAgent C:\PythonOrchestratorAgent\venv\Scripts\python.exe agent.py
nssm set PythonOrchestratorAgent AppDirectory C:\PythonOrchestratorAgent
nssm set PythonOrchestratorAgent Start SERVICE_AUTO_START
Start-Service PythonOrchestratorAgent
```

---

## 4. Stopping and Uninstalling

To stop the agent:
```powershell
.\stop_agent.ps1
```

To completely remove the agent:
```powershell
.\uninstall_agent.ps1
```
