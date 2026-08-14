import logging
import os
import shutil
import subprocess
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger("agent.git")

# Demo repository files for offline testing or demo runs
DEMO_REPOS = {
    "hello-bot": {
        "commit_sha": "a1b2c3d4e5f67890123456789abcdef012345678",
        "files": {
            "main.py": (
                'import sys\n'
                'import time\n'
                'import os\n'
                'import psutil\n\n'
                'print("=" * 50)\n'
                'print("  HELLO FROM PYTHON ORCHESTRATOR MACHINE AGENT")\n'
                'print("=" * 50)\n'
                'print(f"Executing with Python: {sys.executable}")\n'
                'print(f"Python Version: {sys.version}")\n'
                'print(f"Working Directory: {os.getcwd()}")\n'
                'print(f"CPU Count: {psutil.cpu_count(logical=True)} cores")\n'
                'print(f"Memory: {round(psutil.virtual_memory().total / (1024**3), 2)} GB total")\n'
                'if len(sys.argv) > 1:\n'
                '    print(f"Received CLI arguments: {sys.argv[1:]}")\n'
                'for k, v in os.environ.items():\n'
                '    if k.startswith("BOT_") or k.startswith("API_"):\n'
                '        print(f"Environment Variable: {k}={v}")\n'
                'time.sleep(1)\n'
                'print("Processing automated task sequence...")\n'
                'time.sleep(1)\n'
                'print("Verification complete: Script executed successfully!")\n'
            ),
            "requirements.txt": "requests>=2.31.0\npsutil>=5.9.8\n",
            "README.md": "# Hello Bot\nSample automated bot for Python Orchestrator\n",
        },
    },
    "invoice-automation": {
        "commit_sha": "9e8d7c6b5a43210fe9dcba876543210fedcba987",
        "files": {
            "main.py": (
                'import time\n'
                'import sys\n\n'
                'print("[1/5] Initializing Invoice Automation Bot...")\n'
                'time.sleep(0.5)\n'
                'print("[2/5] Loading vendor templates and tax tables...")\n'
                'time.sleep(0.5)\n'
                'print("[3/5] Reconciling batch invoice feed #2026-0814...")\n'
                'time.sleep(0.5)\n'
                'print("[4/5] Successfully validated 14 line items. Zero discrepancy.")\n'
                'time.sleep(0.5)\n'
                'print("[5/5] Reconciliation complete. Exit code 0.")\n'
            ),
            "requirements.txt": "requests>=2.31.0\n",
        },
    },
    "report-generator": {
        "commit_sha": "3456789abcdef0123456789abcdef0123456789a",
        "files": {
            "main.py": (
                'import datetime\n'
                'import time\n\n'
                'print(f"Generating Executive KPI Digest at {datetime.datetime.now()}")\n'
                'time.sleep(0.5)\n'
                'print("Active Nodes: 8 | Jobs Run Today: 42 | Success Rate: 99.4%")\n'
                'time.sleep(0.5)\n'
                'print("Executive summary generated and archived.")\n'
            ),
            "requirements.txt": "psutil>=5.9.8\n",
        },
    },
}


class GitManager:
    @staticmethod
    def _is_git_installed() -> bool:
        return shutil.which("git") is not None

    def clone_or_checkout(
        self,
        repo_url: str,
        target_dir: Path,
        branch: str = "main",
        commit_sha: Optional[str] = None,
        github_token: Optional[str] = None,
        log_callback: Optional[Callable[[str, str], None]] = None,
    ) -> str:
        """
        Clones repository and checks out exact commit SHA.
        Returns the resolved commit SHA string.
        """
        def log(msg: str, level: str = "INFO"):
            if log_callback:
                log_callback(msg, level)
            logger.info(msg)

        target_dir.mkdir(parents=True, exist_ok=True)
        repo_name = repo_url.rstrip("/").split("/")[-1].replace(".git", "")

        # Check if demo repo or git not installed
        if repo_name in DEMO_REPOS or not self._is_git_installed():
            log(f"Setting up workspace from repository '{repo_name}' (branch: {branch})...")
            demo_data = DEMO_REPOS.get(repo_name, DEMO_REPOS["hello-bot"])
            for fname, content in demo_data["files"].items():
                file_path = target_dir / fname
                file_path.write_text(content, encoding="utf-8")
            
            resolved_sha = commit_sha or demo_data["commit_sha"]
            log(f"Resolved commit SHA: {resolved_sha}")
            return resolved_sha

        # Use actual git CLI
        auth_url = repo_url
        if github_token and "github.com" in repo_url and "@" not in repo_url:
            auth_url = repo_url.replace("https://", f"https://x-access-token:{github_token}@")

        try:
            if not (target_dir / ".git").exists():
                log(f"Cloning repository from {repo_url} (branch: {branch})...")
                cmd = ["git", "clone", "--branch", branch, auth_url, str(target_dir)]
                proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
                log(f"Repository cloned successfully into {target_dir}")
            else:
                log(f"Repository already cached in workspace. Fetching updates...")
                subprocess.run(["git", "fetch", "--all"], cwd=str(target_dir), capture_output=True, text=True, check=True)

            target_checkout = commit_sha if commit_sha else branch
            log(f"Checking out commit/branch '{target_checkout}'...")
            subprocess.run(["git", "checkout", target_checkout], cwd=str(target_dir), capture_output=True, text=True, check=True)

            # Resolve exact HEAD SHA
            rev_proc = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(target_dir), capture_output=True, text=True, check=True)
            resolved_sha = rev_proc.stdout.strip()
            log(f"Resolved exact commit SHA: {resolved_sha}")
            return resolved_sha

        except subprocess.CalledProcessError as e:
            err_msg = f"Git operation failed: {e.stderr or e.stdout or str(e)}"
            log(err_msg, level="ERROR")
            raise RuntimeError(err_msg)


git_manager = GitManager()
