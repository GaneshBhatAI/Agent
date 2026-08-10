import os
import sys
import json
import time
import socket
import asyncio
import subprocess
import websockets

# Configuration settings
WS_SERVER_URL = "ws://localhost:8002"
GIT_WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ws_runner_workspace"))

# Ensure dynamic workspace folder exists
if not os.path.exists(GIT_WORKSPACE_DIR):
    os.makedirs(GIT_WORKSPACE_DIR)


def get_system_telemetry():
    """Generates a hardware telemetry stats heartbeat dictionary."""
    hostname = socket.gethostname()
    return {
        "id": f"runner-{hostname.lower()}",
        "name": f"{hostname.upper()}-WEBSOCKET-RUNNER",
        "machine": hostname,
        "os": sys.platform,
        "arch": "x64",
        "labels": ["websocket-runner", sys.platform, "Python" + sys.version.split()[0]],
        "cpu": 12,  # Mocked resource values for telemetry demo
        "ram": 42
    }


async def run_bot_script_local(bot_id, bot_path, git_url, ws):
    """Clones/Pulls latest repository files and runs the python bot in a subprocess."""
    print(f"\n[Runner Workspace] Initializing deployment run for bot '{bot_id}'")
    
    # 1. Sync repository files
    repo_name = git_url.split("/")[-1].replace(".git", "") if git_url else "repo"
    target_repo_dir = os.path.join(GIT_WORKSPACE_DIR, repo_name)

    if git_url:
        try:
            if not os.path.exists(os.path.join(target_repo_dir, ".git")):
                print(f"[Git Sync] Cloning repository '{git_url}'...")
                subprocess.run(["git", "clone", git_url, target_repo_dir], check=True)
            else:
                print(f"[Git Sync] Pulling latest repository updates...")
                subprocess.run(["git", "pull"], cwd=target_repo_dir, check=True)
        except Exception as git_err:
            print(f"[Git Error] Failed to sync Git source: {git_err}")

    # Determine execution script path
    full_script_path = os.path.join(target_repo_dir, bot_path) if git_url else os.path.abspath(os.path.join(GIT_WORKSPACE_DIR, "..", bot_path))
    
    if not os.path.exists(full_script_path):
        # Fail run if file does not exist
        err_msg = f"Bot script not found at path: {bot_path}"
        print(f"[Run Error] {err_msg}")
        await ws.send(json.dumps({
            "type": "BOT_STATUS_UPDATE",
            "bot_id": bot_id,
            "status": "FAILED",
            "error": err_msg
        }))
        return

    # 2. Run bot script
    print(f"[Runner Exec] Launching bot: {full_script_path}")
    await ws.send(json.dumps({
        "type": "BOT_STATUS_UPDATE",
        "bot_id": bot_id,
        "status": "RUNNING",
        "elapsed": 0
    }))

    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            sys.executable, full_script_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Read logs output asynchronously
        stdout_data, stderr_data = await proc.communicate()
        return_code = proc.returncode
        elapsed = round(time.time() - start_time, 2)

        status = "COMPLETED" if return_code == 0 else "FAILED"
        err_text = stderr_data.decode().strip() if return_code != 0 else None

        print(f"[Runner Exec] Bot run complete! Status: {status} in {elapsed}s")
        await ws.send(json.dumps({
            "type": "BOT_STATUS_UPDATE",
            "bot_id": bot_id,
            "status": status,
            "elapsed": elapsed,
            "error": err_text
        }))
        
    except Exception as exec_err:
        elapsed = round(time.time() - start_time, 2)
        await ws.send(json.dumps({
            "type": "BOT_STATUS_UPDATE",
            "bot_id": bot_id,
            "status": "FAILED",
            "elapsed": elapsed,
            "error": str(exec_err)
        }))


async def heartbeat_sender_loop(ws):
    """Sends 1-second interval telemetry status report heartbeats."""
    while True:
        try:
            payload = get_system_telemetry()
            payload["type"] = "HEARTBEAT"
            payload["busy"] = False
            await ws.send(json.dumps(payload))
            await asyncio.sleep(1)
        except Exception:
            break


async def schedule_checker_loop(ws):
    """Periodically evaluates schedules.json inside the Git workspace folder to trigger matching tasks."""
    print("[Schedule Engine] Active and checking schedules.json in workspace...")
    while True:
        try:
            # Look for schedules.json in the ws_runner_workspace subdirectory structure
            schedules_path = None
            for root, dirs, files in os.walk(GIT_WORKSPACE_DIR):
                if "schedules.json" in files:
                    schedules_path = os.path.join(root, "schedules.json")
                    break

            if schedules_path and os.path.exists(schedules_path):
                with open(schedules_path, "r", encoding="utf-8") as f:
                    schedules = json.load(f)
                
                # Check current local hour/minute
                now_struct = time.localtime()
                now_time_str = f"{now_struct.tm_hour:02d}:{now_struct.tm_min:02d}"
                now_day_str = time.strftime("%a", now_struct) # Mon, Tue...
                now_dom = now_struct.tm_mday

                for sch in schedules:
                    if not sch.get("enabled", True):
                        continue

                    # Avoid triggering multiple times in the same minute
                    today_stamp = f"{time.strftime('%Y-%m-%d', now_struct)} {now_time_str}"
                    if sch.get("last_triggered") == today_stamp:
                        continue

                    target_time = sch.get("time", "09:00")
                    freq = sch.get("frequency", "daily").lower()
                    
                    should_run = False
                    if now_time_str == target_time:
                        if freq == "daily":
                            should_run = True
                        elif freq == "weekly":
                            allowed_days = sch.get("days", [])
                            if now_day_str in allowed_days or "All" in allowed_days:
                                should_run = True
                        elif freq == "monthly":
                            target_dom = sch.get("day_of_month", 1)
                            if now_dom == int(target_dom):
                                should_run = True

                    if should_run:
                        print(f"[Schedule Trigger] Running scheduled task: {sch.get('bot_name')} ({sch.get('bot_path')})")
                        sch["last_triggered"] = today_stamp
                        
                        # Save execution stamp back
                        with open(schedules_path, "w", encoding="utf-8") as wf:
                            json.dump(schedules, wf, indent=2)

                        # Trigger the run locally
                        asyncio.create_task(run_bot_script_local(
                            sch["bot_id"],
                            sch["bot_path"],
                            sch.get("git_url"),
                            ws
                        ))
        except Exception as e:
            print(f"[Schedule Error] evaluation warning: {e}")
        
        await asyncio.sleep(30)


async def main():
    print(f"Connecting to Agentic Orchestrator WebSocket on: {WS_SERVER_URL}...")
    while True:
        try:
            async with websockets.connect(WS_SERVER_URL) as ws:
                print("Connection established. Sending client handshake identification...")
                # 1. Send initialization handshake
                handshake = get_system_telemetry()
                await ws.send(json.dumps(handshake))

                # 2. Launch concurrent heartbeat and schedule evaluation loops
                heartbeat_task = asyncio.create_task(heartbeat_sender_loop(ws))
                schedule_task = asyncio.create_task(schedule_checker_loop(ws))

                # 3. Listen for trigger execution requests from UI
                async for message in ws:
                    data = json.loads(message)
                    if data.get("type") == "TRIGGER_RUN":
                        asyncio.create_task(run_bot_script_local(
                            data["bot_id"],
                            data["bot_path"],
                            data.get("git_url"),
                            ws
                        ))

                heartbeat_task.cancel()
                schedule_task.cancel()
        except Exception as conn_err:
            print(f"Connection lost / refused ({conn_err}). Retrying in 4 seconds...")
            await asyncio.sleep(4)


if __name__ == "__main__":
    asyncio.run(main())
