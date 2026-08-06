"""
===============================================================================
AIAnveshana Framework - Multi-Bot Local RPA Orchestrator Agent
===============================================================================
Lightweight HTTP REST API server running on localhost:8000.
Bridges GitHub Pages Automation Anywhere Style Control Room with local Windows
Master Bot execution across all process folders in PROD.
"""

import os
import sys
import json
import time
import glob
import re
import subprocess
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from socketserver import ThreadingMixIn

# Resolve paths dynamically relative to current agent directory
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROD_DIR = os.path.abspath(os.path.join(AGENT_DIR, ".."))
DEFAULT_MASTER_BOT_PATH = os.path.join(PROD_DIR, "Loan", "Loan Team", "Active Loans Process", "Bots", "Master_ActiveLoansProcess.py")
DEFAULT_LOGS_DIR = os.path.join(PROD_DIR, "Loan", "Loan Team", "Active Loans Process", "Process", "Logs")

# Global Multi-Bot Execution State
state_lock = threading.Lock()
execution_state = {
    "active_bot_id": None,
    "status": "IDLE",  # IDLE, RUNNING, COMPLETED, FAILED
    "start_time": None,
    "end_time": None,
    "duration_seconds": 0,
    "last_return_code": None,
    "error_message": None,
    "pid": None,
    "total_runs": 0,
    "bot_states": {}  # bot_id -> state dict
}

current_subprocess = None


def get_bot_last_run_info(clean_name):
    """Inspects log files to find true last run timestamp and status for process bot."""
    logs = get_latest_log_entries(process_filter=clean_name)
    if not logs:
        return "IDLE", "--"

    last_entry = logs[-1]
    last_time = last_entry.get("time", "--")

    for entry in reversed(logs):
        msg = entry.get("message", "").upper()
        lvl = entry.get("level", "").upper()

        if "COMPLETED WITH STATUS: TRUE" in msg or "PROCESS COMPLETED EMAIL SENT" in msg or "COMPLETED SUCCESSFULLY" in msg:
            return "COMPLETED", last_time
        if "EXCEPTION ENCOUNTERED" in msg or "MASTER BOT CAUGHT EXCEPTION" in msg or lvl == "EXCEPTION":
            return "FAILED", last_time

    return "IDLE", last_time


def discover_all_bots():
    """
    Scans PROD directory for all Master_*.py scripts across all process folders.
    Returns list of process bot dictionary objects.
    """
    bots = []
    for root, dirs, files in os.walk(PROD_DIR):
        rel_root = os.path.relpath(root, PROD_DIR)
        first_segment = rel_root.split(os.sep)[0]
        if first_segment in ("framework_components", "docs", "orchestrator_agent", ".git", "__pycache__", ".venv"):
            continue

        for file in files:
            if file.startswith("Master_") and file.endswith(".py"):
                full_path = os.path.abspath(os.path.join(root, file))
                raw_name = file.replace("Master_", "").replace(".py", "")
                clean_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', raw_name).strip()

                folder_rel = os.path.dirname(rel_root) if os.path.basename(rel_root) == "Bots" else rel_root
                if folder_rel == ".":
                    folder_rel = rel_root

                bot_id = raw_name.lower()
                mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(full_path)))

                bot_state = execution_state["bot_states"].get(bot_id, {})
                if bot_state.get("status") == "RUNNING":
                    bot_status = "RUNNING"
                    last_run_time = bot_state.get("start_time", "--")
                else:
                    bot_status, last_run_time = get_bot_last_run_info(clean_name)

                bots.append({
                    "id": bot_id,
                    "name": clean_name,
                    "folder": folder_rel.replace("\\", "/"),
                    "bot_file": file,
                    "path": full_path,
                    "last_modified": mtime,
                    "status": bot_status,
                    "last_run": last_run_time if last_run_time != "--" else mtime,
                    "duration": f"{bot_state.get('duration_seconds', '--')}s" if bot_state.get('duration_seconds') else "--",
                    "platform": "Python 3.14 RPA",
                    "version": "1.0.0"
                })

    return bots


def run_master_bot_async(bot_path=None, bot_id=None):
    """Executes a target Master bot script in a background thread/process."""
    global current_subprocess, execution_state

    target_id = bot_id or "activeloansprocess"
    target_path = bot_path

    if not target_path or not os.path.exists(target_path):
        all_bots = discover_all_bots()
        matched = next((b for b in all_bots if b["id"] == target_id), None)
        if matched:
            target_path = matched["path"]
        else:
            target_path = DEFAULT_MASTER_BOT_PATH

    target_path = os.path.abspath(os.path.normpath(target_path))

    with state_lock:
        execution_state["active_bot_id"] = target_id
        execution_state["status"] = "RUNNING"
        execution_state["start_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
        execution_state["end_time"] = None
        execution_state["error_message"] = None
        execution_state["total_runs"] += 1

        if target_id not in execution_state["bot_states"]:
            execution_state["bot_states"][target_id] = {}
        execution_state["bot_states"][target_id]["status"] = "RUNNING"
        execution_state["bot_states"][target_id]["start_time"] = execution_state["start_time"]

        start_ts = time.time()

    try:
        cmd = [sys.executable, target_path]
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

        output_lines = []
        if current_subprocess.stdout:
            for line in current_subprocess.stdout:
                output_lines.append(line)

        return_code = current_subprocess.wait()
        end_ts = time.time()

        with state_lock:
            end_str = time.strftime("%Y-%m-%d %H:%M:%S")
            dur = round(end_ts - start_ts, 2)
            execution_state["end_time"] = end_str
            execution_state["duration_seconds"] = dur
            execution_state["last_return_code"] = return_code
            execution_state["pid"] = None

            final_status = "COMPLETED" if return_code == 0 else "FAILED"
            execution_state["status"] = final_status
            execution_state["bot_states"][target_id]["status"] = final_status
            execution_state["bot_states"][target_id]["end_time"] = end_str
            execution_state["bot_states"][target_id]["duration_seconds"] = dur

            if return_code != 0:
                err_snippet = "".join(output_lines[-5:]).strip()
                execution_state["error_message"] = f"Exited with code {return_code}: {err_snippet}"

    except Exception as ex:
        with state_lock:
            end_str = time.strftime("%Y-%m-%d %H:%M:%S")
            execution_state["status"] = "FAILED"
            execution_state["end_time"] = end_str
            execution_state["error_message"] = str(ex)
            execution_state["pid"] = None
            if target_id in execution_state["bot_states"]:
                execution_state["bot_states"][target_id]["status"] = "FAILED"
    finally:
        current_subprocess = None


def get_latest_log_entries(process_filter=None):
    """Reads all daily CSV process log files in PROD and returns list of log dicts."""
    log_files = []
    for root, dirs, files in os.walk(PROD_DIR):
        for f in files:
            if f.startswith("Log_") and f.endswith(".txt"):
                log_files.append(os.path.join(root, f))

    if not log_files:
        return []

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
                    proc_name = parts[2].strip()
                    if process_filter and process_filter.lower() not in proc_name.lower():
                        continue
                    entries.append({
                        "time": parts[0].strip(),
                        "device": parts[1].strip(),
                        "process": proc_name,
                        "subbot": parts[3].strip(),
                        "level": parts[4].strip(),
                        "message": parts[5].strip(),
                    })
                else:
                    entries.append({"time": "", "device": "", "process": "", "subbot": "", "level": "INFO", "message": line})
    except Exception:
        pass

    return entries


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
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
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"
        query = parse_qs(parsed.query)

        if path in ("/api/health", "/"):
            self._json_response({
                "status": "ONLINE",
                "machine": os.getenv("COMPUTERNAME", "GANESH"),
                "python_version": sys.version.split()[0],
                "master_bot_exists": os.path.exists(DEFAULT_MASTER_BOT_PATH),
            })

        elif path == "/api/bots":
            bots = discover_all_bots()
            self._json_response({"total": len(bots), "bots": bots})

        elif path == "/api/status":
            with state_lock:
                current = dict(execution_state)
            self._json_response(current)

        elif path == "/api/logs":
            proc_filter = query.get("process_name", [None])[0]
            logs = get_latest_log_entries(process_filter=proc_filter)
            self._json_response({"total": len(logs), "logs": logs})

        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        if not path:
            path = "/"

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
                    self._json_response({"success": False, "message": "A bot process is already running!"}, status_code=409)
                    return

            target_path = body_data.get("bot_path", DEFAULT_MASTER_BOT_PATH)
            target_id = body_data.get("bot_id", "active_loans_process")

            thread = threading.Thread(target=run_master_bot_async, args=(target_path, target_id), daemon=True)
            thread.start()

            self._json_response({"success": True, "message": f"Triggered execution for process '{target_id}'!"})

        elif path == "/api/stop":
            global current_subprocess
            with state_lock:
                if current_subprocess and current_subprocess.poll() is None:
                    current_subprocess.terminate()
                    execution_state["status"] = "FAILED"
                    execution_state["error_message"] = "Terminated manually by Orchestrator UI"
                    self._json_response({"success": True, "message": "Process bot terminated."})
                else:
                    self._json_response({"success": False, "message": "No active process to stop."})

        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def log_message(self, format, *args):
        return


def start_orchestrator_server(port: int = 8000):
    server_address = ("0.0.0.0", port)
    httpd = ThreadedHTTPServer(server_address, OrchestratorHandler)
    print(f"\n" + "=" * 70)
    print(f"   AIANVESHANA MULTI-BOT ORCHESTRATOR AGENT ONLINE   ")
    print(f"   Listening on: http://localhost:{port}")
    print(f"   Root PROD Directory: {PROD_DIR}")
    print(f"=" * 70 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Orchestrator Agent...")
        httpd.server_close()


if __name__ == "__main__":
    start_orchestrator_server(8000)
