# Python GitHub Orchestrator & Control Room

> **Enterprise-grade, self-hosted RPA Control Room designed specifically to execute Python applications and scripts directly from GitHub repositories on registered Windows worker machines in fully isolated environments.**

---

## Key Features

- 🖥️ **Central Web-Based Control Room**: Sleek dark-mode dashboard with real-time hardware telemetry and job management.
- 🐙 **GitHub Integration**: Repository discovery, branch selection, commit SHA resolution, and visual file tree explorer for Python entry points.
- 🤖 **Lightweight Windows Machine Agent**: Outbound-only communication (HTTPS & WebSockets), zero inbound firewall ports required.
- 📦 **Zero Global Dependency Pollution**: Dedicated isolated virtual environments (`venv`) created dynamically per job with automatic `requirements.txt` / `pyproject.toml` dependency installation.
- ⚡ **Real-Time Execution Logs**: Sub-second stdout/stderr log streaming to an interactive in-browser terminal console.
- ⏱️ **Job Scheduling**: Built-in APScheduler supporting flexible Cron expressions and interval triggers.
- 🛡️ **Enterprise Security**: AES-256 encrypted credential vault, HMAC token machine authentication, path traversal guards, and automatic secret masking in logs.
- 🚫 **No GitHub Actions Runners Required**: 100% self-hosted, sovereign execution on your own physical or virtual infrastructure.

---

## Monorepo Structure

```
python-orchestrator/
├── backend/                  # FastAPI Central Orchestrator & APIs
│   ├── app/
│   │   ├── api/             # REST routes (auth, github, machines, jobs, schedules, agent)
│   │   ├── models/          # SQLAlchemy async models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Business logic, GitHub client, Scheduler, Machine & Job services
│   │   ├── websocket/       # Real-time WebSocket connection manager
│   │   ├── config.py        # Central settings & env config
│   │   ├── database.py      # Async DB engine & session lifecycle
│   │   └── main.py          # FastAPI application entry point
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind CSS Control Room UI
│   ├── src/
│   │   ├── components/      # StatusBadge, MetricCard, TerminalViewer, Modals, FileExplorer
│   │   ├── pages/           # Dashboard, Machines, Repositories, Jobs, JobDetails, Schedules, etc.
│   │   ├── services/        # API client, Auth, WebSocket client
│   │   └── types/           # TypeScript interfaces & types
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── agent/                    # Python Machine Agent (Windows-first)
│   ├── agent.py             # Agent entry point & main polling loop
│   ├── config.py            # Machine configuration & workspace paths
│   ├── system_info.py       # Hardware CPU/RAM/Disk metrics collector
│   ├── registration.py      # Registration handshake & credential storage
│   ├── heartbeat.py         # Periodic health beacon
│   ├── git_manager.py       # Git cloning, branch checkout & commit SHA resolution
│   ├── environment_manager.py # Isolated venv & pip dependency manager
│   ├── log_manager.py       # Streaming log buffer & secret mask filter
│   ├── executor.py          # Safe subprocess execution & process tree killer
│   ├── installer/           # PowerShell installation & Windows service scripts
│   └── requirements.txt
│
├── docker-compose.yml        # PostgreSQL, Redis, Backend, Frontend stack
├── .env.example
├── README.md
├── docs/                     # Architecture, DB schema, API reference, Setup guides
└── tests/                    # Backend, Agent, and E2E acceptance test suite
```

---

## Quick Start (Docker Compose)

```bash
# 1. Clone repository & enter directory
cd python-orchestrator

# 2. Copy environment template
cp .env.example .env

# 3. Launch the complete stack
docker compose up -d --build
```

Access the Control Room UI at **[http://localhost](http://localhost)**.
- Default Admin: `admin` / `Admin123!`

---

## Running Locally for Development (No Docker Required)

### 1. Start Central Backend
```bash
cd python-orchestrator/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Start Control Room Frontend
```bash
cd python-orchestrator/frontend
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Start a Machine Agent
```bash
cd python-orchestrator/agent
pip install -r requirements.txt

# Run agent with generated registration token from UI
python agent.py --central-url http://localhost:8000 --machine-name Machine-A --token <YOUR_REGISTRATION_TOKEN>
```

---

## Running the Automated Test Suite

```bash
cd python-orchestrator
pytest tests/ -v
```

---

## Documentation

- 📐 [System Architecture](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/ARCHITECTURE.md)
- 🗄️ [Database Schema & ER Diagram](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/DATABASE_SCHEMA.md)
- 🔌 [REST & WebSocket API Reference](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/API_REFERENCE.md)
- 🚀 [Detailed Setup Guide](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/SETUP_GUIDE.md)
- 🪟 [Windows Agent Installation & Service Guide](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/WINDOWS_AGENT_GUIDE.md)
- 🔍 [Troubleshooting & Diagnostics](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/TROUBLESHOOTING.md)
- 🛡️ [Security Guidelines & Hardening](file:///c:/Users/GaneshBhat/Documents/PROD/python-orchestrator/docs/SECURITY_GUIDELINES.md)
