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
            content: `You are a professional AI Assistant for Anagha AI, an enterprise-grade AI consultancy and automation partner.
            
            IDENTITY & TONE:
            - Professional, efficient, and expert in Agentic AI, Automation, and Digital Transformation.
            - You only answer questions about Anagha AI, its expertise, its services, and the Agentic Process Automation (APA) Bootcamp.
            
            STRICT CONSTRAINTS:
            - ONLY answer based on the provided context.
            - DO NOT provide general coding help (e.g., Python code).
            - DO NOT tell jokes or discuss topics unrelated to Anagha AI.
            - If a user asks something outside this scope, say: "I apologize, but I am specifically programmed to assist with inquiries regarding Anagha AI's enterprise services and the APA Bootcamp. I cannot provide general information or code."
            
            FORMATTING:
            - Use clear line breaks.
            - Use bold text for emphasis where appropriate.
            
            CONTEXT DATA:
            - Anagha AI: Your Global Partner in AI, Automation & Digital Transformation. We empower organizations with intelligent, future-ready solutions that simplify complexity and accelerate digital transformation.
            - Expertise: Agentic Automation (APA), AI Workflow Orchestration (n8n, Zapier), Enterprise AI Transformation (UiPath, Automation Anywhere), Enterprise Integration (Salesforce, SAP, Workday).
            - APA Bootcamp: A 2-month program mastering Agentic Process Automation with 5+ industry-leading tools. Includes curriculum on Intelligent Document Processing, AI Agents, and Enterprise Workflows.
            - Contact: contact@anaghai.com
            - Office: 164, 1st Main Rd, Vidyaranyapura Post, Chikkabettahalli, Havyakanagara Phase-2, Vidyaranyapura, Bengaluru, Karnataka 560097`
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
        loadingDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
                loadingEl.innerHTML = "I apologize, I'm having trouble connecting to my neural core. You can directly connect with Anagha AI at <a href='mailto:contact@anaghai.com' style='color:var(--accent-color);'>contact@anaghai.com</a>.";
            }
        }
    }

    function addMessage(sender, text) {
        if (!aiChatLog) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.innerHTML = text;
        aiChatLog.appendChild(messageDiv);
        
        if (sender === 'bot') {
            // Scroll to the top of the new bot message so user sees the first sentence
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Standard scroll to bottom for user messages
            aiChatLog.scrollTop = aiChatLog.scrollHeight;
        }
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
    
    // --- Lead Generation Flow ---
    let isCollectingLead = false;
    let leadStep = 0;
    let leadData = { name: '', email: '', message: '' };

    window.startLeadFlow = function() {
        isCollectingLead = true;
        leadStep = 1;
        const suggestions = document.getElementById('suggestionChips');
        if (suggestions) suggestions.style.display = 'none';
        
        addMessage('bot', 'I would be happy to help you connect with <b>Ganesh Bhat</b>. First, could you please tell me your <b>Full Name</b>?');
    };

    const originalSendChatMessage = window.sendChatMessage;
    window.sendChatMessage = async function() {
        if (!isCollectingLead) {
            return originalSendChatMessage();
        }

        const text = aiChatInput.value.trim();
        if (!text) return;

        aiChatInput.value = '';
        addMessage('user', text);

        if (leadStep === 1) {
            leadData.name = text;
            leadStep = 2;
            addMessage('bot', `Great to meet you, ${text}! What is your <b>Email Address</b>?`);
        } else if (leadStep === 2) {
            if (!text.includes('@')) {
                addMessage('bot', 'That doesn\'t look like a valid email. Please provide a valid email address so Ganesh can reach you.');
                return;
            }
            leadData.email = text;
            leadStep = 3;
            addMessage('bot', 'Got it. Finally, what would you like to discuss with Ganesh? (Your message)');
        } else if (leadStep === 3) {
            leadData.message = text;
            leadStep = 4;
            isCollectingLead = false;
            
            addMessage('bot', 'Processing your request... <span class="fas fa-spinner fa-spin"></span>');
            
            // Call the email sender
            if (typeof sendEmailNotification === 'function') {
                sendEmailNotification(leadData, 'Chatbot Lead')
                    .then(message => {
                        if (message === 'OK') {
                            const lastMsg = aiChatLog.lastElementChild;
                            if (lastMsg) lastMsg.remove();
                            addMessage('bot', '✅ <b>Success!</b> Your details have been sent to Ganesh. He will reach out to you shortly.');
                            if (typeof showSuccessGraphic === 'function') showSuccessGraphic('chatPopup');
                        } else {
                            throw new Error(message);
                        }
                    })
                    .catch(err => {
                        console.error('Lead Flow Error:', err);
                        addMessage('bot', 'I apologize, but I encountered an error sending your message. Please try the contact form or email directly.');
                    });
            }
        }
    };
});
