
// Anagh AI - Contact & Lead Handling Logic
const GMAIL_USER = "ai.brahmabusiness@gmail.com";
const GMAIL_PASS = "mitr sixy uoto aovd"; // App Password provided by user

function sendEmailNotification(data, source = "Contact Form") {
    const subjectLine = `New Lead [${source}] - ${data.name}`;
    const bodyContent = `
        <h3>New Lead from Anagh AI</h3>
        <p><b>Source:</b> ${source}</p>
        <p><b>Name:</b> ${data.name}</p>
        <p><b>Email:</b> ${data.email}</p>
        <p><b>Subject/Interest:</b> ${data.subject || 'General Inquiry'}</p>
        <p><b>Message:</b><br>${data.message}</p>
        <hr>
        <p>This email was sent automatically from the Anagh AI website.</p>
    `;

    return Email.send({
        Host: "smtp.gmail.com",
        Username: GMAIL_USER,
        Password: GMAIL_PASS,
        To: GMAIL_USER,
        From: GMAIL_USER,
        Subject: subjectLine,
        Body: bodyContent
    });
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
            <p style="color: #065f46; font-weight: 700; margin-top: 1rem;">Lead Sent Successfully!</p>
        </div>
    `;
    container.appendChild(graphic);
    
    setTimeout(() => {
        graphic.style.opacity = '0';
        setTimeout(() => graphic.remove(), 500);
    }, 3000);
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
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());

        sendEmailNotification(data, "Website Contact Form")
            .then(message => {
                if (message === "OK") {
                    status.className = 'form-status success';
                    status.innerHTML = 'Thank you! Your message has been sent to Ganesh.';
                    status.style.display = 'block';
                    showSuccessGraphic('contact');
                    contactForm.reset();
                } else {
                    throw new Error(message);
                }
            })
            .catch(error => {
                console.error("Email Error:", error);
                status.className = 'form-status error';
                status.innerHTML = 'Submission failed. Please try again or email us directly.';
                status.style.display = 'block';
            })
            .finally(() => {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            });
    });
}
