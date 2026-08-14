from datetime import datetime, timezone
import logging
import os
import platform
import subprocess
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional
import httpx
import psutil

from config import agent_config
from environment_manager import environment_manager
from git_manager import git_manager
from log_manager import LogManager

logger = logging.getLogger("agent.executor")


class JobExecutor:
    def __init__(self, central_url: str, machine_id: str, agent_token: str):
        self.central_url = central_url.rstrip("/")
        self.machine_id = machine_id
        self.agent_token = agent_token
        self.current_process: Optional[subprocess.Popen] = None
        self._cancel_requested = False

    def _headers(self) -> dict:
        return {
            "X-Machine-Id": self.machine_id,
            "X-Agent-Token": self.agent_token,
            "Content-Type": "application/json",
        }

    def _update_status(
        self,
        job_id: str,
        status: str,
        commit_sha: Optional[str] = None,
        exit_code: Optional[int] = None,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
    ):
        url = f"{self.central_url}/api/agent/jobs/{job_id}/status"
        payload = {
            "status": status,
            "commit_sha": commit_sha,
            "exit_code": exit_code,
            "error_message": error_message,
            "error_type": error_type or "NONE",
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                client.post(url, json=payload, headers=self._headers())
        except Exception as e:
            logger.warning(f"Failed to report status update for {job_id}: {e}")

    def _report_completion(
        self,
        job_id: str,
        status: str,
        commit_sha: Optional[str] = None,
        exit_code: Optional[int] = 0,
        error_message: Optional[str] = None,
        error_type: Optional[str] = None,
    ):
        url = f"{self.central_url}/api/agent/jobs/{job_id}/complete"
        payload = {
            "status": status,
            "commit_sha": commit_sha,
            "exit_code": exit_code,
            "error_message": error_message,
            "error_type": error_type or "NONE",
        }
        try:
            with httpx.Client(timeout=10.0) as client:
                client.post(url, json=payload, headers=self._headers())
        except Exception as e:
            logger.error(f"Failed to report completion for {job_id}: {e}")

    def _kill_process_tree(self, pid: int):
        """Safely and recursively terminate all child processes and the parent"""
        try:
            parent = psutil.Process(pid)
            children = parent.children(recursive=True)
            for child in children:
                try:
                    child.terminate()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
            parent.terminate()
            
            # Wait up to 3 seconds for graceful shutdown
            _, alive = psutil.wait_procs(children + [parent], timeout=3.0)
            for p in alive:
                try:
                    p.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
        except Exception as e:
            logger.warning(f"Error terminating process tree {pid}: {e}")

    def execute_job(self, dispatch: dict):
        job_id = dispatch["job_id"]
        repo_url = dispatch["repository_url"]
        branch = dispatch.get("branch", "main")
        commit_sha = dispatch.get("commit_sha")
        entry_point = dispatch.get("entry_point", "main.py")
        parameters = dispatch.get("parameters", [])
        env_vars = dispatch.get("environment_variables", {})
        timeout_seconds = dispatch.get("timeout_seconds", 1800)
        github_token = dispatch.get("github_token")

        workspace_dir = agent_config.jobs_path / job_id
        env_dir = agent_config.environments_path / job_id

        log_manager = LogManager(self.central_url, self.machine_id, self.agent_token, job_id)
        log_manager.start()

        def log(msg: str, level: str = "INFO"):
            log_manager.log(msg, level)
            logger.info(f"[{job_id}] {msg}")

        resolved_sha = commit_sha
        self._cancel_requested = False

        try:
            log(f"==================================================")
            log(f"  STARTING JOB EXECUTION: {job_id}")
            log(f"  Target Machine: {agent_config.MACHINE_NAME} ({self.machine_id})")
            log(f"  Repository: {repo_url} (Branch: {branch})")
            log(f"  Entry Point: {entry_point}")
            log(f"==================================================")

            # -------------------------------------------------------------
            # STEP 1: PREPARE WORKSPACE & CLONE / CHECKOUT GIT REPO
            # -------------------------------------------------------------
            self._update_status(job_id, "PREPARING")
            log("[Step 1/4] Preparing workspace and checking out source code...")
            resolved_sha = git_manager.clone_or_checkout(
                repo_url=repo_url,
                target_dir=workspace_dir,
                branch=branch,
                commit_sha=commit_sha,
                github_token=github_token,
                log_callback=log,
            )
            self._update_status(job_id, "PREPARING", commit_sha=resolved_sha)

            # -------------------------------------------------------------
            # STEP 2: PREPARE ISOLATED VIRTUAL ENVIRONMENT & DEPENDENCIES
            # -------------------------------------------------------------
            self._update_status(job_id, "INSTALLING_DEPENDENCIES", commit_sha=resolved_sha)
            log("[Step 2/4] Setting up dedicated virtual environment...")
            venv_python = environment_manager.create_isolated_environment(
                env_path=env_dir,
                log_callback=log,
            )

            log("[Step 3/4] Installing project dependencies into isolated environment...")
            environment_manager.install_dependencies(
                venv_python=venv_python,
                workspace_dir=workspace_dir,
                log_callback=log,
            )

            # -------------------------------------------------------------
            # STEP 3: VALIDATE ENTRY POINT & PREPARE ENVIRONMENT
            # -------------------------------------------------------------
            script_path = (workspace_dir / entry_point).resolve()
            # Prevent path traversal
            if not str(script_path).startswith(str(workspace_dir.resolve())):
                raise ValueError(f"Entry point path traversal violation: {entry_point}")
            
            if not script_path.exists():
                raise FileNotFoundError(f"Entry point script '{entry_point}' not found in workspace: {script_path}")

            job_env = os.environ.copy()
            job_env.update(env_vars)
            job_env["PYTHONUNBUFFERED"] = "1"
            job_env["ORCHESTRATOR_JOB_ID"] = job_id
            job_env["ORCHESTRATOR_MACHINE_ID"] = self.machine_id

            # -------------------------------------------------------------
            # STEP 4: EXECUTE SCRIPT WITH REAL-TIME LOG STREAMING
            # -------------------------------------------------------------
            self._update_status(job_id, "RUNNING", commit_sha=resolved_sha)
            log(f"[Step 4/4] Launching Python process: {venv_python.name} {entry_point} {' '.join(parameters)}")
            log(f"Process starting at {datetime.now(timezone.utc).isoformat()}...")

            cmd = [str(venv_python), str(script_path), *parameters]
            
            proc = subprocess.Popen(
                cmd,
                cwd=str(workspace_dir),
                env=job_env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
            )
            self.current_process = proc

            # Reader threads for real-time stdout and stderr
            def read_stream(stream, level):
                for line in iter(stream.readline, ''):
                    if not line:
                        break
                    clean_line = line.rstrip("\r\n")
                    if clean_line:
                        log(clean_line, level=level)
                stream.close()

            stdout_thread = threading.Thread(target=read_stream, args=(proc.stdout, "INFO"), daemon=True)
            stderr_thread = threading.Thread(target=read_stream, args=(proc.stderr, "ERROR"), daemon=True)

            stdout_thread.start()
            stderr_thread.start()

            # Wait with timeout monitoring
            start_time = time.time()
            is_timeout = False

            while proc.poll() is None:
                elapsed = time.time() - start_time
                if elapsed > timeout_seconds:
                    is_timeout = True
                    log(f"ERROR: Execution exceeded timeout limit of {timeout_seconds}s. Terminating process...", level="ERROR")
                    self._kill_process_tree(proc.pid)
                    break
                if self._cancel_requested:
                    log("WARNING: Job cancellation received. Terminating process tree...", level="WARNING")
                    self._kill_process_tree(proc.pid)
                    break
                time.sleep(0.2)

            stdout_thread.join(timeout=2.0)
            stderr_thread.join(timeout=2.0)
            
            exit_code = proc.returncode if not is_timeout and not self._cancel_requested else (1 if is_timeout else -1)

            if is_timeout:
                self._report_completion(
                    job_id=job_id,
                    status="TIMEOUT",
                    commit_sha=resolved_sha,
                    exit_code=exit_code,
                    error_message=f"Execution timed out after {timeout_seconds} seconds",
                    error_type="APPLICATION_ERROR",
                )
            elif self._cancel_requested:
                self._report_completion(
                    job_id=job_id,
                    status="CANCELLED",
                    commit_sha=resolved_sha,
                    exit_code=exit_code,
                    error_message="Job execution manually stopped by user",
                )
            elif exit_code == 0:
                log(f"Job completed successfully. Exit code: 0", level="INFO")
                self._report_completion(
                    job_id=job_id,
                    status="SUCCESS",
                    commit_sha=resolved_sha,
                    exit_code=0,
                )
            else:
                log(f"Job execution failed with non-zero exit code: {exit_code}", level="ERROR")
                self._report_completion(
                    job_id=job_id,
                    status="FAILED",
                    commit_sha=resolved_sha,
                    exit_code=exit_code,
                    error_message=f"Process exited with non-zero code {exit_code}",
                    error_type="APPLICATION_ERROR",
                )

        except Exception as e:
            err_msg = f"Job preparation or execution exception: {str(e)}"
            log(err_msg, level="ERROR")
            self._report_completion(
                job_id=job_id,
                status="FAILED",
                commit_sha=resolved_sha,
                exit_code=1,
                error_message=err_msg,
                error_type="INFRASTRUCTURE_ERROR",
            )
        finally:
            self.current_process = None
            if agent_config.CLEANUP_AFTER_JOB:
                log("Cleaning up workspace and environment directories...")
                environment_manager.cleanup_directory(workspace_dir)
                if not agent_config.KEEP_ENVIRONMENT:
                    environment_manager.cleanup_directory(env_dir)

            log_manager.stop()
            logger.info(f"Finished execution cycle for job {job_id}")
