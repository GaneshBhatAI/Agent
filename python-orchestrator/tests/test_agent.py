import os
import shutil
import sys
import tempfile
from pathlib import Path
import pytest

# Add agent directory to sys.path
agent_path = Path(__file__).parent.parent / "agent"
sys.path.insert(0, str(agent_path))

from environment_manager import environment_manager
from git_manager import git_manager
from system_info import SystemInfo


def test_system_info_metrics():
    metrics = SystemInfo.collect_metrics()
    assert "hostname" in metrics
    assert "operating_system" in metrics
    assert "python_version" in metrics
    assert isinstance(metrics["cpu_usage"], float)
    assert isinstance(metrics["memory_usage"], float)
    assert isinstance(metrics["disk_usage"], float)


def test_git_manager_demo_checkout():
    with tempfile.TemporaryDirectory() as tmp_dir:
        target_path = Path(tmp_dir) / "workspace"
        logs = []
        
        sha = git_manager.clone_or_checkout(
            repo_url="https://github.com/orchestrator-demo/hello-bot",
            target_dir=target_path,
            branch="main",
            log_callback=lambda msg, lvl: logs.append(msg),
        )

        assert len(sha) >= 10
        assert (target_path / "main.py").exists()
        assert (target_path / "requirements.txt").exists()
        assert len(logs) > 0


def test_environment_manager_venv_and_install():
    with tempfile.TemporaryDirectory() as tmp_dir:
        env_dir = Path(tmp_dir) / "venv"
        workspace_dir = Path(tmp_dir) / "workspace"
        workspace_dir.mkdir(parents=True, exist_ok=True)
        (workspace_dir / "requirements.txt").write_text("# empty requirements\n")

        logs = []
        venv_python = environment_manager.create_isolated_environment(
            env_path=env_dir,
            log_callback=lambda msg, lvl: logs.append(msg),
        )

        assert venv_python.exists()
        
        # Test install dependencies
        environment_manager.install_dependencies(
            venv_python=venv_python,
            workspace_dir=workspace_dir,
            log_callback=lambda msg, lvl: logs.append(msg),
        )
