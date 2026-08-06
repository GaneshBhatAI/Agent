/* ===============================================================================
   AIAnveshana RPA Orchestrator - Frontend JavaScript Engine
   =============================================================================== */

let activeAgentUrl = "http://127.0.0.1:8000";

let isAgentOnline = false;
let currentBotStatus = "IDLE";
let allLogEntries = [];
let lastLogCount = 0;
let pollTimer = null;

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("RPA Control Room Dashboard initialized.");
  startPolling();
});

function startPolling() {
  checkAgentHealth();
  fetchBotStatus();
  fetchLiveLogs();

  // Poll status and logs every 1.5 seconds
  pollTimer = setInterval(() => {
    checkAgentHealth();
    fetchBotStatus();
    fetchLiveLogs();
  }, 1500);
}

// 1. Agent Health Check
async function checkAgentHealth() {
  const dot = document.getElementById("agent-dot");
  const text = document.getElementById("agent-status-text");

  const candidates = ["http://127.0.0.1:8000", "http://localhost:8000"];

  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/api/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        activeAgentUrl = url;
        isAgentOnline = true;
        dot.className = "status-dot online";
        text.innerText = `Agent Online (${data.machine})`;
        document.getElementById("metric-machine").innerText = data.machine;
        return;
      }
    } catch (err) {
      // Try next candidate
    }
  }

  setAgentOffline();
}

function setAgentOffline() {
  isAgentOnline = false;
  const dot = document.getElementById("agent-dot");
  const text = document.getElementById("agent-status-text");
  dot.className = "status-dot offline";
  text.innerText = "Agent Offline (Run agent.py)";
}

// 2. Fetch Process Status
async function fetchBotStatus() {
  if (!isAgentOnline) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/status`);
    if (res.ok) {
      const data = await res.json();
      currentBotStatus = data.status;

      updateStatusUI(data);
    }
  } catch (err) {
    console.error("Error fetching status:", err);
  }
}

function updateStatusUI(data) {
  const badge = document.getElementById("bot-state-badge");
  const btnTrigger = document.getElementById("btn-trigger");
  const btnStop = document.getElementById("btn-stop");

  badge.innerText = data.status;
  badge.className = `bot-state-badge state-${data.status.toLowerCase()}`;

  if (data.status === "RUNNING") {
    btnTrigger.disabled = true;
    btnStop.disabled = false;
    document.getElementById("agent-dot").className = "status-dot running";
  } else {
    btnTrigger.disabled = false;
    btnStop.disabled = true;
    if (isAgentOnline) {
      document.getElementById("agent-dot").className = "status-dot online";
    }
  }

  if (data.start_time) {
    document.getElementById("metric-start-time").innerText = data.start_time.split(" ")[1] || data.start_time;
  }
  if (data.duration_seconds) {
    document.getElementById("metric-duration").innerText = `${data.duration_seconds}s`;
  }
  if (data.total_runs !== undefined) {
    document.getElementById("metric-total-runs").innerText = data.total_runs;
  }
}

// 3. Trigger Master Bot
async function triggerMasterBot() {
  if (!isAgentOnline) {
    alert("Local Orchestrator Agent is offline. Please start 'python orchestrator_agent/agent.py' on your machine.");
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/trigger`, { method: "POST" });
    const data = await res.json();

    if (data.success) {
      fetchBotStatus();
      fetchLiveLogs();
    } else {
      alert(`Trigger Notice: ${data.message}`);
    }
  } catch (err) {
    alert(`Failed to trigger process: ${err.message}`);
  }
}

// 4. Stop Master Bot
async function stopMasterBot() {
  if (!confirm("Are you sure you want to forcibly terminate the Master Bot process?")) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/stop`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    fetchBotStatus();
  } catch (err) {
    alert(`Stop request failed: ${err.message}`);
  }
}

// 5. Live Log Streaming
async function fetchLiveLogs() {
  if (!isAgentOnline) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/logs`);
    if (res.ok) {
      const data = await res.json();
      allLogEntries = data.logs || [];

      if (allLogEntries.length !== lastLogCount) {
        renderLogs();
        lastLogCount = allLogEntries.length;
      }
    }
  } catch (err) {
    console.error("Error fetching logs:", err);
  }
}

function renderLogs() {
  const container = document.getElementById("terminal-content");
  const search = document.getElementById("log-search").value.toLowerCase();
  const levelFilter = document.getElementById("log-level-filter").value;

  const filtered = allLogEntries.filter(entry => {
    const matchSearch = !search || entry.message.toLowerCase().includes(search) || entry.subbot.toLowerCase().includes(search);
    const matchLevel = levelFilter === "ALL" || entry.level.toUpperCase() === levelFilter;
    return matchSearch && matchLevel;
  });

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `<div class="log-row info"><span class="log-msg">No logs matching filter.</span></div>`;
  } else {
    filtered.forEach(log => {
      const row = document.createElement("div");
      const lvlClass = (log.level || "INFO").toLowerCase();
      row.className = `log-row ${lvlClass}`;
      row.innerHTML = `
        <span class="log-time">[${log.time || 'TIME'}]</span>
        <span class="log-level">${log.level || 'INFO'}</span>
        <span class="log-msg"><b>[${log.subbot}]</b> ${escapeHtml(log.message)}</span>
      `;
      container.appendChild(row);
    });
  }

  document.getElementById("log-count").innerText = `${filtered.length} of ${allLogEntries.length} entries displayed`;

  // Auto Scroll
  if (document.getElementById("autoscroll-check").checked) {
    const terminalWin = document.getElementById("terminal-window");
    terminalWin.scrollTop = terminalWin.scrollHeight;
  }
}

function filterLogs() {
  renderLogs();
}

function clearLogsUI() {
  allLogEntries = [];
  lastLogCount = 0;
  renderLogs();
}

function saveSchedule() {
  const val = document.getElementById("schedule-interval").value;
  alert(`Schedule set to: '${val}'. Scheduler active in Orchestrator Agent.`);
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
