# REST & WebSocket API Reference

Base URL: `http://localhost:8000/api`

---

## 1. Authentication Endpoints

### Login (JSON)
- **POST** `/auth/login/json`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "Admin123!"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@orchestrator.local",
      "role": "ADMIN"
    }
  }
  ```

### Get Current User Profile
- **GET** `/auth/me`
- **Headers**: `Authorization: Bearer <access_token>`

---

## 2. GitHub Integration

### List Accessible Repositories
- **GET** `/github/repositories`
- **Headers**: `Authorization: Bearer <access_token>`

### List Branches
- **GET** `/github/repositories/{owner}/{repo}/branches`

### List Files / Entry Points
- **GET** `/github/repositories/{owner}/{repo}/files?branch=main&path=`

### Connect GitHub Personal Access Token
- **POST** `/github/connect-token`
- **Request Body**:
  ```json
  {
    "token": "ghp_xxxxxxxxxxxxxxxxxxxx",
    "name": "Production GitHub PAT"
  }
  ```

---

## 3. Machine Management

### List Machines
- **GET** `/machines`
- Returns all registered machines with live CPU, RAM, Disk, and status.

### Generate Machine Registration Token
- **POST** `/machines/generate-token`
- **Request Body**:
  ```json
  {
    "machine_name": "Machine-A"
  }
  ```
- **Response**:
  ```json
  {
    "machine_name": "Machine-A",
    "registration_token": "a1b2c3d4e5f6...",
    "expires_in_hours": 24
  }
  ```

### Enable / Disable Machine
- **POST** `/machines/{machine_id}/enable`
- **POST** `/machines/{machine_id}/disable`

---

## 4. Job Management

### Create & Dispatch Job
- **POST** `/jobs`
- **Request Body**:
  ```json
  {
    "repository_name": "invoice-automation",
    "repository_url": "https://github.com/company/invoice-automation",
    "branch": "main",
    "entry_point": "main.py",
    "machine_id": "MACH-1024",
    "parameters": ["--environment", "production", "--date", "2026-08-14"],
    "environment_variables": {
      "API_ENV": "production"
    },
    "timeout_seconds": 1800,
    "max_retries": 1
  }
  ```

### Get Job Details
- **GET** `/jobs/{job_id}`

### Stop / Cancel Job
- **POST** `/jobs/{job_id}/cancel`

### Retry Job
- **POST** `/jobs/{job_id}/retry` (uses exact original commit)
- **POST** `/jobs/{job_id}/run-latest` (fetches latest commit)

---

## 5. Agent Outbound API

*(Called only by worker Machine Agents)*

### Register Agent
- **POST** `/agent/register`
- **Body**: `{ "registration_token": "...", "machine_name": "...", "hostname": "...", ... }`
- **Response**: `{ "machine_id": "MACH-1024", "agent_token": "secret_token_..." }`

### Send Heartbeat Beacon
- **POST** `/agent/heartbeat`
- **Headers**:
  - `X-Machine-Id: MACH-1024`
  - `X-Agent-Token: secret_token_...`
- **Body**: `{ "status": "ONLINE", "cpu_usage": 25.0, "memory_usage": 40.0, ... }`

### Poll Assigned Jobs
- **GET** `/agent/jobs`
- **Headers**: `X-Machine-Id`, `X-Agent-Token`
- Returns: `200 OK` with Job payload or `204 No Content`

### Stream Real-Time Logs
- **POST** `/agent/jobs/{job_id}/logs`
- **Body**: `{ "logs": [ { "level": "INFO", "message": "Starting main.py..." } ] }`

### Report Completion
- **POST** `/agent/jobs/{job_id}/complete`
- **Body**: `{ "status": "SUCCESS", "exit_code": 0, "commit_sha": "..." }`

---

## 6. WebSockets

- **Job Live Stream**: `ws://localhost:8000/ws/jobs/{job_id}`
- **Machine Fleet Stream**: `ws://localhost:8000/ws/machines`
- **Global Event Stream**: `ws://localhost:8000/ws/global`
