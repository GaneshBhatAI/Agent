@echo off
REM ===============================================================================
REM Register AIAnveshana Orchestrator Agent in Windows Task Scheduler (24/7 Always Active)
REM ===============================================================================

set TASK_NAME=AIAnveshanaOrchestratorAgent
set PYTHON_PATH=C:\Users\GaneshBhat\AppData\Local\Programs\Python\Python314\python.exe
set AGENT_SCRIPT=c:\Users\GaneshBhat\Documents\PROD\orchestrator_agent\agent.py

echo Creating 24/7 Auto-Start Task in Windows Task Scheduler...

schtasks /create /tn "%TASK_NAME%" /tr "\"%PYTHON_PATH%\" \"%AGENT_SCRIPT%\"" /sc ONLOGON /rl HIGHEST /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================================
    echo SUCCESS: AIAnveshana Orchestrator Agent Task Registered!
    echo The agent will now start automatically whenever your machine boots up.
    echo =======================================================================
) else (
    echo.
    echo ERROR: Failed to register task. Please run this BAT file as Administrator.
)

pause
