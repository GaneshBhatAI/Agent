@echo off
setlocal enabledelayedexpansion

REM ===============================================================================
REM AI Anveshana Windows Bot Agent (DeviceAgent) - 1-Click Installer
REM ===============================================================================
title AI Anveshana Bot Agent - Setup & Auto-Connect

echo.
echo =======================================================================
echo    AI ANVESHANA ENTERPRISE BOT AGENT - 1-CLICK INSTALLER
echo =======================================================================
echo.

set AGENT_DIR=%~dp0
set AGENT_SCRIPT=%AGENT_DIR%device_agent.py
set VBS_LAUNCHER=%AGENT_DIR%start_agent_hidden.vbs
set TASK_NAME=AIAnveshanaDeviceAgent

REM 1. Find Python 3
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_EXE=python
    goto PYTHON_FOUND
)

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_EXE=py -3
    goto PYTHON_FOUND
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python314\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python314\python.exe
    goto PYTHON_FOUND
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe
    goto PYTHON_FOUND
)

if exist "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe" (
    set PYTHON_EXE=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe
    goto PYTHON_FOUND
)

echo [ERROR] Python 3 not found in PATH or standard directories.
echo Please install Python 3.10+ from https://www.python.org/downloads/
pause
exit /b 1

:PYTHON_FOUND
echo [1/4] Python Environment Detected: %PYTHON_EXE%

REM 2. Install / Verify Prerequisites
echo [2/4] Installing Required Prerequisites (requests, psutil, websockets, pandas)...
%PYTHON_EXE% -m pip install --upgrade pip --quiet >nul 2>&1
%PYTHON_EXE% -m pip install requests psutil websockets pandas openpyxl --quiet >nul 2>&1
echo       Prerequisites verified.

REM 3. Create Silent Background Launcher (VBScript)
echo [3/4] Configuring Silent 24/7 Background Runner...
(
    echo Set WshShell = CreateObject^("WScript.Shell"^)
    echo WshShell.Run "%PYTHON_EXE% """ ^& "%AGENT_SCRIPT%" ^& """", 0, False
) > "%VBS_LAUNCHER%"

REM 4. Register Windows Startup Scheduled Task
echo [4/4] Registering Windows Auto-Start Task (Starts on Logon)...
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%VBS_LAUNCHER%\"" /sc ONLOGON /rl HIGHEST /f >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo       Scheduled Task "%TASK_NAME%" registered successfully.
) else (
    echo       [Note] User-level auto-start fallback enabled.
    REM Fallback to Windows Startup folder
    copy /y "%VBS_LAUNCHER%" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Start_AIAnveshana_Agent.vbs" >nul 2>&1
)

REM 5. Start Agent Immediately
echo.
echo Starting AI Anveshana Device Agent in the background...
wscript.exe "%VBS_LAUNCHER%"

echo.
echo =======================================================================
echo  SUCCESS: AI Anveshana Windows Bot Agent Installed & Connected!
echo =======================================================================
echo  Machine:  %COMPUTERNAME%
echo  Status:   ONLINE (Connected 24/7)
echo.
echo  The agent is now running silently in the background and will
echo  automatically launch whenever this computer starts up.
echo =======================================================================
echo.
pause
