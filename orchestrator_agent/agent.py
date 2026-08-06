"""
===============================================================================
AIAnveshana Framework - Local RPA Orchestrator Agent
===============================================================================
Lightweight HTTP REST API server running on localhost:8000.
Bridges GitHub Pages Web Dashboard with local Windows Master Bot execution,
enabling remote/local triggering, real-time log streaming, and scheduling.
"""

import os
import sys
import json
import time
import glob
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# Resolve paths dynamically relative to current agent directory
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROD_DIR = os.path.abspath(os.path.join(AGENT_DIR, ".."))
MASTER_BOT_PATH = os.path.join(PROD_DIR, "Loan", "Loan Team", "Active Loans Process", "Bots", "Master_ActiveLoansProcess.py")
LOGS_DIR = os.path.join(PROD_DIR, "Loan", "Loan Team", "Active Loans Process", "Process", "Logs")

# Global Process Execution State
state_lock = threading.Lock()
execution_state = {
    "status": "IDLE",  # IDLE, RUNNING, COMPLETED, FAILED
    "start_time": None,
    "end_time": None,
    "duration_seconds": 0,
    "last_return_code": None,
    "error_message": None,
    "pid": None,
    "total_runs": 0,
}

scheduled_tasks = []
current_subprocess = None


def run_master_bot_async():
    """Executes Master_ActiveLoansProcess.py in a background thread/process."""
    global current_subprocess, execution_state

    with state_lock:
        execution_state["status"] = "RUNNING"
        execution_state["start_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        execution_state["end_time"] = None
        execution_state["error_message"] = None
        execution_state["total_runs"] += 1
        start_ts = time.time()

    try:
        # Use sys.executable (current Python environment)
        cmd = [sys.executable, MASTER_BOT_PATH]
        current_subprocess = subprocess.Popen(
            cmd,
            cwd=PROD_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )

        with state_lock:
            execution_state["pid"] = current_subprocess.pid

        # Drain stdout buffer until process terminates
        if current_subprocess.stdout:
            for _ in current_subprocess.stdout:
                pass

        return_code = current_subprocess.wait()
        end_ts = time.time()

        with state_lock:
            execution_state["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            execution_state["duration_seconds"] = round(end_ts - start_ts, 2)
            execution_state["last_return_code"] = return_code
            execution_state["pid"] = None

            if return_code == 0:
                execution_state["status"] = "COMPLETED"
            else:
                execution_state["status"] = "FAILED"
                execution_state["error_message"] = f"Process exited with non-zero code {return_code}"

    except Exception as ex:
        with state_lock:
            execution_state["status"] = "FAILED"
            execution_state["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            execution_state["error_message"] = str(ex)
            execution_state["pid"] = None
    finally:
        current_subprocess = None


def get_latest_log_entries():
    """Reads the current daily CSV process log file and returns list of log dicts."""
    if not os.path.exists(LOGS_DIR):
        return []

    log_files = glob.glob(os.path.join(LOGS_DIR, "Log_*.txt"))
    if not log_files:
        return []

    # Get most recent log file by modification time
    latest_file = max(log_files, key=os.path.getmtime)

    entries = []
    try:
        with open(latest_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(",", 5)
                if len(parts) >= 6:
                    entries.append({
                        "time": parts[0].strip(),
                        "device": parts[1].strip(),
                        "process": parts[2].strip(),
                        "subbot": parts[3].strip(),
                        "level": parts[4].strip(),
                        "message": parts[5].strip(),
                    })
                else:
                    entries.append({"time": "", "device": "", "process": "", "subbot": "", "level": "INFO", "message": line})
    except Exception:
        pass

    return entries


from socketserver import ThreadingMixIn


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in separate threads to keep Orchestrator server resilient."""
    daemon_threads = True


class OrchestratorHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def _json_response(self, data, status_code=200):
        try:
            body = json.dumps(data).encode("utf-8")
            self.send_response(status_code)
            self.send_header("Content-Type", "application/json")
            self._send_cors_headers()
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception:
            pass

    def do_OPTIONS(self):
        try:
            self.send_response(204)
            self._send_cors_headers()
            self.end_headers()
        except Exception:
            pass

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/api/health", "/"):
            self._json_response({
                "status": "ONLINE",
                "machine": os.getenv("COMPUTERNAME", "GANESH"),
                "python_version": sys.version.split()[0],
                "master_bot_exists": os.path.exists(MASTER_BOT_PATH),
            })

        elif path == "/api/status":
            with state_lock:
                current = dict(execution_state)
            self._json_response(current)

        elif path == "/api/logs":
            logs = get_latest_log_entries()
            self._json_response({"total": len(logs), "logs": logs})

        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body_data = {}
        if content_length > 0:
            raw_body = self.rfile.read(content_length).decode("utf-8")
            try:
                body_data = json.loads(raw_body)
            except Exception:
                body_data = {}

        if path == "/api/trigger":
            with state_lock:
                if execution_state["status"] == "RUNNING":
                    self._json_response({"success": False, "message": "Master Bot is already running!"}, status_code=409)
                    return

            thread = threading.Thread(target=run_master_bot_async, daemon=True)
            thread.start()

            self._json_response({"success": True, "message": "Master Bot execution triggered successfully!"})

        elif path == "/api/stop":
            global current_subprocess
            with state_lock:
                if current_subprocess and current_subprocess.poll() is None:
                    current_subprocess.terminate()
                    execution_state["status"] = "FAILED"
                    execution_state["error_message"] = "Terminated manually by Orchestrator UI"
                    self._json_response({"success": True, "message": "Master Bot process terminated."})
                else:
                    self._json_response({"success": False, "message": "No active process to stop."})

        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def log_message(self, format, *args):
        # Silence default HTTP server console noise
        return


def start_orchestrator_server(port: int = 8000):
    server_address = ("0.0.0.0", port)
    httpd = ThreadedHTTPServer(server_address, OrchestratorHandler)
    print(f"\n" + "=" * 70)
    print(f"   AIANVESHANA LOCAL RPA ORCHESTRATOR AGENT ONLINE   ")
    print(f"   Listening on: http://localhost:{port}")
    print(f"   Connected Master Bot: {MASTER_BOT_PATH}")
    print(f"=" * 70 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Orchestrator Agent...")
        httpd.server_close()


if __name__ == "__main__":
    start_orchestrator_server(8000)
