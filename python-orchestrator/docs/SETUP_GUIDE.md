# Setup & Quickstart Guide

## Option A: Docker Compose Deployment (Single Command)

### Prerequisites
- Docker Engine 24+ & Docker Compose v2+

### Steps
1. Navigate to repository root:
   ```bash
   cd python-orchestrator
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Start all services:
   ```bash
   docker compose up -d --build
   ```
4. Access the Control Room at [http://localhost](http://localhost) (or port 80).
5. Default login:
   - **Username**: `admin`
   - **Password**: `Admin123!`

---

## Option B: Local Developer Mode (Zero Docker)

### 1. Start FastAPI Backend
```bash
cd python-orchestrator/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Start React Control Room Frontend
```bash
cd python-orchestrator/frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Start a Machine Agent
```bash
cd python-orchestrator/agent
pip install -r requirements.txt

# Option 1: Generate token in UI -> Machines -> Add Machine, then:
python agent.py --central-url http://localhost:8000 --machine-name Machine-A --token <YOUR_REGISTRATION_TOKEN>
```
The machine will appear **ONLINE** immediately in the Control Room.

---

## Complete First-Run Acceptance Flow

1. Log in with `admin` / `Admin123!`.
2. Go to **Machines** → Click **"Add Machine"** → Name: `Machine-A` → Click **"Generate Registration Token"**.
3. Run the Machine Agent using the generated command.
4. Watch `Machine-A` status badge turn **ONLINE** with real-time CPU & RAM gauges.
5. Go to **Repositories** → Select `hello-bot` → Click **"Run App"**.
6. Select `Machine-A` → Click **"Run Application"**.
7. Watch live logs stream in real-time in the terminal console until `SUCCESS (Exit Code: 0)`.
