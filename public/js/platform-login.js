const form = document.getElementById('platformLoginForm');
const message = document.getElementById('loginMessage');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    message.classList.remove('error');
    const formData = new FormData(form);
    try {
        const response = await fetch('/api/platform/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(formData.entries()))
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Sign-in failed.');
        window.location.href = '/platform';
    } catch (error) {
        message.textContent = error.message;
        message.classList.add('error');
    }
});
