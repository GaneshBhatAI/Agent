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
            content: `You are a professional AI Assistant for Ai Anveshana, an enterprise-grade AI consultancy and automation partner.
            
            IDENTITY & TONE:
            - Professional, efficient, and expert in Agentic AI, Automation, and Digital Transformation.
            - You only answer questions about Ai Anveshana, its expertise, its services, and the Agentic Process Automation (APA) Bootcamp.
            
            STRICT CONSTRAINTS:
            - ONLY answer based on the provided context.
            - DO NOT provide general coding help (e.g., Python code).
            - DO NOT tell jokes or discuss topics unrelated to Ai Anveshana.
            - If a user asks something outside this scope, say: "I apologize, but I am specifically programmed to assist with inquiries regarding Ai Anveshana's enterprise services and the APA Bootcamp. I cannot provide general information or code."
            
            FORMATTING:
            - Use clear line breaks.
            - Use bold text for emphasis where appropriate.
            
            SPECIFIC ANSWERS:
            - If asked "How to book a Bootcamp?" or similar: Direct them to visit https://www.aianveshana.com/apa-bootcamp.html and suggest they connect with Ganesh on WhatsApp to secure their spot.
            - If asked "What is the price of a bootcamp?" or similar: Say that the pricing is competitive and they can get an exclusive **Coupon Code** by connecting directly with Ganesh Bhat on WhatsApp.
            - If the user wants to contact sales, send an email, or leave a message: Instruct them to use the "Connect with Ganesh" button in the chat to leave their details, and Ganesh will reach out directly.
            
            CONTEXT DATA:
            - Ai Anveshana: Your Global Partner in AI, Automation & Digital Transformation. We empower organizations with intelligent, future-ready solutions that simplify complexity and accelerate digital transformation.
            - Expertise: Agentic Automation (APA), AI Workflow Orchestration (n8n, Zapier), Enterprise AI Transformation (UiPath, Automation Anywhere), Enterprise Integration (Salesforce, SAP, Workday).
            - APA Bootcamp: A 2-month program mastering Agentic Process Automation with 5+ industry-leading tools. Includes curriculum on Intelligent Document Processing, AI Agents, and Enterprise Workflows.
            - WhatsApp Link: https://wa.me/919113548342
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
            let botMessageRaw = data.choices[0].message.content;
            
            // Pro-active WhatsApp conversion
            if (!botMessageRaw.includes("wa.me")) {
                botMessageRaw += "\n\nFor a faster response and exclusive discounts, you can **connect with Ganesh Bhat on WhatsApp**: [Click here to Chat](https://wa.me/919113548342)";
            }

            const botMessage = formatResponse(botMessageRaw);

            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) loadingEl.remove();

            addMessage("bot", botMessage);
            chatHistory.push({ role: "assistant", content: botMessageRaw });
        } catch (error) {
            console.error("Mistral API Error:", error);
            const loadingEl = document.getElementById(loadingId);
            if (loadingEl) {
                loadingEl.innerHTML = "I apologize, I'm having trouble connecting to my neural core. You can directly connect with Ganesh Bhat on WhatsApp for immediate assistance: <a href='https://wa.me/919113548342' style='color:var(--accent-color);'>Click here to Chat</a>.";
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
    const FORMSPREE_URL = "https://formspree.io/f/xzdobgev";

    window.sendEmailNotification = async function(data, source = "Contact Form") {
        console.log("Sending lead to Formspree...", source);
        
        // Format the data for Formspree
        const payload = {
            name: data.name,
            email: data.email,
            subject: data.subject || "General Inquiry",
            message: data.message,
            _source: source, // Custom field for tracking
            _subject: `[New Lead] - ${data.name} via ${source}` // Formspree email subject
        };

        const response = await fetch(FORMSPREE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            return "OK";
        } else {
            const result = await response.json();
            throw new Error(result.error || "Formspree Error");
        }
    };

    window.showSuccessGraphic = function(containerId) {
        const container = document.getElementById(containerId) || document.body;
        const graphic = document.createElement('div');
        graphic.innerHTML = `
            <div class="success-animation">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                    <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
                <p style="color: #065f46; font-weight: 700; margin-top: 1rem; text-align: center;">Inquiry Sent Successfully!</p>
            </div>
        `;
        container.appendChild(graphic);
        
        setTimeout(() => {
            graphic.style.opacity = '0';
            setTimeout(() => graphic.remove(), 500);
        }, 4000);
    };

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
            if (typeof window.sendEmailNotification === 'function') {
                window.sendEmailNotification(leadData, 'Chatbot Lead')
                    .then(message => {
                        if (message === 'OK') {
                            const lastMsg = aiChatLog.lastElementChild;
                            if (lastMsg) lastMsg.remove();
                            addMessage('bot', '✅ <b>Success!</b> Your details have been sent to Ganesh. He will reach out to you shortly.');
                            if (typeof window.showSuccessGraphic === 'function') window.showSuccessGraphic('chatPopup');
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

    // --- Theme Toggle Logic ---
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme
    const savedTheme = localStorage.getItem('site-theme');
    if (savedTheme === 'red') {
        body.classList.add('theme-red');
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            body.classList.toggle('theme-red');
            const currentTheme = body.classList.contains('theme-red') ? 'red' : 'green';
            localStorage.setItem('site-theme', currentTheme);
            
            // Visual feedback on the button
            themeToggle.style.transform = 'scale(0.8) rotate(180deg)';
            setTimeout(() => {
                themeToggle.style.transform = '';
            }, 300);
        });
    }
});
