// src/public/js/contact.js
document.getElementById('contactForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    const messageDiv = document.getElementById('formMessage');
    const submitBtn = this.querySelector('.submit-btn');

    // Butonu devre dışı bırak
    submitBtn.disabled = true;
    submitBtn.textContent = 'GÖNDERİLİYOR...';

    try {
        const response = await fetch('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            messageDiv.className = 'form-message success';
            messageDiv.textContent = result.message;
            this.reset();
        } else {
            messageDiv.className = 'form-message error';
            messageDiv.textContent = result.message;
        }
    } catch (error) {
        messageDiv.className = 'form-message error';
        messageDiv.textContent = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'GÖNDER';
    }
});