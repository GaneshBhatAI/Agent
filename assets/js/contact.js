
// Ai Anveshana - Contact & Lead Handling Logic (Formspree Integration)
const FORMSPREE_URL = "https://formspree.io/f/xzdobgev";

async function sendEmailNotification(data, source = "Contact Form") {
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
}

// Success Graphic / Animation
function showSuccessGraphic(containerId) {
    const container = document.getElementById(containerId) || document.body;
    const graphic = document.createElement('div');
    graphic.innerHTML = `
        <div class="success-animation">
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark__circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark__check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <p style="color: #065f46; font-weight: 700; margin-top: 1rem;">Inquiry Sent Successfully!</p>
        </div>
    `;
    container.appendChild(graphic);
    
    setTimeout(() => {
        graphic.style.opacity = '0';
        setTimeout(() => graphic.remove(), 500);
    }, 4000);
}

// Contact Form Handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const status = document.getElementById('formStatus');
        const btn = this.querySelector('button');
        const originalBtnText = btn.innerHTML;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        status.style.display = 'none';
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        sendEmailNotification(data, "Website Contact Form")
            .then(message => {
                if (message === "OK") {
                    status.className = 'form-status success';
                    status.innerHTML = 'Thank you! Your message has been sent successfully.';
                    status.style.display = 'block';
                    showSuccessGraphic('contact');
                    contactForm.reset();
                } else {
                    throw new Error(message);
                }
            })
            .catch(error => {
                console.error("Submission Error:", error);
                status.className = 'form-status error';
                status.innerHTML = 'Oops! There was a problem. Please try again or email ganesh directly.';
                status.style.display = 'block';
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            });
    });
}
