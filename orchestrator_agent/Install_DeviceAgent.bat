@echo off
title AI Anveshana Device Agent Setup
echo ===============================================================================
echo                AI Anveshana Windows Bot Agent - Setup & Run
echo ===============================================================================
echo.
cd /d "%~dp0"

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and check "Add Python to PATH".
    pause
    exit /b 1
)

echo [2/3] Installing lightweight dependencies (psutil, requests)...
python -m pip install --quiet --upgrade psutil requests >nul 2>&1

echo [3/3] Starting AI Anveshana Background Device Agent...
start "" pythonw "%~dp0device_agent.py"

echo.
echo ===============================================================================
echo [SUCCESS] Device Agent is now running in the background!
echo It will automatically connect to your Orchestrator and listen for bot runs.
echo ===============================================================================
echo.
pause
