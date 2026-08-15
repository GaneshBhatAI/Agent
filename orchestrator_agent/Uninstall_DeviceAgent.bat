@echo off
REM ===============================================================================
REM AI Anveshana Windows Bot Agent - Uninstaller
REM ===============================================================================
title AI Anveshana Bot Agent - Uninstall

echo.
echo =======================================================================
echo    AI ANVESHANA BOT AGENT - UNINSTALLER
echo =======================================================================
echo.

set TASK_NAME=AIAnveshanaDeviceAgent

echo Stopping active background agent processes...
taskkill /f /im python.exe /fi "WINDOWTITLE eq AIAnveshana*" >nul 2>&1

echo Removing Windows Auto-Start Scheduled Task...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

if exist "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Start_AIAnveshana_Agent.vbs" (
    del /f /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Start_AIAnveshana_Agent.vbs" >nul 2>&1
)

echo.
echo =======================================================================
echo  SUCCESS: AI Anveshana Bot Agent has been uninstalled.
echo =======================================================================
echo.
pause
