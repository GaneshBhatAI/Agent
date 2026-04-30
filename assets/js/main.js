document.addEventListener('DOMContentLoaded', () => {

    // Intersection Observer for Fade-in Animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));


    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (navbar && window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else if (navbar) {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobileOverlay = document.querySelector('.mobile-nav-overlay');
    const closeBtn = document.querySelector('.close-btn');
    const mobileLinks = document.querySelectorAll('.mobile-links a');

    function toggleMenu() {
        if (mobileOverlay) {
            mobileOverlay.classList.toggle('active');
            document.body.classList.toggle('no-scroll');
        }
    }

    if (mobileBtn) mobileBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (mobileOverlay && mobileOverlay.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- AI Chatbot Logic (Mistral Integration) ---
    const MISTRAL_API_KEY = "Nbsc8Cgarlu7EzFBvhI508U13vN7rncn";
    
    // Safely get elements
    const getEl = (id) => document.getElementById(id);
    const chatToggle = getEl('chatToggle');
    const closeChat = getEl('closeChat');
    const chatPopup = getEl('chatPopup');
    const aiChatLog = getEl('aiChatLog');
    const aiChatInput = getEl('aiChatInput');

    let chatHistory = [
        {
            role: "system",
            content: `You are a professional AI Assistant for Ganesh Bhat, a Senior AI & Automation Solution Architect and founder of AI Brahma.
            
            IDENTITY & TONE:
            - Professional, efficient, and expert in Agentic AI.
            - You only answer questions about Ganesh Bhat, his expertise, his professional background, and the Agentic Process Automation (APA) Bootcamp.
            
            STRICT CONSTRAINTS:
            - ONLY answer based on the provided context.
            - DO NOT provide general coding help (e.g., Python code).
            - DO NOT tell jokes or discuss topics unrelated to Ganesh Bhat.
            - If a user asks something outside this scope, say: "I apologize, but I am specifically programmed to assist with inquiries regarding Ganesh Bhat's work and the APA Bootcamp. I cannot provide general information or code."
            
            FORMATTING:
            - Use clear line breaks.
            - Use bold text for emphasis where appropriate.
            
            CONTEXT DATA:
            - Ganesh Bhat: Senior AI & Automation Solution Architect with 9+ years of experience.
            - Expertise: RPA (UiPath, Automation Anywhere), Agentic AI (Mistral, Gemini, OpenAI), Low-code (n8n, Zapier).
            - APA Bootcamp: A 2-month program mastering Agentic Process Automation with 5+ industry-leading tools. Includes curriculum on Intelligent Document Processing, AI Agents, and Enterprise Workflows.
            - Contact: ai.brahmabusiness@gmail.com | +91 9113548342 | https://wa.me/919113548342`
        }
    ];

    // Helper to format bot responses
    function formatResponse(text) {
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color: var(--accent-color); text-decoration: underline;">$1</a>');
        return formatted;
    }

    window.sendChatMessage = async function () {
        if (!aiChatInput || !aiChatLog) return;
        const text = aiChatInput.value.trim();
        if (!text) return;

        const suggestions = document.getElementById('suggestionChips');
        if (suggestions) suggestions.style.display = 'none';

        aiChatInput.value = "";
        addMessage("user", text);
        chatHistory.push({ role: "user", content: text });

        const loadingId = "bot-loading-" + Date.now();
        const loadingDiv = document.createElement('div');
        loadingDiv.id = loadingId;
        loadingDiv.classList.add('message', 'bot');
        loadingDiv.innerHTML = '<span class="online-dot" style="margin-right: 10px;"></span>thinking...';
        aiChatLog.appendChild(loadingDiv);
        aiChatLog.scrollTop = aiChatLog.scrollHeight;

        try {
            const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${MISTRAL_API_KEY}`
                },
                body: JSON.stringify({
                    model: "mistral-tiny",
                    messages: chatHistory,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            const botMessageRaw = data.choices[0].message.content;
            const botMessage = formatResponse(botMessageRaw);

            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            addMessage("bot", botMessage);
            chatHistory.push({ role: "assistant", content: botMessageRaw });
        } catch (error) {
            console.error("Mistral API Error:", error);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) {
                loadingEl.innerHTML = "I apologize, I'm having trouble connecting to my neural core. You can directly connect with Ganesh at <a href='mailto:ai.brahmabusiness@gmail.com' style='color:var(--accent-color);'>ai.brahmabusiness@gmail.com</a> or via <a href='https://wa.me/919113548342' target='_blank' style='color:var(--accent-color);'>WhatsApp</a>.";
            }
        }
    }

    function addMessage(sender, text) {
        if (!aiChatLog) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.innerHTML = text;
        aiChatLog.appendChild(messageDiv);
        aiChatLog.scrollTop = aiChatLog.scrollHeight;
    }

    if (aiChatInput) {
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendChatMessage();
            }
        });
    }

    // --- Chatbot Toggle Logic ---
    if (chatToggle && chatPopup) {
        chatToggle.addEventListener('click', (e) => {
            e.preventDefault();
            chatPopup.classList.toggle('active');
        });
    }

    if (closeChat && chatPopup) {
        closeChat.addEventListener('click', (e) => {
            e.preventDefault();
            chatPopup.classList.remove('active');
        });
    }

    // Global function for suggestion chips
    window.askSuggestion = function(text) {
        if (aiChatInput) {
            aiChatInput.value = text;
            window.sendChatMessage();
        }
    };

    // Share Logic
    const linkedinBtn = document.getElementById('shareLinkedin');
    const whatsappBtn = document.getElementById('shareWhatsapp');

    if (linkedinBtn) {
        linkedinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUrl = encodeURIComponent(window.location.href);
            const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${currentUrl}`;
            window.open(shareUrl, '_blank', 'width=600,height=600');
        });
    }

    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const currentUrl = encodeURIComponent(window.location.href);
            const currentTitle = encodeURIComponent(document.title);
            const shareUrl = `https://api.whatsapp.com/send?text=${currentTitle}%20${currentUrl}`;
            window.open(shareUrl, '_blank');
        });
    }
});
