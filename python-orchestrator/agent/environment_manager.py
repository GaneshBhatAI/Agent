import logging
import os
import platform
import shutil
import subprocess
import sys
import venv
from pathlib import Path
from typing import Callable, Optional

logger = logging.getLogger("agent.environment")


class EnvironmentManager:
    @staticmethod
    def get_venv_python_executable(env_path: Path) -> Path:
        """Resolve the python interpreter path inside an isolated virtual environment"""
        if platform.system() == "Windows":
            exe = env_path / "Scripts" / "python.exe"
        else:
            exe = env_path / "bin" / "python"
        return exe

    def create_isolated_environment(
        self,
        env_path: Path,
        log_callback: Optional[Callable[[str, str], None]] = None,
    ) -> Path:
        """Create a dedicated Python virtual environment for the job"""
        def log(msg: str, level: str = "INFO"):
            if log_callback:
                log_callback(msg, level)
            logger.info(msg)

        log(f"Creating isolated virtual environment in {env_path}...")
        env_path.mkdir(parents=True, exist_ok=True)

        # Build virtual environment with pip included
        builder = venv.EnvBuilder(with_pip=True, clear=False, symlinks=False)
        builder.create(env_path)

        venv_python = self.get_venv_python_executable(env_path)
        if not venv_python.exists():
            # Fallback if standard venv python not found
            fallback = env_path / ("Scripts/python.exe" if platform.system() == "Windows" else "bin/python")
            if not fallback.exists():
                err = f"Virtualenv Python executable not found at expected location: {venv_python}"
                log(err, level="ERROR")
                raise RuntimeError(err)
            venv_python = fallback

        log(f"Virtual environment created successfully: {venv_python}")
        return venv_python

    def install_dependencies(
        self,
        venv_python: Path,
        workspace_dir: Path,
        log_callback: Optional[Callable[[str, str], None]] = None,
    ):
        """Detect and install dependencies from requirements.txt or pyproject.toml"""
        def log(msg: str, level: str = "INFO"):
            if log_callback:
                log_callback(msg, level)
            logger.info(msg)

        req_file = workspace_dir / "requirements.txt"
        pyproject_file = workspace_dir / "pyproject.toml"
        setup_file = workspace_dir / "setup.py"

        if req_file.exists():
            log(f"Found requirements.txt. Installing dependencies via pip...")
            cmd = [str(venv_python), "-m", "pip", "install", "-r", str(req_file)]
            try:
                proc = subprocess.Popen(
                    cmd,
                    cwd=str(workspace_dir),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                if proc.stdout:
                    for line in proc.stdout:
                        clean = line.rstrip()
                        if clean:
                            log(f"  [pip] {clean}")
                proc.wait()
                if proc.returncode != 0:
                    raise RuntimeError(f"pip install failed with exit code {proc.returncode}")
                log("Dependencies installed successfully from requirements.txt")
            except Exception as e:
                err_msg = f"Dependency installation error: {str(e)}"
                log(err_msg, level="ERROR")
                raise RuntimeError(err_msg)

        elif pyproject_file.exists() or setup_file.exists():
            log(f"Found pyproject.toml / setup.py. Installing package...")
            cmd = [str(venv_python), "-m", "pip", "install", "."]
            try:
                proc = subprocess.Popen(
                    cmd,
                    cwd=str(workspace_dir),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                if proc.stdout:
                    for line in proc.stdout:
                        clean = line.rstrip()
                        if clean:
                            log(f"  [pip] {clean}")
                proc.wait()
                if proc.returncode != 0:
                    raise RuntimeError(f"pip package install failed with exit code {proc.returncode}")
                log("Package installed successfully into virtual environment")
            except Exception as e:
                err_msg = f"Package installation error: {str(e)}"
                log(err_msg, level="ERROR")
                raise RuntimeError(err_msg)

        else:
            log("No requirements.txt or pyproject.toml found. Proceeding with standard library runtime.")

    def cleanup_directory(self, path: Path):
        """Safely clean up environment or workspace directory"""
        try:
            if path.exists():
                shutil.rmtree(path, ignore_errors=True)
                logger.info(f"Cleaned up directory: {path}")
        except Exception as e:
            logger.warning(f"Failed to cleanup {path}: {e}")


environment_manager = EnvironmentManager()
