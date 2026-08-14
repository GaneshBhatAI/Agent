# Troubleshooting & Diagnostic Guide

## 1. Machine Agent Shows "OFFLINE"

### Symptoms
- Machine status badge is grey/OFFLINE in the Control Room.
- Jobs assigned to the machine remain in `QUEUED` status.

### Diagnostic Steps
1. Verify the Agent process is running on the worker machine:
   ```powershell
   Get-Process -Name python | Where-Object { $_.Path -like "*PythonOrchestratorAgent*" }
   ```
2. Verify outbound network connectivity from the agent to the Central Control Room URL:
   ```powershell
   Test-NetConnection -ComputerName "localhost" -Port 8000
   ```
3. Check the heartbeat interval: by default, agents beacon every 15s. If no heartbeat is received in 45s, the machine is automatically marked `OFFLINE`.

---

## 2. Job Fails with "Dependency Installation Failed"

### Symptoms
- Job status changes to `FAILED` with `Error Type: INFRASTRUCTURE_ERROR` or `APPLICATION_ERROR`.
- Terminal logs show `pip install -r requirements.txt` non-zero exit code.

### Diagnostic Steps
1. Inspect the terminal log output in the Job Details view.
2. Check if a required C-extension or compiler (e.g., MSVC Build Tools) is required by a specific pip package (e.g. `pyodbc`, `psycopg2`).
3. Verify internet connectivity on the worker node to reach PyPI (`https://pypi.org`).

---

## 3. Git Clone / Authentication Failures

### Symptoms
- Log shows `Git operation failed: Repository not found or access denied`.

### Diagnostic Steps
1. If accessing private GitHub repositories, ensure a valid GitHub Personal Access Token is saved in **Control Room → Repositories → Connect Token** or **Credentials**.
2. Verify that the token has `repo` (read access) scopes.
3. Ensure Git CLI is installed and available in the worker machine's `PATH`.

---

## 4. Port Conflict on Startup

### Symptoms
- `uvicorn` fails with `[Errno 10048] error while attempting to bind on address ('0.0.0.0', 8000)`.

### Resolution
- Find the conflicting process or run on an alternate port:
  ```bash
  uvicorn app.main:app --port 8080
  ```
- Update `CENTRAL_URL=http://localhost:8080` in `.env` accordingly.
