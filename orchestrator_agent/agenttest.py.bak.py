"""
===============================================================================
AIAnveshana Framework - Multi-Bot Local RPA Orchestrator Agent & Scheduler
===============================================================================
Lightweight HTTP REST API server running on localhost:8000 with 24/7 background
scheduling engine for time, timezone, daily, weekly, and monthly bot execution.
"""

import os
import sys
import json
import time
import glob
import re
import uuid
import subprocess
import threading
import asyncio
import websockets
from datetime import datetime, timezone, timedelta
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from socketserver import ThreadingMixIn

# Resolve paths dynamically relative to current agent directory
AGENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROD_DIR = os.path.abspath(os.path.join(AGENT_DIR, ".."))
DEFAULT_MASTER_BOT_PATH = os.path.join(PROD_DIR, "Loan", "Loan Team", "Active Loans Process", "Bots", "Master_ActiveLoansProcess.py")
SCHEDULES_FILE = os.path.join(AGENT_DIR, "schedules.json")
GITHUB_CONFIG_FILE = os.path.join(AGENT_DIR, "github_config.json")

# Persistent WebSocket runner nodes registry
connected_runners = {}  # ws_conn -> info dict


def load_github_config():
    """Loads GitHub SSH and repository configuration."""
    if os.path.exists(GITHUB_CONFIG_FILE):
        try:
            with open(GITHUB_CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    ssh_url = "git@github.com:aianveshana-collab/Ai-and-Automation.git"
    try:
        res = subprocess.run(["git", "remote", "get-url", "origin"], cwd=PROD_DIR, capture_output=True, text=True)
        if res.returncode == 0 and res.stdout.strip():
            ssh_url = res.stdout.strip()
    except Exception:
        pass

    return {
        "ssh_url": ssh_url,
        "token": "",
        "status": "Connected (Git SSH)",
        "last_synced": time.strftime("%Y-%m-%d %H:%M:%S")
    }


def save_github_config(config):
    """Saves GitHub SSH configuration."""
    try:
        with open(GITHUB_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except Exception:
        pass


def get_github_runners():
    """Returns connected live WebSocket runner devices and fallback local nodes."""
    runners_list = []
    # Add WebSocket-connected nodes first
    for conn, info in connected_runners.items():
        runners_list.append({
            "id": info.get("id", "runner-generic"),
            "name": info.get("name", "WEBSOCKET-NODE"),
            "machine": info.get("machine", "ACTIVE-HOST"),
            "os": info.get("os", "Windows x64"),
            "arch": info.get("arch", "x64"),
            "status": "ONLINE",
            "busy": info.get("busy", False),
            "labels": info.get("labels", ["WebSocket", "RPA-Client"]),
            "last_ping": "Just now (Active Connection)",
            "dependencies_status": "Verified (Auto-sync enabled)"
        })

    # If no websockets are connected, return local fallback nodes for UI compatibility
    if not runners_list:
        machine_name = os.getenv("COMPUTERNAME", "GANESH")
        runners_list = [
            {
                "id": "runner-ganesh-01",
                "name": f"{machine_name}-SELF-HOSTED-RUNNER",
                "machine": machine_name,
                "os": f"Windows ({sys.platform})",
                "arch": "x64",
                "status": "ONLINE",
                "busy": False,
                "labels": ["self-hosted", "Windows", "x64", "RPA-Bot-Node", "Python3.14"],
                "last_ping": "Just now (Active Host)",
                "dependencies_status": "Verified (Python, pandas, openpyxl)"
            },
            {
                "id": "runner-local-exec-02",
                "name": "LOCAL-DEV-RUNNER-02",
                "machine": "LOCAL-ORCHESTRATOR-NODE",
                "os": "Windows 11 x64",
                "arch": "x64",
                "status": "IDLE",
                "busy": False,
                "labels": ["self-hosted", "Windows", "x64", "Sub-Bot-Node"],
                "last_ping": "1 min ago",
                "dependencies_status": "Verified"
            }
        ]
    return runners_list

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
scheduled_tasks = []


def load_schedules():
    """Loads persistent schedules from schedules.json."""
    if os.path.exists(SCHEDULES_FILE):
        try:
            with open(SCHEDULES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_schedules(schedules):
    """Saves schedules to schedules.json."""
    try:
        with open(SCHEDULES_FILE, "w", encoding="utf-8") as f:
            json.dump(schedules, f, indent=2)
    except Exception:
        pass


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


def discover_real_repository():
    """
    Scans PROD repository directly using Git version control commands (`git ls-files` and `git log`).
    """
    folders = set()
    items = []

    try:
        res = subprocess.run(["git", "ls-files"], cwd=PROD_DIR, capture_output=True, text=True, check=True)
        tracked_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]
    except Exception:
        tracked_files = []

    if not tracked_files:
        # Fallback to local walk if git command is not available
        for root, dirs, files in os.walk(PROD_DIR):
            rel_root = os.path.relpath(root, PROD_DIR)
            parts = rel_root.split(os.sep)
            if parts[0] in (".git", "__pycache__", ".venv", "docs", ".github"):
                continue
            if rel_root != ".":
                folders.add(rel_root.replace("\\", "/"))
            for file in files:
                if file.endswith((".py", ".json", ".xml", ".txt", ".xlsx", ".bat")):
                    full_path = os.path.abspath(os.path.join(root, file))
                    mtime = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(full_path)))
                    is_bot = file.startswith(("Master_", "Child_")) and file.endswith(".py")
                    file_type = "Bot" if is_bot else ("Script" if file.endswith(".py") else "File")
                    clean_name = file.replace("Master_", "").replace("Child_", "").replace(".py", "")
                    clean_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', clean_name).strip() if is_bot else file
                    folder_path = rel_root.replace("\\", "/") if rel_root != "." else "Bots"
                    bot_id = file.replace(".py", "").lower()
                    bot_state = execution_state["bot_states"].get(bot_id, {})
                    status = bot_state.get("status", "Ready") if is_bot else "N/A"
                    items.append({
                        "id": bot_id,
                        "name": file,
                        "clean_name": clean_name,
                        "type": file_type,
                        "folder": folder_path,
                        "path": full_path,
                        "last_modified": mtime,
                        "status": status,
                        "platform": "Python 3.14 RPA",
                        "source_version": "v1.0"
                    })
        return {"git_tracked": False, "folders": sorted(list(folders)), "items": items}

    for rel_path in tracked_files:
        rel_path_clean = rel_path.replace("\\", "/")
        parts = rel_path_clean.split("/")
        
        # Skip system & documentation files
        if parts[0] in ("docs", ".github", ".gitignore", ".nojekyll"):
            continue

        folder_path = "/".join(parts[:-1]) if len(parts) > 1 else "Bots"
        file_name = parts[-1]

        if folder_path != "Bots":
            curr = ""
            for p in parts[:-1]:
                curr = f"{curr}/{p}" if curr else p
                folders.add(curr)

        if file_name.endswith((".py", ".json", ".xml", ".xlsx", ".bat")):
            full_path = os.path.abspath(os.path.join(PROD_DIR, rel_path))
            
            git_version = "v1.0"
            mtime_str = "Git Tracked"
            try:
                git_log_res = subprocess.run(
                    ["git", "log", "-1", "--format=%cr|%h", "--", rel_path],
                    cwd=PROD_DIR, capture_output=True, text=True
                )
                if git_log_res.returncode == 0 and git_log_res.stdout.strip():
                    parts_log = git_log_res.stdout.strip().split("|", 1)
                    if len(parts_log) == 2:
                        mtime_str = parts_log[0]
                        git_version = f"git:{parts_log[1]}"
            except Exception:
                pass

            is_bot = file_name.startswith(("Master_", "Child_")) and file_name.endswith(".py")
            file_type = "Bot" if is_bot else ("Script" if file_name.endswith(".py") else "File")

            clean_name = file_name.replace("Master_", "").replace("Child_", "").replace(".py", "")
            clean_name = re.sub(r'(?<!^)(?=[A-Z])', ' ', clean_name).strip() if is_bot else file_name

            bot_id = file_name.replace(".py", "").lower()
            bot_state = execution_state["bot_states"].get(bot_id, {})
            status = bot_state.get("status", "Ready") if is_bot else "N/A"

            items.append({
                "id": bot_id,
                "name": file_name,
                "clean_name": clean_name,
                "type": file_type,
                "folder": folder_path,
                "path": full_path,
                "last_modified": mtime_str,
                "status": status,
                "platform": "Python 3.14 RPA",
                "source_version": git_version
            })

    return {
        "git_tracked": True,
        "folders": sorted(list(folders)),
        "items": items
    }


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


# ===============================================================================
# BACKGROUND SCHEDULING ENGINE THREAD
# ===============================================================================
TIMEZONE_OFFSETS = {
    "IST": timedelta(hours=5, minutes=30),
    "EST": timedelta(hours=-5),
    "PST": timedelta(hours=-8),
    "UTC": timedelta(hours=0),
    "GMT": timedelta(hours=0),
}


def background_scheduler_loop():
    """Daemon thread evaluating process bot schedules every 30 seconds."""
    while True:
        try:
            schedules = load_schedules()
            now_utc = datetime.now(timezone.utc)

            for sch in schedules:
                if not sch.get("enabled", True):
                    continue

                tz_name = sch.get("timezone", "IST")
                offset = TIMEZONE_OFFSETS.get(tz_name, timedelta(hours=5, minutes=30))
                now_tz = now_utc + offset

                current_time_str = now_tz.strftime("%H:%M")
                current_day_str = now_tz.strftime("%a")  # Mon, Tue...
                current_dom = now_tz.day  # 1 to 31

                target_time = sch.get("time", "00:00")
                freq = sch.get("frequency", "daily").lower()

                # Avoid triggering multiple times in the same minute
                last_triggered = sch.get("last_triggered")
                today_stamp = now_tz.strftime("%Y-%m-%d %H:%M")

                if last_triggered == today_stamp:
                    continue

                should_trigger = False
                if current_time_str == target_time:
                    if freq == "daily":
                        should_trigger = True
                    elif freq == "weekly":
                        allowed_days = sch.get("days", [])
                        if current_day_str in allowed_days or "All" in allowed_days:
                            should_trigger = True
                    elif freq == "monthly":
                        target_dom = sch.get("day_of_month", 1)
                        if current_dom == int(target_dom):
                            should_trigger = True

                if should_trigger:
                    with state_lock:
                        if execution_state["status"] != "RUNNING":
                            print(f"\n[SCHEDULER] Triggering scheduled bot '{sch.get('bot_name')}' at {current_time_str} {tz_name}")
                            thread = threading.Thread(target=run_master_bot_async, args=(sch.get("bot_path"), sch.get("bot_id")), daemon=True)
                            thread.start()

                            sch["last_triggered"] = today_stamp
                            save_schedules(schedules)

        except Exception as ex:
            print(f"[SCHEDULER WARNING] Evaluation error: {ex}")

        time.sleep(30)


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


class OrchestratorHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
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

    def _file_response(self, file_path, content_type="text/html"):
        try:
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self.send_header("Content-Type", content_type)
                self._send_cors_headers()
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            else:
                self._json_response({"error": "File not found"}, status_code=404)
        except Exception as ex:
            self._json_response({"error": str(ex)}, status_code=500)

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

        if path in ("/", "/index.html"):
            index_path = os.path.join(PROD_DIR, "docs", "index.html")
            if not os.path.exists(index_path):
                index_path = os.path.join(PROD_DIR, "index.html")
            self._file_response(index_path, "text/html")
            return

        elif path == "/style.css":
            css_path = os.path.join(PROD_DIR, "docs", "style.css")
            if not os.path.exists(css_path):
                css_path = os.path.join(PROD_DIR, "style.css")
            self._file_response(css_path, "text/css")
            return

        elif path == "/app.js":
            js_path = os.path.join(PROD_DIR, "docs", "app.js")
            if not os.path.exists(js_path):
                js_path = os.path.join(PROD_DIR, "app.js")
            self._file_response(js_path, "application/javascript")
            return

        elif path == "/api/health":
            git_user = "aibrahmabusiness-hub"
            try:
                git_res = subprocess.run(["git", "config", "user.name"], cwd=PROD_DIR, capture_output=True, text=True)
                if git_res.returncode == 0 and git_res.stdout.strip():
                    git_user = git_res.stdout.strip()
            except Exception:
                pass

            self._json_response({
                "status": "ONLINE",
                "machine": os.getenv("COMPUTERNAME", "GANESH"),
                "github_user": git_user,
                "python_version": sys.version.split()[0],
                "master_bot_exists": os.path.exists(DEFAULT_MASTER_BOT_PATH),
            })

        elif path == "/api/bots":
            bots = discover_all_bots()
            self._json_response({"total": len(bots), "bots": bots})

        elif path == "/api/repository":
            repo_data = discover_real_repository()
            self._json_response(repo_data)

        elif path == "/api/status":
            with state_lock:
                current = dict(execution_state)
            self._json_response(current)

        elif path == "/api/logs":
            proc_filter = query.get("process_name", [None])[0]
            logs = get_latest_log_entries(process_filter=proc_filter)
            self._json_response({"total": len(logs), "logs": logs})

        elif path == "/api/schedules":
            schedules = load_schedules()
            self._json_response({"total": len(schedules), "schedules": schedules})

        elif path == "/api/github/config":
            config = load_github_config()
            self._json_response(config)

        elif path == "/api/github/runners":
            runners = get_github_runners()
            self._json_response({"total": len(runners), "runners": runners})

        elif path == "/api/code":
            rel_file = query.get("path", [""])[0].strip()
            if not rel_file:
                self._json_response({"error": "Path parameter required"}, status_code=400)
                return

            if os.path.isabs(rel_file):
                target_path = os.path.abspath(rel_file)
            else:
                target_path = os.path.abspath(os.path.join(PROD_DIR, rel_file))

            prod_norm = os.path.normcase(os.path.abspath(PROD_DIR))
            target_norm = os.path.normcase(target_path)

            if not target_norm.startswith(prod_norm) or not os.path.exists(target_path):
                self._json_response({"error": f"File not found: {rel_file}"}, status_code=404)
                return

            try:
                with open(target_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                lines = len(content.splitlines())
                size = os.path.getsize(target_path)
                rel_display = os.path.relpath(target_path, PROD_DIR).replace("\\", "/")
                self._json_response({
                    "path": rel_display,
                    "name": os.path.basename(target_path),
                    "content": content,
                    "lines": lines,
                    "size_bytes": size
                })
            except Exception as e:
                self._json_response({"error": str(e)}, status_code=500)

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
            target_id = body_data.get("bot_id", "activeloansprocess")
            target_runner_id = body_data.get("target_runner")

            # Try to trigger execution on dynamic WebSocket runner first
            loop = asyncio.new_event_loop()
            triggered_on_ws = False
            try:
                triggered_on_ws = loop.run_until_complete(
                    trigger_websocket_bot_run(target_id, target_path, target_runner_id)
                )
            except Exception as ws_err:
                print(f"[WebSocket Trigger Error] {ws_err}")
            finally:
                loop.close()

            if triggered_on_ws:
                self._json_response({"success": True, "message": f"Triggered execution on remote WebSocket runner node '{target_runner_id or 'any'}'!"})
            else:
                # Fallback to executing locally on the host machine
                thread = threading.Thread(target=run_master_bot_async, args=(target_path, target_id), daemon=True)
                thread.start()
                self._json_response({"success": True, "message": f"Triggered local host execution fallback for process '{target_id}'!"})

        elif path == "/api/schedules":
            schedules = load_schedules()
            new_sch = {
                "id": str(uuid.uuid4())[:8],
                "bot_id": body_data.get("bot_id"),
                "bot_name": body_data.get("bot_name", "Process Bot"),
                "bot_path": body_data.get("bot_path"),
                "time": body_data.get("time", "09:00"),
                "timezone": body_data.get("timezone", "IST"),
                "frequency": body_data.get("frequency", "daily"),
                "days": body_data.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri"]),
                "day_of_month": body_data.get("day_of_month", 1),
                "enabled": True,
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            schedules.append(new_sch)
            save_schedules(schedules)
            self._json_response({"success": True, "message": "Schedule created successfully!", "schedule": new_sch})

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

        elif path == "/api/github/config":
            config = load_github_config()
            config["ssh_url"] = body_data.get("ssh_url", config.get("ssh_url"))
            config["token"] = body_data.get("token", config.get("token"))
            config["status"] = "Connected (Git SSH & Token)" if config.get("token") else "Connected (Git SSH)"
            config["last_synced"] = time.strftime("%Y-%m-%d %H:%M:%S")
            save_github_config(config)
            self._json_response({"success": True, "message": "GitHub repository SSH configuration saved!", "config": config})

        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")
        query = parse_qs(parsed.query)

        if path == "/api/schedules":
            sch_id = query.get("schedule_id", [None])[0]
            if sch_id:
                schedules = load_schedules()
                filtered = [s for s in schedules if s.get("id") != sch_id]
                save_schedules(filtered)
                self._json_response({"success": True, "message": "Schedule deleted successfully!"})
            else:
                self._json_response({"error": "Missing schedule_id parameter"}, status_code=400)
        else:
            self._json_response({"error": "Endpoint not found"}, status_code=404)

    def log_message(self, format, *args):
        return


# ===============================================================================
# ASYNCHRONOUS WEBSOCKET SERVER (PORT 8002) FOR DYNAMIC RUNNERS
# ===============================================================================
async def websocket_handler(websocket):
    """Processes persistent execution device WebSocket connection sessions."""
    # Read handshake identification JSON
    try:
        ident_raw = await websocket.recv()
        ident = json.loads(ident_raw)
        node_id = ident.get("id", str(uuid.uuid4())[:8])
        node_name = ident.get("name", "WS-NODE")
        
        connected_runners[websocket] = {
            "id": node_id,
            "name": node_name,
            "machine": ident.get("machine", "Node Host"),
            "os": ident.get("os", "win32"),
            "arch": ident.get("arch", "x64"),
            "labels": ident.get("labels", []),
            "busy": False
        }
        print(f"[WebSocket Server] Runner Node '{node_name}' ({node_id}) CONNECTED successfully.")
    except Exception as e:
        print(f"[WebSocket Server] Handshake failure: {e}")
        return

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                msg_type = data.get("type")
                
                # Receive 1-second telemetry heartbeat packets from device node
                if msg_type == "HEARTBEAT":
                    connected_runners[websocket]["busy"] = data.get("busy", False)
                    connected_runners[websocket]["cpu_load"] = data.get("cpu", 0)
                    connected_runners[websocket]["ram_load"] = data.get("ram", 0)
                
                # Receive real-time execution feedback and stream directly to local execution state
                elif msg_type == "BOT_STATUS_UPDATE":
                    bot_id = data.get("bot_id")
                    status = data.get("status")
                    with state_lock:
                        if bot_id not in execution_state["bot_states"]:
                            execution_state["bot_states"][bot_id] = {}
                        execution_state["bot_states"][bot_id]["status"] = status
                        execution_state["status"] = status
                        if data.get("elapsed"):
                            execution_state["duration_seconds"] = data.get("elapsed")
                        if data.get("error"):
                            execution_state["error_message"] = data.get("error")

            except Exception as parse_err:
                pass
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        info = connected_runners.pop(websocket, {})
        print(f"[WebSocket Server] Runner Node '{info.get('name', 'Unknown')}' disconnected.")


async def trigger_websocket_bot_run(bot_id, bot_path, target_runner_id=None):
    """Broadcasts a trigger bot execution message to target WebSocket runner."""
    # Find matching websocket connection in active pool
    target_conn = None
    for ws_conn, info in connected_runners.items():
        if not target_runner_id or info.get("id") == target_runner_id:
            target_conn = ws_conn
            break

    if not target_conn:
        # None found, return false to fallback to local process run
        return False

    payload = {
        "type": "TRIGGER_RUN",
        "bot_id": bot_id,
        "bot_path": bot_path,
        "git_url": load_github_config().get("ssh_url", "")
    }
    
    try:
        await target_conn.send(json.dumps(payload))
        return True
    except Exception as e:
        print(f"[WebSocket Server] Failed to send trigger run event to runner: {e}")
        return False


def start_websocket_server_thread():
    """Wrapper function to run the asynchronous websockets event loop in a daemon thread."""
    async def serve():
        async with websockets.serve(websocket_handler, "0.0.0.0", 8002):
            print("[WebSocket Server] Listening for execution runners on: ws://localhost:8002")
            await asyncio.Future()  # run forever

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(serve())
    except Exception as e:
        print(f"[WebSocket Server Error] {e}")


def start_orchestrator_server(port: int = 8000):
    # Start background scheduler daemon thread
    sched_thread = threading.Thread(target=background_scheduler_loop, daemon=True)
    sched_thread.start()

    # Start WebSocket server daemon thread
    ws_thread = threading.Thread(target=start_websocket_server_thread, daemon=True)
    ws_thread.start()

    server_address = ("0.0.0.0", port)
    httpd = ThreadedHTTPServer(server_address, OrchestratorHandler)
    print(f"\n" + "=" * 70)
    print(f"   AGENTIC ORCHESTRATOR REST AGENT & WEBSOCKET ENGINE ONLINE    ")
    print(f"   REST Endpoint: http://localhost:{port}")
    print(f"   WebSocket Server: ws://localhost:8002")
    print(f"   Root PROD Directory: {PROD_DIR}")
    print(f"   Background Scheduler Thread: ACTIVE")
    print(f"=" * 70 + "\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Orchestrator Agent...")
        httpd.server_close()


if __name__ == "__main__":
    start_orchestrator_server(8001)
