/* ==========================================================================
   AI & Automation Engineer Course - Interactive Application Logic
   ========================================================================== */

const coursePhases = [
  {
    id: 1,
    category: "foundations",
    title: "Phase 1 — Transformation Mindset",
    subtitle: "From RPA Developer to AI Automation Engineer",
    objective: "Understand the shift from traditional RPA to AI-enabled automation.",
    topics: ["RPA Evolution", "Limitations of Rule-Based RPA", "AI + Automation", "RPA Developer vs AI Automation Engineer", "GenAI vs AI Agent vs Agentic AI", "Real-World AI Automation", "New Skill Map"],
    activity: "Analyze an existing RPA process and identify where Python, APIs, LLMs, or Agents can improve it.",
    outcome: "Understand why the transformation is necessary and establish the target skill path."
  },
  {
    id: 2,
    category: "foundations",
    title: "Phase 2 — Python Foundation",
    subtitle: "Zero Python Knowledge → Automation Developer",
    objective: "Build Python fundamentals specifically for automation and AI development.",
    topics: ["Python Installation", "PATH Configuration", "pip Package Manager", "Virtual Environments (venv)", "VS Code Setup", "Variables & Data Types", "Conditions & Loops", "Functions & Modules", "TXT / CSV / JSON Processing", "Exception Handling", "Requirements.txt", "REST APIs"],
    activity: "Build employee, customer, transaction, CSV/JSON, and REST API automation scripts.",
    outcome: "Create practical Python automation programs from scratch."
  },
  {
    id: 3,
    category: "foundations",
    title: "Phase 3 — AI-Assisted Development",
    subtitle: "Learn to Build Software With AI",
    objective: "Use AI as a development partner while validating generated code.",
    topics: ["AI Coding Concepts", "Code Generation & Explanation", "Automated Debugging", "Code Refactoring", "Google AI Coding", "VS Code AI Extensions", "Open-Source AI Extensions", "Coding Agents", "Vibe Coding"],
    activity: "Prompt → Generate → Run → Error → Explain → Fix → Test → Improve. Build a small application with AI assistance.",
    outcome: "Become comfortable building and debugging Python programs using AI tools."
  },
  {
    id: 4,
    category: "foundations",
    title: "Phase 4 — Command Line & Developer Productivity",
    subtitle: "Become Comfortable With the Terminal",
    objective: "Develop command-line skills required for Python, AI tools, Git, and project setup.",
    topics: ["CMD / Terminal Fundamentals", "Navigation (cd, dir, mkdir)", "File Operations (copy, move, del)", "Path Management", "Environment Variables", "python & python -m", "pip & Virtual Envs", "AI-Generated CLI Commands"],
    activity: "Create projects, files, and virtual environments directly from terminal, install dependencies, execute Python scripts, and troubleshoot CLI errors with AI.",
    outcome: "Work confidently with Python projects outside the IDE interface."
  },
  {
    id: 5,
    category: "foundations",
    title: "Phase 5 — Git & Software Development",
    subtitle: "Develop Like a Professional Software Engineer",
    objective: "Introduce source control and team collaboration workflows.",
    topics: ["Git vs GitHub", "Repository Setup", "Staging & Commits", "Branching & Merging", "Cloning & Remote Repos", "Pull & Push Workflows", "Git Status & Log", ".gitignore & README", "Merge Conflict Resolution"],
    activity: "Initialize a Python project, commit changes, create feature branches, merge pull requests, and push code to GitHub.",
    outcome: "Master professional software source control."
  },
  {
    id: 6,
    category: "ai-agents",
    title: "Phase 6 — Generative AI & LLM Foundation",
    subtitle: "Understand the Technology Behind AI Applications",
    objective: "Build a practical understanding of modern AI and LLM applications.",
    topics: ["AI / ML / GenAI Foundations", "LLM Architecture & Agents", "Agentic AI Concepts", "Tokens & Context Windows", "Temperature & Hallucinations", "Model Selection", "System & User Prompts", "Constraints & Few-Shot Prompting", "Decomposition & Structured Output", "Validation & Python + LLM APIs"],
    activity: "Build an AI summarizer, document extractor, classifier, and automated decision workflow.",
    outcome: "Build custom Python-based AI applications."
  },
  {
    id: 7,
    category: "ai-agents",
    title: "Phase 7 — Agentic AI with CrewAI",
    subtitle: "Move From AI Applications to AI Agents",
    objective: "Introduce autonomous agents, custom tools, and multi-agent automation.",
    topics: ["Agent Roles & Goals", "Backstories & Tasks", "Expected Outputs", "Crews & Crew Orchestration", "Custom Tools (Python / Search / API)", "Sequential Workflows", "Multi-Agent Workflows", "Manager / Worker Architecture"],
    activity: "Build an autonomous Researcher → Analyst → Report Generator multi-agent workflow with custom search tools.",
    outcome: "Build tool-enabled multi-agent solutions."
  },
  {
    id: 8,
    category: "advanced",
    title: "Phase 8 — Intelligent Browser Automation",
    subtitle: "Combine AI Reasoning With Playwright",
    objective: "Move from traditional RPA browser selectors to intelligent Python browser automation.",
    topics: ["Playwright Installation & Setup", "Browser & Page Contexts", "Locators & Navigation", "Click / Type / Select Actions", "Uploads & Downloads", "Smart Waits & Dynamic Selectors", "Assertions & Screenshots", "Error Handling & Retries", "AI + Playwright Integration"],
    activity: "Build AI-controlled browser automation where the AI decides actions and Playwright executes them in real-time.",
    outcome: "Combine AI reasoning with resilient, production-grade browser automation."
  },
  {
    id: 9,
    category: "advanced",
    title: "Phase 9 — LangChain Framework",
    subtitle: "Build Structured AI Applications",
    objective: "Create reusable, composable, and tool-enabled AI applications.",
    topics: ["LangChain Models", "Prompt Templates", "Chains & Sequential Chains", "Structured Output Parsers", "Tools & Function Calling", "Tool Calling Agents", "Reasoning & ReAct Framework"],
    activity: "Build a reusable prompt pipeline, document chain, custom Python tool, and research agent.",
    outcome: "Architect structured, modular AI applications."
  },
  {
    id: 10,
    category: "advanced",
    title: "Phase 10 — LangGraph State Machines",
    subtitle: "Build Controlled Agent Workflows",
    objective: "Build controlled, stateful, and enterprise-friendly agent workflows.",
    topics: ["State Definition", "Nodes & Edges", "START / END Flow Controls", "Graph Architecture", "Conditional Routing", "State Validation", "Loops & Cycles", "Human-in-the-Loop Interruption", "Persistence & Checkpoints", "Context Propagation"],
    activity: "Build an Analyze → Decision → Process / Human Review workflow with state persistence.",
    outcome: "Build controlled, stateful agentic workflows."
  },
  {
    id: 11,
    category: "advanced",
    title: "Phase 11 — AI Automation Integration",
    subtitle: "Bring RPA, Python, AI, and Agents Together",
    objective: "Teach technology selection criteria and hybrid automation architecture.",
    topics: ["Technology Selection (RPA vs Python vs APIs vs LLMs vs Agents vs Playwright vs LangGraph vs CrewAI)", "Hybrid Enterprise Architecture", "Legacy System Bridge", "Cost & Speed Optimization"],
    activity: "Redesign a legacy, brittle RPA process using the optimal combination of modern AI & Python technologies.",
    outcome: "Think and design like an AI Automation Solution Architect."
  },
  {
    id: 12,
    category: "advanced",
    title: "Phase 12 — Enterprise AI Automation Engineering",
    subtitle: "From Prototype to Production",
    objective: "Introduce best practices for reliable, secure, and maintainable enterprise AI automation.",
    topics: ["Enterprise Logging", "Retry Mechanisms", "Exception Handling & Fallbacks", "Human Escalation Channels", ".env & Secrets Management", "Unit & Integration Testing", "Prompt Testing & Evaluation", "Agent Benchmarking", "Git Branching Strategy", "Deployment Concepts"],
    activity: "Add production controls, credential security, automated tests, and delivery pipelines to existing agents.",
    outcome: "Deliver enterprise-ready, robust AI automation."
  },
  {
    id: 13,
    category: "advanced",
    title: "Phase 13 — Capstone Project",
    subtitle: "Build the AI Automation Engineer Solution",
    objective: "Combine the complete 13-phase learning journey into a realistic enterprise solution.",
    topics: ["Business Problem Framing", "Requirements & Tech Stack Selection", "Python & LLM Core", "Custom Agents & Tools", "Playwright / RPA Automation", "Output Validation & Logging", "Git Version Control", "Testing & Live Demo"],
    activity: "Build an end-to-end Capstone: Business Problem → Python → LLM → Agent → Tools → Automation → Validation → Testing → Live Demo.",
    outcome: "Demonstrate full AI Automation Engineer capability and project portfolio readiness."
  }
];

document.addEventListener("DOMContentLoaded", () => {
  renderCurriculum(coursePhases);
  setupFilterTabs();
  setupSearch();
  setupReadinessCalculator();
});

// Render Curriculum List
function renderCurriculum(phases) {
  const container = document.getElementById("curriculumAccordion");
  if (!container) return;

  if (phases.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="font-size: 1.1rem;">No phases matched your search criteria.</p>
        <button onclick="resetSearch()" class="btn-secondary" style="margin-top: 16px;">Reset Search & Filters</button>
      </div>
    `;
    return;
  }

  container.innerHTML = phases.map((phase, index) => `
    <div class="phase-card ${index === 0 ? 'active' : ''}" data-category="${phase.category}" id="phase-${phase.id}">
      <div class="phase-header" onclick="togglePhase(${phase.id})">
        <div class="phase-title-area">
          <div class="phase-number">PHASE ${phase.id < 10 ? '0' + phase.id : phase.id}</div>
          <div class="phase-header-text">
            <h3>${phase.title.split('—')[1] || phase.title}</h3>
            <p>${phase.subtitle}</p>
          </div>
        </div>
        <div class="phase-toggle-icon">
          <i class="fas fa-chevron-down"></i>
        </div>
      </div>
      
      <div class="phase-body">
        <div class="phase-content-grid">
          <div class="key-topics-box">
            <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 16px;">
              <strong style="color: var(--primary-cyan);">Objective:</strong> ${phase.objective}
            </p>

            <h4><i class="fas fa-layer-group" style="color: var(--primary-cyan);"></i> Key Topics Covered</h4>
            <div class="topics-pills">
              ${phase.topics.map(t => `<span class="topic-pill">${t}</span>`).join('')}
            </div>

            <div class="activity-box">
              <h5><i class="fas fa-laptop-code"></i> Practical Hands-On Activity</h5>
              <p>${phase.activity}</p>
            </div>
          </div>

          <div class="outcome-box">
            <div>
              <h5><i class="fas fa-trophy"></i> Expected Outcome</h5>
              <p>${phase.outcome}</p>
            </div>
            <button class="btn-secondary" style="margin-top: 20px; font-size: 0.8rem; padding: 8px 16px; width: 100%; justify-content: center;" onclick="event.stopPropagation(); copyPhaseDetail(${phase.id})">
              <i class="far fa-copy"></i> Copy Module Syllabus
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle Accordion Item
function togglePhase(phaseId) {
  const card = document.getElementById(`phase-${phaseId}`);
  if (card) {
    const isActive = card.classList.contains('active');
    // Keep multiple open or single accordion toggle
    card.classList.toggle('active');
  }
}

// Filter Tabs Logic
function setupFilterTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      const filter = e.target.dataset.filter;
      const searchVal = document.getElementById('searchInput')?.value.toLowerCase() || '';
      
      filterData(filter, searchVal);
    });
  });
}

// Search Functionality
function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchVal = e.target.value.toLowerCase();
    const activeFilter = document.querySelector('.tab-btn.active')?.dataset.filter || 'all';
    filterData(activeFilter, searchVal);
  });
}

function filterData(category, query) {
  let filtered = coursePhases;

  if (category !== 'all') {
    filtered = filtered.filter(p => p.category === category);
  }

  if (query) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.subtitle.toLowerCase().includes(query) ||
      p.objective.toLowerCase().includes(query) ||
      p.topics.some(t => t.toLowerCase().includes(query)) ||
      p.activity.toLowerCase().includes(query)
    );
  }

  renderCurriculum(filtered);
}

function resetSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector('.tab-btn[data-filter="all"]')?.classList.add('active');
  renderCurriculum(coursePhases);
}

// Interactive Skill Readiness Assessment Calculator
function setupReadinessCalculator() {
  const rpaSlider = document.getElementById('rpaExp');
  const pythonSlider = document.getElementById('pythonExp');
  
  if (!rpaSlider || !pythonSlider) return;

  function update() {
    const rpaVal = parseInt(rpaSlider.value);
    const pyVal = parseInt(pythonSlider.value);

    document.getElementById('rpaVal').innerText = rpaVal === 0 ? 'Beginner' : `${rpaVal} Year${rpaVal > 1 ? 's' : ''}`;
    document.getElementById('pythonVal').innerText = pyVal === 0 ? 'None' : `${pyVal} Year${pyVal > 1 ? 's' : ''}`;

    let weeks = 12;
    if (pyVal >= 2) weeks -= 3;
    if (rpaVal >= 3) weeks -= 2;
    if (pyVal === 0 && rpaVal === 0) weeks = 14;

    const timeElem = document.getElementById('estimatedWeeks');
    if (timeElem) timeElem.innerText = `${weeks} Weeks`;
  }

  rpaSlider.addEventListener('input', update);
  pythonSlider.addEventListener('input', update);
  update();
}

// Copy Syllabus Detail
function copyPhaseDetail(phaseId) {
  const phase = coursePhases.find(p => p.id === phaseId);
  if (!phase) return;

  const text = `
Course Module: ${phase.title}
Subtitle: ${phase.subtitle}
Objective: ${phase.objective}
Topics: ${phase.topics.join(', ')}
Practical Activity: ${phase.activity}
Expected Outcome: ${phase.outcome}
  `.trim();

  navigator.clipboard.writeText(text).then(() => {
    alert(`Phase ${phaseId} syllabus copied to clipboard!`);
  });
}

function copyFullRoadmap() {
  const fullText = coursePhases.map(p => `
${p.title} (${p.subtitle})
Objective: ${p.objective}
Topics: ${p.topics.join(', ')}
Activity: ${p.activity}
Outcome: ${p.outcome}
--------------------------------------------------
  `).join('\n');

  navigator.clipboard.writeText(fullText).then(() => {
    alert("Full 13-Phase Roadmap syllabus copied to clipboard!");
  });
}
