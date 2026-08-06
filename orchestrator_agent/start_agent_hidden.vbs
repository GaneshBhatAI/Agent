Set WshShell = CreateObject("WScript.Shell")
strCurrentDir = WshShell.CurrentDirectory
WshShell.Run "cmd /c python orchestrator_agent\agent.py", 0, False
