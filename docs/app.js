/* ===============================================================================
   AIAnveshana Automation - Enterprise Control Room REST Client & Bot Scheduler
   =============================================================================== */

let activeAgentUrl = "http://127.0.0.1:8000";
let isAgentOnline = false;
let allDiscoveredBots = [];
let selectedFolderFilter = "all";
let pollInterval = null;
let currentModalBot = null;
let currentModalLogs = [];
let currentScheduleBot = null;

// INIT DISCOVERY & AGENT CONNECTION
document.addEventListener("DOMContentLoaded", () => {
  const savedUrl = localStorage.getItem("aianveshana_agent_url");
  if (savedUrl) {
    activeAgentUrl = savedUrl;
    document.getElementById("custom-agent-url").value = savedUrl;
  } else {
    document.getElementById("custom-agent-url").value = activeAgentUrl;
  }

  initAgentConnection();
});

function saveCustomAgentUrl() {
  const inputUrl = document.getElementById("custom-agent-url").value.trim();
  if (inputUrl) {
    activeAgentUrl = inputUrl.replace(/\/$/, "");
    localStorage.setItem("aianveshana_agent_url", activeAgentUrl);
    initAgentConnection();
  }
}

async function initAgentConnection() {
  updateStatusBadge("connecting", "Connecting...");
  const candidateUrls = [
    activeAgentUrl,
    "http://127.0.0.1:8000",
    "http://localhost:8000"
  ];

  let connected = false;
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ONLINE") {
          activeAgentUrl = url;
          isAgentOnline = true;
          connected = true;
          updateStatusBadge("online", `Online (${data.machine || 'GANESH'})`);
          break;
        }
      }
    } catch (e) {
      // Continue candidate search
    }
  }

  if (!connected) {
    isAgentOnline = false;
    updateStatusBadge("offline", "Agent Offline");
  }

  fetchBotsList();
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(refreshStateAndLogs, 4000);
}

function updateStatusBadge(state, text) {
  const dot = document.getElementById("agent-dot");
  const label = document.getElementById("agent-status-text");

  dot.className = `status-dot ${state}`;
  label.innerText = text;
}

// FETCH DISCOVERED BOTS
async function fetchBotsList() {
  const tbody = document.getElementById("bots-table-body");

  if (!isAgentOnline) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-loading" style="color: var(--status-red);">
          ⚠️ Orchestrator Agent Offline. Start agent.py at http://127.0.0.1:8000
        </td>
      </tr>`;
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/bots`);
    const data = await res.json();

    allDiscoveredBots = data.bots || [];
    renderFolderTree(allDiscoveredBots);
    renderBotsTable();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading" style="color: var(--status-red);">Error connecting to Agent API.</td></tr>`;
  }
}

// RENDER SIDEBAR FOLDER TREE
function renderFolderTree(bots) {
  const container = document.getElementById("tree-sub-items");
  container.innerHTML = "";

  const foldersSet = new Set(bots.map(b => b.folder));

  foldersSet.forEach(folderPath => {
    const div = document.createElement("div");
    div.className = `tree-sub-item ${selectedFolderFilter === folderPath ? 'active' : ''}`;
    div.innerText = `📁 ${folderPath}`;
    div.onclick = () => selectFolder(folderPath);
    container.appendChild(div);
  });
}

function selectFolder(folderPath) {
  selectedFolderFilter = folderPath;
  document.getElementById("folder-view-title").innerText = folderPath === "all" ? "Files and folders" : `Bots / ${folderPath}`;

  document.querySelectorAll(".tree-sub-item").forEach(item => item.classList.remove("active"));
  renderBotsTable();
}

function filterFolderTree(query) {
  const items = document.querySelectorAll(".tree-sub-item");
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(query.toLowerCase()) ? "block" : "none";
  });
}

// RENDER BOTS TABLE
function renderBotsTable() {
  const tbody = document.getElementById("bots-table-body");
  const searchVal = document.getElementById("table-search-input").value.toLowerCase();

  let filtered = allDiscoveredBots;

  if (selectedFolderFilter !== "all") {
    filtered = filtered.filter(b => b.folder === selectedFolderFilter);
  }

  if (searchVal) {
    filtered = filtered.filter(b => b.name.toLowerCase().includes(searchVal) || b.folder.toLowerCase().includes(searchVal));
  }

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
          <button class="btn-act btn-sch" onclick="openScheduleModal('${bot.id}')">⏰ Schedule</button>
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
    alert("Orchestrator Agent is offline! Please start agent.py first.");
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, bot_path: botPath })
    });
    const data = await res.json();

    if (data.success) {
      fetchBotsList();
    } else {
      alert(data.message || "Failed to trigger bot.");
    }
  } catch (err) {
    alert("Error triggering bot: " + err.message);
  }
}

// Stop Execution
async function stopBot(botId) {
  if (!confirm("Are you sure you want to stop this bot process?")) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/stop`, { method: "POST" });
    const data = await res.json();
    alert(data.message);
    fetchBotsList();
  } catch (err) {
    alert("Error stopping bot: " + err.message);
  }
}

// PERIODIC REFRESH
async function refreshStateAndLogs() {
  if (!isAgentOnline) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/bots`);
    const data = await res.json();
    allDiscoveredBots = data.bots || [];

    const runningBot = allDiscoveredBots.find(b => b.status === "RUNNING");
    if (runningBot) {
      updateStatusBadge("running", `Running (${runningBot.name})`);
    } else {
      updateStatusBadge("online", `Online (${activeAgentUrl.includes('127.0.0.1') ? 'GANESH' : 'Agent'})`);
    }

    renderBotsTable();

    if (currentModalBot) {
      fetchModalLogs();
    }
  } catch (e) {
    // Ignore transient poll error
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
    const data = await res.json();
    currentModalLogs = data.logs || [];
    renderModalLogs();
  } catch (e) {
    // Fail silently
  }
}

function renderModalLogs() {
  const container = document.getElementById("modal-terminal-content");
  const searchVal = document.getElementById("log-modal-search").value.toLowerCase();
  const levelVal = document.getElementById("log-modal-level").value;

  container.innerHTML = "";

  let filtered = currentModalLogs;

  if (levelVal !== "ALL") {
    filtered = filtered.filter(l => (l.level || "").toUpperCase() === levelVal);
  }

  if (searchVal) {
    filtered = filtered.filter(l => (l.message || "").toLowerCase().includes(searchVal) || (l.subbot || "").toLowerCase().includes(searchVal));
  }

  if (filtered.length === 0) {
    container.innerHTML = `<div class="log-row info"><span class="log-msg">No logs found matching filter.</span></div>`;
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

function toggleMobileSidebar() {
  const sidebar = document.querySelector(".aa-sidebar");
  if (sidebar) {
    sidebar.classList.toggle("active");
  }
}

// SCHEDULE BOT MODAL LOGIC
function openScheduleModal(botId) {
  const bot = allDiscoveredBots.find(b => b.id === botId);
  if (!bot) return;

  currentScheduleBot = bot;
  document.getElementById("sch-bot-name").innerText = `Schedule ${bot.name}`;
  document.getElementById("sch-bot-path").innerText = bot.folder;
  document.getElementById("schedule-modal").classList.add("active");

  fetchSchedulesList();
}

function closeScheduleModal() {
  currentScheduleBot = null;
  document.getElementById("schedule-modal").classList.remove("active");
}

function toggleFrequencyOptions() {
  const freq = document.getElementById("sch-frequency").value;
  document.getElementById("sch-weekly-box").style.display = (freq === "weekly") ? "block" : "none";
  document.getElementById("sch-monthly-box").style.display = (freq === "monthly") ? "block" : "none";
}

async function saveBotSchedule() {
  if (!isAgentOnline || !currentScheduleBot) return;

  const timeVal = document.getElementById("sch-time").value || "09:00";
  const tzVal = document.getElementById("sch-timezone").value || "IST";
  const freqVal = document.getElementById("sch-frequency").value;

  let selectedDays = [];
  if (freqVal === "weekly") {
    const checkboxes = document.querySelectorAll('input[name="sch-day"]:checked');
    checkboxes.forEach(cb => selectedDays.push(cb.value));
  }

  const domVal = document.getElementById("sch-dom").value;

  const payload = {
    bot_id: currentScheduleBot.id,
    bot_name: currentScheduleBot.name,
    bot_path: currentScheduleBot.path,
    time: timeVal,
    timezone: tzVal,
    frequency: freqVal,
    days: selectedDays,
    day_of_month: parseInt(domVal, 10)
  };

  try {
    const res = await fetch(`${activeAgentUrl}/api/schedules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.success) {
      alert("✅ Schedule created successfully!");
      fetchSchedulesList();
    } else {
      alert("⚠️ " + (data.message || "Failed to save schedule."));
    }
  } catch (err) {
    alert("❌ Error saving schedule: " + err.message);
  }
}

async function fetchSchedulesList() {
  if (!isAgentOnline) return;

  const tbody = document.getElementById("sch-table-body");
  try {
    const res = await fetch(`${activeAgentUrl}/api/schedules`);
    const data = await res.json();

    const schedules = data.schedules || [];
    tbody.innerHTML = "";

    if (schedules.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No active schedules configured.</td></tr>`;
      return;
    }

    schedules.forEach(sch => {
      const tr = document.createElement("tr");

      let detailsStr = "Every Day";
      if (sch.frequency === "weekly") {
        detailsStr = `Days: ${(sch.days || []).join(", ")}`;
      } else if (sch.frequency === "monthly") {
        detailsStr = `Date: ${sch.day_of_month} of month`;
      }

      tr.innerHTML = `
        <td><b>${sch.bot_name}</b></td>
        <td>${sch.time} ${sch.timezone}</td>
        <td><span class="badge-status status-COMPLETED">${(sch.frequency || "daily").toUpperCase()}</span></td>
        <td>${detailsStr}</td>
        <td style="text-align: center;">
          <button class="btn-act btn-stop" onclick="deleteSchedule('${sch.id}')">🗑 Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Error fetching schedules.</td></tr>`;
  }
}

async function deleteSchedule(schId) {
  if (!isAgentOnline || !confirm("Delete this schedule?")) return;

  try {
    const res = await fetch(`${activeAgentUrl}/api/schedules?schedule_id=${schId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      fetchSchedulesList();
    }
  } catch (err) {
    alert("Failed to delete schedule: " + err.message);
  }
}
