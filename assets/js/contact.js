

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
