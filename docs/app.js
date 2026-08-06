/* ===============================================================================
   AIAnveshana Automation - Multi-Bot Orchestrator Frontend Engine
   =============================================================================== */

let activeAgentUrl = "http://127.0.0.1:8000";
let isAgentOnline = false;
let allDiscoveredBots = [];
let selectedFolder = "all";
let currentModalBot = null;
let currentModalLogs = [];
let pollTimer = null;

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", () => {
  console.log("AIAnveshana Control Room Dashboard initialized.");
  const savedUrl = localStorage.getItem("customAgentUrl");
  if (savedUrl && document.getElementById("custom-agent-url")) {
    document.getElementById("custom-agent-url").value = savedUrl;
  }
  startPolling();
});

function saveCustomAgentUrl() {
  const input = document.getElementById("custom-agent-url");
  const val = input ? input.value.trim() : "";
  if (val) {
    localStorage.setItem("customAgentUrl", val);
  } else {
    localStorage.removeItem("customAgentUrl");
  }
  checkAgentHealth();
  fetchBotsList();
}

function startPolling() {
  checkAgentHealth();
  fetchBotsList();

  pollTimer = setInterval(() => {
    checkAgentHealth();
    fetchBotsList();
    if (currentModalBot) {
      fetchModalLogs();
    }
  }, 1500);
}

// 1. Agent Health Check
async function checkAgentHealth() {
  const dot = document.getElementById("agent-dot");
  const text = document.getElementById("agent-status-text");

  const custom = localStorage.getItem("customAgentUrl");
  const candidates = [];
  if (custom) candidates.push(custom);
  candidates.push("http://127.0.0.1:8000", "http://localhost:8000");

  for (const url of candidates) {
    const cleanUrl = url.replace(/\/$/, "");
    try {
      const res = await fetch(`${cleanUrl}/api/health`, { method: "GET" });
      if (res.ok) {
        const data = await res.json();
        activeAgentUrl = cleanUrl;
        isAgentOnline = true;
        dot.className = "status-dot online";
        text.innerText = `Online (${data.machine})`;
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
  text.innerText = "Agent Offline";
}

// 2. Fetch Multi-Bot Repository List
async function fetchBotsList() {
  if (!isAgentOnline) {
    renderBotsTable([]);
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/bots`);
    if (res.ok) {
      const data = await res.json();
      allDiscoveredBots = data.bots || [];
      renderFolderTree();
      renderBotsTable();
    }
  } catch (err) {
    console.error("Error fetching bots:", err);
  }
}

// Render Left Sidebar Folder Tree
function renderFolderTree() {
  const container = document.getElementById("tree-sub-items");
  const folders = [...new Set(allDiscoveredBots.map(b => b.folder))];

  container.innerHTML = "";
  folders.forEach(folder => {
    const item = document.createElement("div");
    item.className = `tree-sub-item ${selectedFolder === folder ? 'active' : ''}`;
    item.innerHTML = `📁 ${folder}`;
    item.onclick = () => selectFolder(folder);
    container.appendChild(item);
  });
}

function selectFolder(folder) {
  selectedFolder = folder;
  document.getElementById("folder-view-title").innerText = folder === "all" ? "Files and folders" : `Bots / ${folder}`;
  renderBotsTable();
}

// Render Main Bot Repository Data Table
function renderBotsTable() {
  const tbody = document.getElementById("bots-table-body");
  const search = document.getElementById("table-search-input").value.toLowerCase();

  const filtered = allDiscoveredBots.filter(b => {
    const matchFolder = selectedFolder === "all" || b.folder === selectedFolder;
    const matchSearch = !search || b.name.toLowerCase().includes(search) || b.folder.toLowerCase().includes(search);
    return matchFolder && matchSearch;
  });

  document.getElementById("bot-count-badge").innerText = `(${filtered.length})`;
  tbody.innerHTML = "";

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No process bots found matching criteria.</td></tr>`;
    return;
  }

  filtered.forEach(bot => {
    const tr = document.createElement("tr");

    const statusBadge = `<span class="badge-status status-${bot.status}">${bot.status}</span>`;
    const isRunning = bot.status === "RUNNING";

    tr.innerHTML = `
      <td><input type="checkbox"></td>
      <td>📁</td>
      <td>
        <span class="bot-name-link" onclick="openLogModal('${bot.id}')">${bot.name}</span>
      </td>
      <td>${bot.folder}</td>
      <td>${statusBadge}</td>
      <td>${bot.last_run !== '--' ? bot.last_run : bot.last_modified}</td>
      <td>${bot.platform}</td>
      <td>
        <div class="action-btn-group">
          <button class="btn-act btn-run" onclick="triggerBot('${bot.id}', '${bot.path}')" ${isRunning ? 'disabled' : ''}>▶ Run</button>
          <button class="btn-act btn-stop" onclick="stopBot('${bot.id}')" ${!isRunning ? 'disabled' : ''}>⏹ Stop</button>
          <button class="btn-act btn-log" onclick="openLogModal('${bot.id}')">📋 Logs</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterBotsTable() {
  renderBotsTable();
}

// Trigger Specific Bot Execution
async function triggerBot(botId, botPath) {
  if (!isAgentOnline) {
    alert("Local Agent is offline. Run 'python orchestrator_agent/agent.py' on your machine.");
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, bot_path: botPath })
    });
    const data = await res.json();
    alert(data.message);
    fetchBotsList();
  } catch (err) {
    alert(`Trigger failed: ${err.message}`);
  }
}

// Stop Running Bot Process
async function stopBot(botId) {
  if (!confirm("Are you sure you want to terminate this process bot execution?")) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/stop`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    fetchBotsList();
  } catch (err) {
    alert(`Stop failed: ${err.message}`);
  }
}

// LOG MODAL DRAWER
function openLogModal(botId) {
  const bot = allDiscoveredBots.find(b => b.id === botId);
  if (!bot) return;

  currentModalBot = bot;
  document.getElementById("modal-bot-name").innerText = `${bot.name} Logs`;
  document.getElementById("modal-bot-path").innerText = bot.folder;
  document.getElementById("log-modal").classList.add("active");

  fetchModalLogs();
}

function closeLogModal() {
  currentModalBot = null;
  document.getElementById("log-modal").classList.remove("active");
}

async function fetchModalLogs() {
  if (!isAgentOnline || !currentModalBot) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/logs?process_name=${encodeURIComponent(currentModalBot.name)}`);
    if (res.ok) {
      const data = await res.json();
      currentModalLogs = data.logs || [];
      renderModalLogs();
    }
  } catch (err) {
    console.error("Error fetching modal logs:", err);
  }
}

function renderModalLogs() {
  const container = document.getElementById("modal-terminal-content");
  const search = document.getElementById("log-modal-search").value.toLowerCase();
  const level = document.getElementById("log-modal-level").value;

  const filtered = currentModalLogs.filter(l => {
    const matchSearch = !search || l.message.toLowerCase().includes(search) || l.subbot.toLowerCase().includes(search);
    const matchLevel = level === "ALL" || l.level.toUpperCase() === level;
    return matchSearch && matchLevel;
  });

  container.innerHTML = "";
  if (filtered.length === 0) {
    container.innerHTML = `<div class="log-row info"><span class="log-msg">No logs matching criteria for this process.</span></div>`;
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

  document.getElementById("modal-log-count").innerText = `${filtered.length} of ${currentModalLogs.length} entries displayed`;
}

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
