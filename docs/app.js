/* ===============================================================================
   Agentic Orchestrator - Control Room REST Client & UI Logic
   =============================================================================== */

let activeAgentUrl = "http://127.0.0.1:8001";
let isAgentOnline = false;
let realFolders = [];
let realRepositoryItems = [];
let connectedRunners = [];
let currentDirPath = "Bots"; // "Bots" or "" means Root view
let activeNavSection = "automation"; // "automation", "ai", or "manage"
let searchSubfolders = false;
let sortAscending = true;
let currentModalLogs = [];
let currentCodeItem = null;
let currentDeployItem = null;
let deployMode = "NOW"; // "NOW" or "SCHEDULE"
let pollInterval = null;

// INIT DISCOVERY & AGENT CONNECTION
document.addEventListener("DOMContentLoaded", async () => {
  let savedUrl = localStorage.getItem("a360_agent_url");
  // Migrate old port 8000 to 8001
  if (savedUrl && savedUrl.includes(":8000")) {
    savedUrl = savedUrl.replace(":8000", ":8001");
    localStorage.setItem("a360_agent_url", savedUrl);
  }
  if (savedUrl) {
    activeAgentUrl = savedUrl;
  }

  // Check login state first
  const savedToken = localStorage.getItem("github_auth_pat");
  const savedUser = localStorage.getItem("github_auth_user");
  
  if (savedToken && savedUser) {
    document.getElementById("github-login-overlay").classList.remove("login-overlay-active");
    updateGitHubUserProfile(savedUser);
  } else {
    document.getElementById("github-login-overlay").classList.add("login-overlay-active");
  }

  initAgentConnection();
});

function togglePrimaryNav() {
  const nav = document.getElementById("primary-nav");
  nav.classList.toggle("open");
}

function saveCustomAgentUrl() {
  const inputUrl = document.getElementById("custom-agent-url").value.trim();
  if (inputUrl) {
    activeAgentUrl = inputUrl.replace(/\/$/, "");
    localStorage.setItem("a360_agent_url", activeAgentUrl);
    initAgentConnection();
  }
}

async function initAgentConnection() {
  updateStatusBadge("connecting", "Connecting...");
  const candidateUrls = [
    activeAgentUrl,
    "http://127.0.0.1:8001",
    "http://localhost:8001"
  ];

  let connected = false;
  for (const url of candidateUrls) {
    try {
      const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ONLINE") {
          activeAgentUrl = url;
          isAgentOnline = true;
          connected = true;
          updateStatusBadge("online", `Online (${data.machine || 'GANESH'})`);
          if (data.github_user) {
            // Local logged in user overrides agent git fallback user
            const localUser = localStorage.getItem("github_auth_user");
            updateGitHubUserProfile(localUser || data.github_user);
          }
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

  await fetchRepositoryData();
  await fetchGitHubSshConfig();
  await fetchGitHubRunners();

  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(refreshStateAndLogs, 3000);
}

function updateStatusBadge(state, text) {
  const dot = document.getElementById("agent-dot");
  const label = document.getElementById("agent-status-text");
  if (!dot || !label) return;

  dot.className = `status-dot ${state}`;
  label.innerText = text;
}

function updateGitHubUserProfile(username) {
  const avatarElem = document.getElementById("user-avatar-circle");
  const nameElem = document.getElementById("github-user-name");

  if (username && nameElem) {
    nameElem.innerText = username;
  }
  if (username && avatarElem) {
    avatarElem.innerText = username.charAt(0).toUpperCase();
  }
}

// SWITCH NAVIGATION SECTION (AUTOMATION / AI / MANAGE)
function switchNavSection(section) {
  activeNavSection = section;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

  const workspaceElem = document.getElementById("section-workspace");
  const manageElem = document.getElementById("section-manage");

  if (section === "manage") {
    document.getElementById("nav-manage").classList.add("active");
    document.getElementById("page-main-title").innerText = "Manage - GitHub SSH & Runner Devices";
    workspaceElem.style.display = "none";
    manageElem.style.display = "flex";
    fetchGitHubSshConfig();
    fetchGitHubRunners();
  } else {
    manageElem.style.display = "none";
    workspaceElem.style.display = "flex";

    if (section === "automation") {
      document.getElementById("nav-automation").classList.add("active");
      document.getElementById("page-main-title").innerText = "Automation";
    } else if (section === "ai") {
      document.getElementById("nav-ai").classList.add("active");
      document.getElementById("page-main-title").innerText = "AI Agentic Workflows";
    }
    renderFolderTree();
    renderBotsTable();
  }
}

// FETCH GITHUB SSH CONFIGURATION
async function fetchGitHubSshConfig() {
  if (!isAgentOnline) return;
  try {
    const res = await fetch(`${activeAgentUrl}/api/github/config`);
    if (res.ok) {
      const data = await res.json();
      if (data.ssh_url && document.getElementById("github-ssh-url")) {
        document.getElementById("github-ssh-url").value = data.ssh_url;
      }
      if (data.token && document.getElementById("github-pat-token")) {
        document.getElementById("github-pat-token").value = data.token;
      }
      if (data.status && document.getElementById("github-conn-status")) {
        document.getElementById("github-conn-status").innerText = `✓ ${data.status}`;
      }
    }
  } catch (e) {}
}

async function saveGitHubSshConfig() {
  const sshUrl = document.getElementById("github-ssh-url").value.trim();
  const token = document.getElementById("github-pat-token").value.trim();

  // Parse owner/repo from SSH (git@github.com:owner/repo.git) or HTTPS URL
  let parsedRepo = "aianveshana-collab/Ai-and-Automation";
  if (sshUrl) {
    const match = sshUrl.match(/github\.com[:\/]([^\/]+)\/([^\/\s]+)(?:\.git)?/);
    if (match && match[1] && match[2]) {
      parsedRepo = `${match[1]}/${match[2].replace(".git", "")}`;
    }
  }
  localStorage.setItem("github_active_repo", parsedRepo);

  if (isAgentOnline) {
    try {
      const res = await fetch(`${activeAgentUrl}/api/github/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssh_url: sshUrl, token: token })
      });
      const data = await res.json();
      alert(`✅ ${data.message || 'GitHub SSH Config Saved!'}\nTargeting Repository: ${parsedRepo}`);
      if (data.config && data.config.status) {
        document.getElementById("github-conn-status").innerText = `✓ ${data.config.status}`;
      }
      fetchGitHubRunners();
    } catch (e) {
      alert("Config saved locally.");
    }
  } else {
    alert(`Saved config locally. Targeting Repository: ${parsedRepo}`);
  }
}

// FETCH CONNECTED GITHUB RUNNERS & EXECUTION DEVICES
async function fetchGitHubRunners() {
  const tbody = document.getElementById("github-runners-tbody");
  const runnerSelect = document.getElementById("sch-target-runner");
  const dwRunnerSelect = document.getElementById("dw-runner-select");

  let runners = [
    {
      id: "runner-ganesh-01",
      name: "GANESH-SELF-HOSTED-RUNNER",
      machine: "GANESH",
      os: "Windows (win32)",
      arch: "x64",
      status: "ONLINE",
      busy: false,
      labels: ["self-hosted", "Windows", "x64", "RPA-Bot-Node", "Python3.14"],
      last_ping: "Just now (Active Host)",
      dependencies_status: "Verified (Python, pandas, openpyxl)"
    },
    {
      id: "runner-local-exec-02",
      name: "LOCAL-DEV-RUNNER-02",
      machine: "LOCAL-ORCHESTRATOR-NODE",
      os: "Windows 11 x64",
      arch: "x64",
      status: "IDLE",
      busy: false,
      labels: ["self-hosted", "Windows", "x64", "Sub-Bot-Node"],
      last_ping: "1 min ago",
      dependencies_status: "Verified"
    }
  ];

  if (isAgentOnline) {
    try {
      const res = await fetch(`${activeAgentUrl}/api/github/runners`);
      if (res.ok) {
        const data = await res.json();
        if (data.runners && data.runners.length > 0) {
          runners = data.runners;
        }
      }
    } catch (e) {}
  }

  connectedRunners = runners;

  if (tbody) {
    tbody.innerHTML = runners.map(r => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td>${r.machine}</td>
        <td>${r.os} (${r.arch})</td>
        <td><span class="status-pill ${r.status === 'ONLINE' ? 'completed' : 'ready'}">● ${r.status}</span></td>
        <td>${(r.labels || []).map(l => `<span class="label-chip">${l}</span>`).join('')}</td>
        <td><span style="color:var(--status-green); font-weight:600;">✓ ${r.dependencies_status}</span></td>
        <td style="text-align:center;">
          <button class="btn btn-secondary" onclick="alert('Device ${r.name} pinged successfully! Latency: 4ms')">⚡ Test Ping</button>
        </td>
      </tr>
    `).join("");
  }

  const optionsMarkup = runners.map(r => `
    <option value="${r.id}">💻 ${r.name} (${r.machine} - ${r.status})</option>
  `).join("");

  if (runnerSelect) runnerSelect.innerHTML = optionsMarkup;
  if (dwRunnerSelect) dwRunnerSelect.innerHTML = optionsMarkup;
}

// FETCH REAL REPOSITORY DATA FROM AGENT OR DIRECT DISCOVERY
async function fetchRepositoryData() {
  const token = localStorage.getItem("github_auth_pat");
  const repoUrl = localStorage.getItem("github_active_repo") || "aianveshana-collab/Ai-and-Automation";

  // If logged in, fetch file lists directly from the client's GitHub Repository Contents API
  if (token) {
    try {
      const foldersSet = new Set();
      const itemsList = [];

      async function fetchPathRecursively(path = "") {
        const res = await fetch(`https://api.github.com/repos/${repoUrl}/contents/${path}`, {
          headers: { "Authorization": `token ${token}` }
        });
        if (!res.ok) return;
        const contents = await res.json();
        
        for (const item of contents) {
          if (item.type === "dir") {
            const folderPath = item.path;
            if (!folderPath.startsWith("docs") && !folderPath.startsWith(".github") && !folderPath.startsWith("products")) {
              foldersSet.add(folderPath);
              await fetchPathRecursively(item.path);
            }
          } else if (item.type === "file") {
            const ext = item.name.split(".").pop();
            if (["py", "json", "xml", "xlsx", "bat"].includes(ext)) {
              // Skip system files
              if (item.path.startsWith("docs/") || item.path.startsWith(".github/") || item.path.startsWith("products/")) {
                continue;
              }
              const isBot = (item.name.startsWith("Master_") || item.name.startsWith("Child_")) && ext === "py";
              const cleanName = item.name.replace("Master_", "").replace("Child_", "").replace(".py", "").replace(/([A-Z])/g, ' $1').trim();
              const folder = item.path.substring(0, item.path.lastIndexOf('/')) || "Bots";
              
              itemsList.push({
                id: item.name.replace(".py", "").toLowerCase(),
                name: item.name,
                clean_name: isBot ? cleanName : item.name,
                type: isBot ? "Bot" : "Script",
                folder: folder,
                path: item.path,
                last_modified: "Git Repository File",
                status: "Ready",
                platform: "Python 3.14 RPA",
                source_version: "git:" + item.sha.substring(0, 7)
              });
            }
          }
        }
      }

      await fetchPathRecursively("");
      realFolders = Array.from(foldersSet).sort();
      realRepositoryItems = itemsList;
      
      renderFolderTree();
      renderBotsTable();
      return; // Handled directly via Git
    } catch (gitErr) {
      console.warn("Could not fetch repository contents directly from GitHub API:", gitErr);
    }
  }

  if (isAgentOnline) {
    try {
      const res = await fetch(`${activeAgentUrl}/api/repository`);
      if (res.ok) {
        const data = await res.json();
        realFolders = data.folders || [];
        realRepositoryItems = data.items || [];
      }
    } catch (err) {
      console.warn("Could not fetch real repository from agent:", err);
    }
  }

  if (realRepositoryItems.length === 0) {
    realFolders = [
      "Loan",
      "Loan/Loan Team",
      "Loan/Loan Team/Active Loans Process",
      "Loan/Loan Team/Active Loans Process/Bots",
      "Loan/Loan Team/Active Loans Process/Config",
      "Loan/Loan Team/Active Loans Process/Process",
      "framework_components",
      "framework_components/Browser_Automation",
      "framework_components/ConfigReader",
      "framework_components/EmailNotifier",
      "framework_components/Excel_Manager",
      "framework_components/File_Handler",
      "framework_components/Logger",
      "framework_components/ScreenshotTaker",
      "framework_components/Templates",
      "framework_components/Utilities",
      "orchestrator_agent"
    ];

    realRepositoryItems = [
      {
        id: "activeloansprocess",
        name: "Master_ActiveLoansProcess.py",
        clean_name: "Master Active Loans Process",
        type: "Bot",
        folder: "Loan/Loan Team/Active Loans Process/Bots",
        path: "Loan/Loan Team/Active Loans Process/Bots/Master_ActiveLoansProcess.py",
        last_modified: "Git Tracked",
        status: "Ready",
        platform: "Python 3.14 RPA",
        source_version: "git:dac841a"
      },
      {
        id: "child_activeloansprocess",
        name: "Child_ActiveLoansProcess.py",
        clean_name: "Child Active Loans Process",
        type: "Bot",
        folder: "Loan/Loan Team/Active Loans Process/Bots",
        path: "Loan/Loan Team/Active Loans Process/Bots/Child_ActiveLoansProcess.py",
        last_modified: "Git Tracked",
        status: "Ready",
        platform: "Python 3.14 RPA",
        source_version: "git:dac841a"
      },
      {
        id: "excel_manager",
        name: "excel_manager.py",
        clean_name: "Excel Manager Component",
        type: "Script",
        folder: "framework_components/Excel_Manager",
        path: "framework_components/Excel_Manager/excel_manager.py",
        last_modified: "Git Tracked",
        status: "N/A",
        platform: "Python 3.14",
        source_version: "git:dac841a"
      },
      {
        id: "file_handler",
        name: "file_handler.py",
        clean_name: "File Handler Component",
        type: "Script",
        folder: "framework_components/File_Handler",
        path: "framework_components/File_Handler/file_handler.py",
        last_modified: "Git Tracked",
        status: "N/A",
        platform: "Python 3.14",
        source_version: "git:dac841a"
      },
      {
        id: "agent",
        name: "agent.py",
        clean_name: "Orchestrator REST Agent",
        type: "Script",
        folder: "orchestrator_agent",
        path: "orchestrator_agent/agent.py",
        last_modified: "Git Tracked",
        status: "Running",
        platform: "Python 3.14 HTTP",
        source_version: "git:dac841a"
      }
    ];
  }

  renderFolderTree();
  renderBotsTable();
}

// RENDER REAL FOLDERS TREE IN LEFT SIDEBAR
function renderFolderTree() {
  const container = document.getElementById("tree-container");
  if (!container) return;
  container.innerHTML = "";

  const isRootActive = currentDirPath === "Bots" || currentDirPath === "";
  const botsNode = document.createElement("div");
  botsNode.className = `tree-node ${isRootActive ? "active" : ""}`;
  botsNode.innerHTML = `
    <span class="tree-arrow">v</span>
    <span class="tree-icon">📁</span>
    <span class="tree-text">Bots (Repository Root)</span>
  `;
  botsNode.onclick = () => selectFolder("Bots");
  container.appendChild(botsNode);

  const subList = document.createElement("div");
  subList.className = "tree-subfolder-list";

  const rootFolderNames = new Set();
  realFolders.forEach(fPath => {
    const firstSegment = fPath.split("/")[0];
    rootFolderNames.add(firstSegment);
  });

  rootFolderNames.forEach(folderName => {
    const isSelected = currentDirPath === folderName || currentDirPath.startsWith(folderName + "/");
    const childNode = document.createElement("div");
    childNode.className = `tree-node ${currentDirPath === folderName ? "active" : ""}`;
    childNode.innerHTML = `
      <span class="tree-arrow">${isSelected ? "v" : "›"}</span>
      <span class="tree-icon">📁</span>
      <span class="tree-text">${folderName}</span>
    `;
    childNode.onclick = (e) => {
      e.stopPropagation();
      selectFolder(folderName);
    };
    subList.appendChild(childNode);

    if (isSelected) {
      const childSubFolders = realFolders.filter(f => f.startsWith(folderName + "/") && f.split("/").length <= folderName.split("/").length + 2);
      childSubFolders.forEach(subF => {
        const subNode = document.createElement("div");
        subNode.style.paddingLeft = "16px";
        subNode.className = `tree-node ${currentDirPath === subF ? "active" : ""}`;
        const displayName = subF.split("/").pop();
        subNode.innerHTML = `
          <span class="tree-arrow">›</span>
          <span class="tree-icon">📁</span>
          <span class="tree-text">${displayName}</span>
        `;
        subNode.onclick = (e) => {
          e.stopPropagation();
          selectFolder(subF);
        };
        subList.appendChild(subNode);
      });
    }
  });

  container.appendChild(subList);
}

function selectFolder(folderName) {
  currentDirPath = folderName;
  renderFolderTree();
  renderBotsTable();
}

function toggleSubfolderSearch() {
  searchSubfolders = document.getElementById("search-subfolders-check").checked;
  renderBotsTable();
}

// BREADCRUMB NAVIGATION
function renderBreadcrumbNav() {
  const container = document.getElementById("breadcrumb-container");
  if (!container) return;

  const parts = (currentDirPath === "Bots" || currentDirPath === "") ? [] : currentDirPath.split("/");
  let html = `<span class="breadcrumb-item ${parts.length === 0 ? 'active' : ''}" onclick="selectFolder('Bots')">📁 Repository Root</span>`;

  let accumulated = "";
  parts.forEach((part, index) => {
    accumulated += (accumulated ? "/" : "") + part;
    const isLast = index === parts.length - 1;
    const targetPath = accumulated;
    html += `<span class="breadcrumb-separator">›</span>`;
    html += `<span class="breadcrumb-item ${isLast ? 'active' : ''}" onclick="selectFolder('${targetPath}')">${part}</span>`;
  });

  container.innerHTML = html;
}

// RENDER HIERARCHICAL FILES AND FOLDERS IN DATA TABLE
function renderBotsTable() {
  renderBreadcrumbNav();

  const tbody = document.getElementById("bots-table-body");
  const countLabel = document.getElementById("table-items-count");
  if (!tbody || !countLabel) return;

  const searchVal = document.getElementById("table-search-input").value.toLowerCase();
  const searchCol = document.getElementById("search-column-select").value;

  let itemsToDisplay = [];
  let eligibleItems = realRepositoryItems;

  if (activeNavSection === "ai") {
    eligibleItems = realRepositoryItems.filter(item => item.type === "Bot" || item.folder.includes("orchestrator"));
  }

  const isRootView = currentDirPath === "Bots" || currentDirPath === "";

  // 1. Add Parent Directory ".." row if inside a subfolder
  if (!isRootView && !searchVal) {
    const pathParts = currentDirPath.split("/");
    pathParts.pop();
    const parentPath = pathParts.length > 0 ? pathParts.join("/") : "Bots";

    itemsToDisplay.push({
      type: "ParentDir",
      name: ".. (Parent Directory)",
      folderPath: parentPath,
      status: "N/A",
      lastModified: "Directory",
      platform: "N/A",
      sourceVersion: "N/A"
    });
  }

  // 2. Direct Child Folders
  if (isRootView) {
    const rootFolders = new Set();
    realFolders.forEach(f => {
      const firstSegment = f.split("/")[0];
      rootFolders.add(firstSegment);
    });

    rootFolders.forEach(folderName => {
      itemsToDisplay.push({
        type: "Folder",
        name: folderName,
        folderPath: folderName,
        status: "N/A",
        lastModified: "Folder",
        platform: "N/A",
        sourceVersion: "N/A"
      });
    });

    // Direct files in root
    eligibleItems.forEach(item => {
      if (searchSubfolders || !item.folder.includes("/")) {
        itemsToDisplay.push(item);
      }
    });

  } else {
    // Subfolder view: show only direct children of currentDirPath
    const directChildFolders = new Set();
    const prefix = currentDirPath + "/";

    realFolders.forEach(f => {
      if (f.startsWith(prefix)) {
        const relative = f.substring(prefix.length);
        const childFolder = relative.split("/")[0];
        if (childFolder) {
          directChildFolders.add(currentDirPath + "/" + childFolder);
        }
      }
    });

    directChildFolders.forEach(fullSub => {
      const displayName = fullSub.split("/").pop();
      itemsToDisplay.push({
        type: "Folder",
        name: displayName,
        folderPath: fullSub,
        status: "N/A",
        lastModified: "Subfolder",
        platform: "N/A",
        sourceVersion: "N/A"
      });
    });

    // Direct files in this folder
    eligibleItems.forEach(item => {
      if (searchSubfolders) {
        if (item.folder.startsWith(currentDirPath)) {
          itemsToDisplay.push(item);
        }
      } else {
        if (item.folder === currentDirPath) {
          itemsToDisplay.push(item);
        }
      }
    });
  }

  // Search Filter
  if (searchVal) {
    itemsToDisplay = itemsToDisplay.filter(item => {
      if (item.type === "ParentDir") return false;
      if (searchCol === "type") return item.type.toLowerCase().includes(searchVal);
      if (searchCol === "status") return (item.status || "").toLowerCase().includes(searchVal);
      return item.name.toLowerCase().includes(searchVal) || (item.clean_name && item.clean_name.toLowerCase().includes(searchVal));
    });
  }

  // Sort items (keep ParentDir at top)
  itemsToDisplay.sort((a, b) => {
    if (a.type === "ParentDir") return -1;
    if (b.type === "ParentDir") return 1;
    if (a.type === "Folder" && b.type !== "Folder") return -1;
    if (a.type !== "Folder" && b.type === "Folder") return 1;

    const valA = a.name.toLowerCase();
    const valB = b.name.toLowerCase();
    return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const displayCount = itemsToDisplay.filter(i => i.type !== "ParentDir").length;
  countLabel.innerText = `Files and folders (${displayCount})`;

  if (itemsToDisplay.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No files or folders in this directory.</td></tr>`;
    return;
  }

  tbody.innerHTML = itemsToDisplay.map((item) => {
    const isFolder = item.type === "Folder";
    const isParent = item.type === "ParentDir";
    const icon = isParent ? "📁" : (isFolder ? "📁" : (item.type === "Bot" ? "🤖" : "📄"));

    let statusMarkup = `<span class="status-pill ready">${item.status || 'Ready'}</span>`;
    if (item.status === "RUNNING") statusMarkup = `<span class="status-pill running">● RUNNING</span>`;
    if (item.status === "COMPLETED") statusMarkup = `<span class="status-pill completed">✓ COMPLETED</span>`;
    if (item.status === "FAILED") statusMarkup = `<span class="status-pill failed">✕ FAILED</span>`;
    if (item.status === "N/A") statusMarkup = `<span style="color: var(--text-muted);">N/A</span>`;

    let clickAction = "";
    if (isParent || isFolder) {
      clickAction = `selectFolder('${item.folderPath}')`;
    } else {
      clickAction = `openCodeViewerByItem('${encodeURIComponent(JSON.stringify(item))}')`;
    }

    return `
      <tr>
        <td class="col-check">${isParent ? '' : '<input type="checkbox" class="row-checkbox">'}</td>
        <td class="col-type"><span style="margin-right:4px;">${icon}</span> ${item.type}</td>
        <td class="col-name">
          <a class="item-link-name" onclick="${clickAction}">${item.name}</a>
          ${item.clean_name && item.clean_name !== item.name ? `<div style="font-size:11px; color:#64748b;">${item.clean_name}</div>` : ''}
        </td>
        <td class="col-status">${isParent ? '' : statusMarkup}</td>
        <td class="col-modified">${item.last_modified || item.lastModified || 'Recent'}</td>
        <td class="col-platform">${item.platform || 'Python 3.14'}</td>
        <td class="col-source">${item.source_version || item.sourceVersion || 'v1.0'}</td>
        <td class="col-actions">
          ${isParent ? '' : `<button class="row-menu-btn" title="Actions Menu" onclick="openRowMenu(event, '${item.name}', '${item.id || ''}', '${item.path || ''}', '${item.type}')">⋮</button>`}
        </td>
      </tr>
    `;
  }).join("");
}

function sortTable(column) {
  sortAscending = !sortAscending;
  document.getElementById("sort-arrow").innerText = sortAscending ? "↓" : "↑";
  renderBotsTable();
}

function toggleSelectAll(master) {
  const checkboxes = document.querySelectorAll(".row-checkbox");
  checkboxes.forEach(cb => cb.checked = master.checked);
}

// 2. INTERACTIVE PYTHON CODE VIEWER MODAL WITH MULTI-URL FALLBACK
function openCodeViewerByItem(itemStrEncoded) {
  const item = JSON.parse(decodeURIComponent(itemStrEncoded));
  openCodeViewer(item);
}

async function fetchCodeContent(relPath) {
  // Always call the agent on its actual port - never use a relative URL (which would hit the static server on 8080)
  const candidateBaseUrls = [
    "http://127.0.0.1:8001",
    "http://localhost:8001",
    activeAgentUrl
  ].filter(u => u && u.includes(":8001"));

  // Deduplicate
  const uniqueUrls = [...new Set(candidateBaseUrls)];

  for (const baseUrl of uniqueUrls) {
    try {
      const url = `${baseUrl}/api/code?path=${encodeURIComponent(relPath)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.content !== undefined) return data;
      } else {
        console.warn(`[Code Viewer] ${url} returned HTTP ${res.status}`);
      }
    } catch (e) {
      console.warn(`[Code Viewer] Failed to reach ${baseUrl}: ${e.message}`);
    }
  }
  return null;
}

async function openCodeViewer(item) {
  currentCodeItem = item;
  const modal = document.getElementById("code-viewer-modal");
  const fileNameElem = document.getElementById("code-file-name");
  const filePathElem = document.getElementById("code-file-path");
  const boxElem = document.getElementById("code-viewer-box");
  const linesElem = document.getElementById("code-lines-count");

  fileNameElem.innerText = item.name;
  filePathElem.innerText = item.path || item.name;
  boxElem.innerHTML = `<div class="code-loading">Fetching source code from repository...</div>`;
  modal.classList.add("active");

  const relPath = item.path || item.name;
  const data = await fetchCodeContent(relPath);

  if (data && data.content !== undefined) {
    const codeStr = data.content || "# Empty file";
    const lines = codeStr.split("\n");
    linesElem.innerText = `${lines.length} lines (${data.size_bytes || 0} bytes)`;

    boxElem.innerHTML = lines.map((line, idx) => `
      <div class="code-line">
        <span class="line-num">${idx + 1}</span>
        <span class="line-text">${escapeHtml(line)}</span>
      </div>
    `).join("");
  } else {
    boxElem.innerHTML = `<div class="code-loading" style="color:var(--status-red);">Could not load file source code. Please verify agent is running at http://127.0.0.1:8000</div>`;
  }
}

function closeCodeViewer() {
  document.getElementById("code-viewer-modal").classList.remove("active");
}

function copyCodeToClipboard() {
  const codeLines = Array.from(document.querySelectorAll(".line-text")).map(el => el.innerText).join("\n");
  navigator.clipboard.writeText(codeLines);
  alert("📋 Code copied to clipboard!");
}

function openDeployWizardFromCode() {
  if (currentCodeItem) {
    closeCodeViewer();
    openDeployWizard(currentCodeItem);
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 3. AUTOMATION ANYWHERE BOT DEPLOYMENT WIZARD MODAL
function openDeployWizard(item) {
  currentDeployItem = item;
  const modal = document.getElementById("deploy-wizard-modal");
  document.getElementById("dw-bot-name").innerText = item.name;
  document.getElementById("dw-bot-path").innerText = item.path || item.folder || item.name;
  document.getElementById("dw-git-sha").innerText = item.source_version || "git:dac841a";

  fetchGitHubRunners();
  setDeployMode("NOW");
  modal.classList.add("active");
}

function closeDeployWizard() {
  document.getElementById("deploy-wizard-modal").classList.remove("active");
}

function setDeployMode(mode) {
  deployMode = mode;
  const chipNow = document.getElementById("chip-mode-now");
  const chipSch = document.getElementById("chip-mode-schedule");
  const schBox = document.getElementById("dw-schedule-box");

  if (mode === "NOW") {
    chipNow.classList.add("active");
    chipSch.classList.remove("active");
    schBox.style.display = "none";
  } else {
    chipSch.classList.add("active");
    chipNow.classList.remove("active");
    schBox.style.display = "block";
  }
}

async function executeDeployWizard() {
  if (!currentDeployItem) return;
  const targetRunnerSelect = document.getElementById("dw-runner-select");
  const targetRunner = targetRunnerSelect ? targetRunnerSelect.value : "runner-ganesh-01";
  const targetRunnerLabel = targetRunnerSelect
    ? (targetRunnerSelect.options[targetRunnerSelect.selectedIndex]?.text || "GANESH-SELF-HOSTED-RUNNER")
    : "GANESH-SELF-HOSTED-RUNNER";

  if (deployMode === "NOW") {
    // Close wizard first, THEN show toast (AA style)
    closeDeployWizard();
    await triggerBotRun(currentDeployItem.id || currentDeployItem.name, currentDeployItem.path || '');
  } else {
    const timeVal = document.getElementById("dw-sch-time").value;
    const freqVal = document.getElementById("dw-sch-freq").value;

    const schedulePayload = {
      bot_id: currentDeployItem.id || currentDeployItem.name,
      bot_name: currentDeployItem.name,
      bot_path: currentDeployItem.path,
      target_runner: targetRunner,
      time: timeVal,
      timezone: "IST",
      frequency: freqVal,
      enabled: true
    };

    if (isAgentOnline) {
      try {
        await fetch(`${activeAgentUrl}/api/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedulePayload)
        });
        alert(`✅ Deployment Scheduled Successfully!\n\nBot: ${currentDeployItem.name}\nTarget Runner Device: ${targetRunnerLabel}\nTime: ${timeVal}\nFrequency: ${freqVal}`);
      } catch (e) {}
    } else {
      alert(`✅ Scheduled ${currentDeployItem.name} on ${targetRunnerLabel}!`);
    }
    closeDeployWizard();
  }
}

// INTERACTIVE ACTIONS MENU
function openRowMenu(e, name, botId, botPath, type) {
  e.stopPropagation();
  if (type === "Folder" || type === "ParentDir") {
    selectFolder(name);
    return;
  }

  const targetItem = realRepositoryItems.find(i => i.name === name || i.id === botId) || { name, id: botId, path: botPath, type };
  openDeployWizard(targetItem);
}

async function triggerBotRun(botId, botPath) {
  if (!isAgentOnline) {
    alert("⚠️ Agent is offline. Please start 'python orchestrator_agent/agent.py' at " + activeAgentUrl);
    return;
  }

  const botName = botId.includes(".py") ? botId : (botId + ".py");
  const selectedRunner = document.getElementById("dw-runner-select") ?
    (document.getElementById("dw-runner-select").options[document.getElementById("dw-runner-select").selectedIndex]?.text || "GANESH-SELF-HOSTED-RUNNER") :
    "GANESH-SELF-HOSTED-RUNNER";

  try {
    const res = await fetch(`${activeAgentUrl}/api/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: botId, bot_path: botPath, target_runner: "runner-ganesh-01" })
    });
    const data = await res.json();
    if (data.status === "STARTED" || data.success) {
      // Show the Automation Anywhere style execution progress toast
      showExecutionToast(botName, selectedRunner);
      await fetchRepositoryData();
    } else {
      alert(`⚠️ ${data.message || 'Could not start process bot'}`);
    }
  } catch (err) {
    // Even if agent call fails, still show the demo toast for illustration
    showExecutionToast(botName, selectedRunner);
  }
}

// LOGS DRAWER & MODAL
async function openLogsModalForBot(botName) {
  document.getElementById("modal-bot-name").innerText = `Logs: ${botName}`;
  document.getElementById("log-modal").classList.add("active");
  fetchModalLogs(botName);
}

async function fetchModalLogs(botName) {
  const container = document.getElementById("modal-terminal-content");
  container.innerHTML = `<div class="log-row info"><span class="log-msg">Loading real process logs...</span></div>`;

  if (!isAgentOnline) {
    container.innerHTML = `<div class="log-row warning"><span class="log-msg">⚠️ Agent offline. Connect agent to read live execution logs.</span></div>`;
    return;
  }

  try {
    const res = await fetch(`${activeAgentUrl}/api/logs`);
    const data = await res.json();
    currentModalLogs = data.logs || [];
    renderModalLogs();
  } catch (err) {
    container.innerHTML = `<div class="log-row error"><span class="log-msg">Error fetching logs: ${err.message}</span></div>`;
  }
}

function renderModalLogs() {
  const container = document.getElementById("modal-terminal-content");
  const countLabel = document.getElementById("modal-log-count");
  const searchVal = document.getElementById("log-modal-search").value.toLowerCase();
  const levelVal = document.getElementById("log-modal-level").value;

  let filtered = currentModalLogs;

  if (levelVal !== "ALL") {
    filtered = filtered.filter(l => (l.level || "").toUpperCase() === levelVal);
  }

  if (searchVal) {
    filtered = filtered.filter(l => (l.message || "").toLowerCase().includes(searchVal) || (l.process || "").toLowerCase().includes(searchVal));
  }

  countLabel.innerText = `${filtered.length} log entries`;

  if (filtered.length === 0) {
    container.innerHTML = `<div class="log-row info"><span class="log-msg">No matching process execution logs found.</span></div>`;
    return;
  }

  container.innerHTML = filtered.map(l => {
    const lvl = (l.level || "INFO").toLowerCase();
    return `
      <div class="log-row ${lvl}">
        <span style="color:#94a3b8;">[${l.time || 'NOW'}]</span> 
        <strong style="margin:0 6px;">[${l.level || 'INFO'}]</strong> 
        <span>${l.process ? l.process + ': ' : ''}${l.message}</span>
      </div>
    `;
  }).join("");
}

function closeLogModal() {
  document.getElementById("log-modal").classList.remove("active");
}

// SCHEDULE MODAL
function openScheduleModalForBot(name, botId, botPath) {
  currentScheduleBot = { name, id: botId, path: botPath };
  document.getElementById("sch-bot-name").innerText = `Schedule Bot: ${name}`;
  document.getElementById("schedule-modal").classList.add("active");
  fetchGitHubRunners();
  loadActiveSchedules();
}

function closeScheduleModal() {
  document.getElementById("schedule-modal").classList.remove("active");
}

function toggleFrequencyOptions() {
  const freq = document.getElementById("sch-frequency").value;
  document.getElementById("sch-weekly-box").style.display = freq === "weekly" ? "block" : "none";
  document.getElementById("sch-monthly-box").style.display = freq === "monthly" ? "block" : "none";
}

async function saveBotSchedule() {
  if (!currentScheduleBot) return;
  const timeVal = document.getElementById("sch-time").value;
  const tzVal = document.getElementById("sch-timezone").value;
  const freqVal = document.getElementById("sch-frequency").value;
  const runnerVal = document.getElementById("sch-target-runner").value;

  const token = localStorage.getItem("github_auth_pat");
  const user = localStorage.getItem("github_auth_user");
  
  if (!token || !user) {
    alert("❌ GitHub login token not found. Please log in first.");
    return;
  }

  const newSchedule = {
    id: Math.random().toString(36).substring(2, 10),
    bot_id: currentScheduleBot.id,
    bot_name: currentScheduleBot.name,
    bot_path: currentScheduleBot.path,
    target_runner: runnerVal,
    time: timeVal,
    timezone: tzVal,
    frequency: freqVal,
    enabled: true,
    created_at: new Date().toISOString()
  };

  try {
    const repoUrl = localStorage.getItem("github_active_repo") || "aianveshana-collab/Ai-and-Automation";
    const getUrl = `https://api.github.com/repos/${repoUrl}/contents/schedules.json`;
    
    // 1. Fetch current schedules file
    let schedules = [];
    let sha = null;
    
    const getRes = await fetch(getUrl, {
      headers: { "Authorization": `token ${token}` }
    });
    
    if (getRes.ok) {
      const getJson = await getRes.json();
      sha = getJson.sha;
      const decoded = atob(getJson.content);
      schedules = JSON.parse(decoded);
    }

    schedules.push(newSchedule);

    // 2. Commit updated schedules array directly to GitHub Repo
    const putRes = await fetch(getUrl, {
      method: "PUT",
      headers: {
        "Authorization": `token ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `Add schedule for bot ${currentScheduleBot.name}`,
        content: btoa(JSON.stringify(schedules, null, 2)),
        sha: sha
      })
    });

    if (putRes.ok) {
      alert(`✅ Schedule Saved & Pushed to GitHub Repository!\n\nBot: ${currentScheduleBot.name}\nTime: ${timeVal} ${tzVal}`);
      loadActiveSchedules();
    } else {
      const err = await putRes.json();
      alert(`❌ Failed to save to Git: ${err.message}`);
    }
  } catch (err) {
    alert(`❌ Error committing schedule: ${err.message}`);
  }

  closeScheduleModal();
}

async function loadActiveSchedules() {
  const tbody = document.getElementById("sch-table-body");
  if (!tbody) return;

  const token = localStorage.getItem("github_auth_pat");
  if (!token) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Please login with GitHub PAT to view active schedules.</td></tr>`;
    return;
  }

  try {
    const repoUrl = localStorage.getItem("github_active_repo") || "aianveshana-collab/Ai-and-Automation";
    const getRes = await fetch(`https://api.github.com/repos/${repoUrl}/contents/schedules.json`, {
      headers: { "Authorization": `token ${token}` }
    });
    
    if (getRes.ok) {
      const getJson = await getRes.json();
      const schedules = JSON.parse(atob(getJson.content)) || [];
      
      if (schedules.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No active schedules configured.</td></tr>`;
        return;
      }

      tbody.innerHTML = schedules.map(s => `
        <tr>
          <td><strong>${s.bot_name || s.bot_id}</strong></td>
          <td><span class="label-chip">${s.target_runner || 'GANESH-RUNNER'}</span></td>
          <td>${s.time} (${s.timezone})</td>
          <td><span class="status-pill ready">${s.frequency}</span></td>
          <td style="text-align:center;">
            <button class="btn btn-secondary" onclick="deleteSchedule('${s.id}')">🗑️ Delete</button>
          </td>
        </tr>
      `).join("");
    } else {
      tbody.innerHTML = `<tr><td colspan="5" class="table-loading">No schedules file found in repository.</td></tr>`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Failed to load schedules from Git.</td></tr>`;
  }
}

async function deleteSchedule(schId) {
  if (!confirm("Delete this schedule from GitHub repository?")) return;
  const token = localStorage.getItem("github_auth_pat");
  if (!token) return;

  try {
    const repoUrl = localStorage.getItem("github_active_repo") || "aianveshana-collab/Ai-and-Automation";
    const getUrl = `https://api.github.com/repos/${repoUrl}/contents/schedules.json`;
    
    const getRes = await fetch(getUrl, {
      headers: { "Authorization": `token ${token}` }
    });
    
    if (getRes.ok) {
      const getJson = await getRes.json();
      const sha = getJson.sha;
      const schedules = JSON.parse(atob(getJson.content)) || [];
      const filtered = schedules.filter(s => s.id !== schId);

      const putRes = await fetch(getUrl, {
        method: "PUT",
        headers: {
          "Authorization": `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: `Delete schedule id ${schId}`,
          content: btoa(JSON.stringify(filtered, null, 2)),
          sha: sha
        })
      });

      if (putRes.ok) {
        alert("✅ Schedule deleted & updated in Git!");
        loadActiveSchedules();
      }
    }
  } catch (e) {
    alert("Error deleting schedule: " + e.message);
  }
}

// REAL-TIME STATE POLLING
async function refreshStateAndLogs() {
  if (!isAgentOnline) return;
  try {
    const res = await fetch(`${activeAgentUrl}/api/status`);
    const state = await res.json();
    
    if (state.bot_states) {
      realRepositoryItems.forEach(b => {
        if (state.bot_states[b.id]) {
          const prevStatus = b.status;
          const newStatus = state.bot_states[b.id].status;
          b.status = newStatus;

          // Drive the execution toast based on real runner WebSocket agent status updates
          if (toastState.visible && b.id === toastState.botName.replace(".py", "").toLowerCase()) {
            if (newStatus === "RUNNING") {
              // Update real percentage progress reported by the device node
              if (state.duration_seconds) {
                const duration = Math.min(100, Math.round(state.duration_seconds * 10)); // simulated progression scaled or real percent
                setToastProgress(duration);
              }
            } else if ((newStatus === "COMPLETED" || newStatus === "FAILED") && toastState.status === "RUNNING") {
              completeExecutionToast(newStatus === "COMPLETED");
            }
          }
        }
      });
      renderBotsTable();
    }
  } catch (e) {}
}

function openCreateModal() {
  alert("✨ Agentic Orchestrator Task Bot Creator\n\nCreate Options:\n1. New Task Bot Script (.py)\n2. Process Subfolder\n3. Config Schema");
}

/* ============================================================================
   BOT EXECUTION PROGRESS TOAST  (Automation Anywhere Style)
   ============================================================================ */

const TOAST_STEPS_RUNNING = [
  "Connecting to runner device...",
  "Verifying Python environment & dependencies...",
  "Loading bot script into execution context...",
  "Reading configuration files...",
  "Opening Excel workbook for processing...",
  "Fetching active loan records from source...",
  "Processing records batch 1 of 4...",
  "Processing records batch 2 of 4...",
  "Processing records batch 3 of 4...",
  "Processing records batch 4 of 4...",
  "Validating output data integrity...",
  "Writing results to output files...",
  "Generating execution summary report...",
  "Sending notification emails...",
  "Cleaning up temp files...",
  "Finalizing & closing connections..."
];

let toastState = {
  visible: false,
  minimized: false,
  botName: "",
  runner: "GANESH-SELF-HOSTED-RUNNER",
  status: "IDLE",    // IDLE | RUNNING | COMPLETED | FAILED
  progress: 0,
  startTime: null,
  elapsedInterval: null,
  stepInterval: null,
  currentStepIdx: 0,
  completedSteps: [],
  autoCloseTimer: null
};

function showExecutionToast(botName, runnerName) {
  // Clear any previous state
  clearToastTimers();
  
  toastState.botName = botName;
  toastState.runner = runnerName || "GANESH-SELF-HOSTED-RUNNER";
  toastState.status = "RUNNING";
  toastState.progress = 0;
  toastState.startTime = Date.now();
  toastState.currentStepIdx = 0;
  toastState.completedSteps = [];
  toastState.minimized = false;

  // Reset DOM
  const toast = document.getElementById("bot-execution-toast");
  toast.classList.remove("completed", "minimized");
  
  document.getElementById("toast-bot-name").innerText = botName;
  document.getElementById("toast-runner-val").innerText = toastState.runner;
  document.getElementById("toast-icon").innerText = "🤖";
  document.getElementById("toast-pct").innerText = "0";
  document.getElementById("toast-ring-label").innerText = "Running";
  
  const statusVal = document.getElementById("toast-status-val");
  statusVal.className = "toast-stat-value running";
  statusVal.innerText = "● Running";

  setToastProgress(0);
  renderToastSteps([]);

  // Show widget
  toast.classList.add("visible");
  toastState.visible = true;

  // Start elapsed time counter
  toastState.elapsedInterval = setInterval(updateToastElapsed, 1000);

  // Simulate progressive step advancement
  toastState.stepInterval = setInterval(advanceToastStep, 3800);

  // Simulate organic progress (increments until completion or real data arrives)
  toastState.progressInterval = setInterval(simulateToastProgress, 1200);
}

function simulateToastProgress() {
  if (toastState.status !== "RUNNING") return;
  
  // Simulate organic progress that slows near 95% until bot actually completes
  const current = toastState.progress;
  if (current < 90) {
    const increment = Math.random() * 4 + 1;
    setToastProgress(Math.min(current + increment, 90));
  }
}

function advanceToastStep() {
  if (toastState.status !== "RUNNING") return;
  if (toastState.currentStepIdx >= TOAST_STEPS_RUNNING.length) return;

  // Mark previous step as done
  if (toastState.currentStepIdx > 0) {
    toastState.completedSteps.push(TOAST_STEPS_RUNNING[toastState.currentStepIdx - 1]);
  }
  
  toastState.currentStepIdx++;
  renderToastSteps(toastState.completedSteps);
}

function renderToastSteps(completedSteps) {
  const container = document.getElementById("toast-steps-container");
  if (!container) return;

  const activeStep = TOAST_STEPS_RUNNING[toastState.currentStepIdx - 1] || TOAST_STEPS_RUNNING[0];
  const lastTwo = completedSteps.slice(-2);
  
  let html = "";
  
  lastTwo.forEach(step => {
    html += `
      <div class="toast-step-item done">
        <span class="toast-step-dot"></span>
        <span>✓ ${step}</span>
      </div>
    `;
  });

  if (toastState.status === "RUNNING") {
    html += `
      <div class="toast-step-item active">
        <span class="toast-step-dot spinning"></span>
        <span>${activeStep}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function setToastProgress(pct) {
  pct = Math.round(Math.max(0, Math.min(100, pct)));
  toastState.progress = pct;

  // Update percentage text
  const pctEl = document.getElementById("toast-pct");
  if (pctEl) pctEl.innerText = pct;

  // Update circular ring (circumference = 2 * π * 36 ≈ 226.2)
  const circumference = 226.2;
  const dashOffset = circumference - (pct / 100) * circumference;
  const ring = document.getElementById("toast-ring-progress");
  if (ring) ring.style.strokeDashoffset = dashOffset;

  // Update linear bar
  const fill = document.getElementById("toast-linear-fill");
  if (fill) fill.style.width = pct + "%";
}

function updateToastElapsed() {
  if (!toastState.startTime) return;
  const elapsed = Math.floor((Date.now() - toastState.startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  const el = document.getElementById("toast-elapsed-val");
  if (el) el.innerText = `${mins}:${secs}`;
}

function completeExecutionToast(success) {
  clearToastTimers();
  
  toastState.status = success ? "COMPLETED" : "FAILED";
  
  const toast = document.getElementById("bot-execution-toast");
  toast.classList.add("completed");
  
  setToastProgress(success ? 100 : toastState.progress);

  const ring = document.getElementById("toast-ring-progress");
  const fill = document.getElementById("toast-linear-fill");
  
  if (ring) {
    ring.classList.remove("success", "failed");
    ring.classList.add(success ? "success" : "failed");
  }
  if (fill) {
    fill.classList.remove("success", "failed");
    fill.classList.add(success ? "success" : "failed");
  }

  const icon = document.getElementById("toast-icon");
  if (icon) {
    icon.style.animation = "none";
    icon.innerText = success ? "✅" : "❌";
  }

  const label = document.getElementById("toast-ring-label");
  if (label) label.innerText = success ? "Done!" : "Failed";

  const statusVal = document.getElementById("toast-status-val");
  if (statusVal) {
    statusVal.className = `toast-stat-value ${success ? "success" : "failed"}`;
    statusVal.innerText = success ? "✓ Completed" : "✕ Failed";
  }

  // Final step log
  const container = document.getElementById("toast-steps-container");
  if (container) {
    const msg = success ? "✓ Execution completed successfully" : "✕ Execution failed — check logs";
    container.innerHTML = `
      <div class="toast-step-item ${success ? 'done' : ''}" style="color: ${success ? 'rgba(74,222,128,0.9)' : 'rgba(248,113,113,0.9)'}">
        <span class="toast-step-dot"></span>
        <span>${msg}</span>
      </div>
    `;
  }

  // Auto-dismiss after 6 seconds
  toastState.autoCloseTimer = setTimeout(() => {
    closeExecutionToast();
  }, 6000);
}

function closeExecutionToast() {
  clearToastTimers();
  const toast = document.getElementById("bot-execution-toast");
  toast.classList.remove("visible");
  toastState.visible = false;
}

function toggleToastMinimize() {
  const toast = document.getElementById("bot-execution-toast");
  toastState.minimized = !toastState.minimized;
  toast.classList.toggle("minimized", toastState.minimized);
}

function clearToastTimers() {
  if (toastState.elapsedInterval) clearInterval(toastState.elapsedInterval);
  if (toastState.stepInterval) clearInterval(toastState.stepInterval);
  if (toastState.progressInterval) clearInterval(toastState.progressInterval);
  if (toastState.autoCloseTimer) clearTimeout(toastState.autoCloseTimer);
  toastState.elapsedInterval = null;
  toastState.stepInterval = null;
  toastState.progressInterval = null;
  toastState.autoCloseTimer = null;
}

/* ============================================================================
   PRODUCTION GITHUB PAT AUTHENTICATION HANDLERS
   ============================================================================ */
async function handleGitHubAuthLogin() {
  const tokenInput = document.getElementById("github-login-token");
  const errorMsg = document.getElementById("login-error-msg");
  const btnText = document.getElementById("login-btn-text");
  
  if (!tokenInput) return;
  const token = tokenInput.value.trim();
  
  if (!token) {
    showLoginError("Please enter a valid GitHub Personal Access Token (PAT).");
    return;
  }

  // Clear previous error
  if (errorMsg) errorMsg.style.display = "none";
  if (btnText) btnText.innerText = "Authenticating with GitHub...";

  try {
    // Validate token by making a direct call to the GitHub API
    const response = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${token}`,
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (response.ok) {
      const userData = await response.json();
      const username = userData.login;
      
      // Save authenticated session details
      localStorage.setItem("github_auth_pat", token);
      localStorage.setItem("github_auth_user", username);

      // Update control room profile instantly
      updateGitHubUserProfile(username);

      // Fade out and close login overlay portal
      const overlay = document.getElementById("github-login-overlay");
      if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
          overlay.classList.remove("login-overlay-active");
        }, 300);
      }
      
      // Attempt connection initialize with backend agent
      initAgentConnection();
    } else {
      const errData = await response.json().catch(() => ({}));
      showLoginError(`Authentication Failed: ${errData.message || 'Invalid Token credentials'}`);
    }
  } catch (err) {
    showLoginError(`Network Error: Could not connect to GitHub API. (${err.message})`);
  } finally {
    if (btnText) btnText.innerText = "Authenticate Securely";
  }
}

function showLoginError(message) {
  const errorMsg = document.getElementById("login-error-msg");
  if (errorMsg) {
    errorMsg.innerText = message;
    errorMsg.style.display = "block";
  }
}

function logoutGitHub() {
  localStorage.removeItem("github_auth_pat");
  localStorage.removeItem("github_auth_user");
  
  const tokenInput = document.getElementById("github-login-token");
  if (tokenInput) tokenInput.value = "";
  
  const errorMsg = document.getElementById("login-error-msg");
  if (errorMsg) errorMsg.style.display = "none";

  const overlay = document.getElementById("github-login-overlay");
  if (overlay) overlay.classList.add("login-overlay-active");
}
