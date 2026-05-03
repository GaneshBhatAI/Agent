const MISTRAL_API_KEY = "Nbsc8Cgarlu7EzFBvhI508U13vN7rncn";

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Poppins'
});

document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');
    const mermaidEditor = document.getElementById('mermaidEditor');
    const mermaidDisplay = document.getElementById('mermaidDisplay');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const exportBtn = document.getElementById('exportJson');
    const importBtn = document.getElementById('importJson');
    const fileInput = document.getElementById('fileInput');
    const downloadBtn = document.getElementById('downloadImg');

    let currentDiagramCode = `graph TD
    A[User Request] --> B{AI Engine}
    B -->|Generate| C[Diagram]
    B -->|Refine| D[Editable Code]`;

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab') + 'Tab';
            document.getElementById(tabId).classList.add('active');
            
            if (btn.getAttribute('data-tab') === 'preview') {
                renderDiagram(mermaidEditor.value);
            }
        });
    });

    // Editor Live Sync
    mermaidEditor.value = currentDiagramCode;
    mermaidEditor.addEventListener('input', () => {
        currentDiagramCode = mermaidEditor.value;
    });

    // AI Generation Logic
    async function generateDiagram(prompt) {
        addChatMessage('user', prompt);
        chatInput.value = '';
        
        const loadingMsg = addChatMessage('bot', 'Architecting your solution... <i class="fas fa-spinner fa-spin"></i>');
        
        const systemPrompt = `You are an AI Solution Architect. Your goal is to translate user requirements into valid Mermaid.js diagram code.
        RULES:
        1. ONLY return the Mermaid code block.
        2. Do NOT include explanations or preamble.
        3. Use professional labels.
        4. If the requirement is vague, assume a standard industry flowchart (graph TD).
        5. Surround your code with \`\`\`mermaid and \`\`\`.`;

        try {
            const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: "mistral-tiny",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.2
                })
            });

            const data = await response.json();
            const content = data.choices[0].message.content;
            
            // Extract mermaid code
            const mermaidMatch = content.match(/```mermaid([\s\S]*?)```/);
            const code = mermaidMatch ? mermaidMatch[1].trim() : content.trim();

            loadingMsg.remove();
            addChatMessage('bot', 'Diagram generated successfully. You can preview it or edit the code.');
            
            currentDiagramCode = code;
            mermaidEditor.value = code;
            renderDiagram(code);

        } catch (error) {
            console.error("AI Error:", error);
            loadingMsg.innerHTML = "I encountered an error while architecting. Please try again.";
        }
    }

    function renderDiagram(code) {
        try {
            mermaidDisplay.innerHTML = code;
            mermaidDisplay.removeAttribute('data-processed');
            mermaid.render('mermaid-svg', code).then(({ svg }) => {
                mermaidDisplay.innerHTML = svg;
            });
        } catch (err) {
            console.error("Mermaid Render Error:", err);
            mermaidDisplay.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Invalid diagram syntax. Please check the editor.</div>`;
        }
    }

    function addChatMessage(sender, text) {
        const div = document.createElement('div');
        div.classList.add('message', sender);
        div.innerHTML = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return div;
    }

    sendBtn.addEventListener('click', () => {
        if (chatInput.value.trim()) generateDiagram(chatInput.value.trim());
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    // JSON Export
    exportBtn.addEventListener('click', () => {
        const data = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            code: currentDiagramCode
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram-${Date.now()}.json`;
        a.click();
    });

    // JSON Import
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.code) {
                    currentDiagramCode = data.code;
                    mermaidEditor.value = data.code;
                    renderDiagram(data.code);
                    addChatMessage('bot', 'Project imported successfully.');
                }
            } catch (err) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    });

    // Image Download (SVG to PNG)
    downloadBtn.addEventListener('click', () => {
        const svgElement = document.querySelector('.mermaid svg');
        if (!svgElement) return;

        const svgData = new XMLSerializer().serializeToString(svgElement);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        const svgSize = svgElement.getBoundingClientRect();
        canvas.width = svgSize.width * 2; // High res
        canvas.height = svgSize.height * 2;

        img.onload = function() {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = "diagram-architect.png";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        };

        img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    });

    // Initial Render
    renderDiagram(currentDiagramCode);
});
