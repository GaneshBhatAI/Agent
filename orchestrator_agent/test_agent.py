import os
import sys

# Ensure we are in the correct directory
agent_dir = r"c:\Users\GaneshBhat\Documents\PROD\orchestrator_agent"
sys.path.insert(0, agent_dir)

import device_agent

# Create a mock script to execute
workspace_dir = device_agent.CONFIG["workspace_dir"]
os.makedirs(workspace_dir, exist_ok=True)
mock_script_path = os.path.join(workspace_dir, "test_bot.py")
with open(mock_script_path, "w") as f:
    f.write("print('Hello from isolated bot!')\n")
    f.write("import sys\n")
    f.write("print(f'Running with Python: {sys.executable}')\n")
    f.write("import time\n")
    f.write("time.sleep(1)\n")

# Mock the Supabase request function
def mock_supabase_request(endpoint, method="GET", data=None):
    if "job_logs" in endpoint:
        print(f"  [LOG to Supabase] {data.get('level')}: {data.get('message')}")
    elif "jobs?status=eq.QUEUED" in endpoint:
        return [{
            "job_id": "test_job_123",
            "entry_point": "test_bot.py",
            "repository_url": "",
            "branch": "main"
        }]
    return []

device_agent.supabase_request = mock_supabase_request

print("Starting test execution...")
device_agent.check_and_execute_jobs()
print("Test finished.")
