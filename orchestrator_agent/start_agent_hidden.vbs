Set WshShell = CreateObject("WScript.Shell")
' Window mode 7 = Minimized agent console in taskbar, allowing child browser windows (Playwright) to pop up visibly on screen!
WshShell.Run """C:\Users\GaneshBhat\AppData\Local\Programs\Python\Python314\python.exe"" ""c:\Users\GaneshBhat\Documents\PROD\orchestrator_agent\agent.py""", 7, False
