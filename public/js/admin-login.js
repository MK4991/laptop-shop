
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('togglePassword');

const loginButton = document.getElementById('loginButton');
const buttonText = document.getElementById('buttonText');


// Show or hide password
togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        togglePassword.textContent = 'Show';
    }
});


// Handle login
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = passwordInput.value;

    errorMessage.textContent = '';

    loginButton.disabled = true;
    buttonText.textContent = 'Signing in...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const result = await response.json();

        if (response.ok) {
            window.location.href = '/admin';
        } else {
            errorMessage.textContent =
                result.message || 'Invalid username or password.';
        }

    } catch (error) {
        errorMessage.textContent =
            'Unable to connect to the server. Please try again.';

        console.error(error);

    } finally {
        loginButton.disabled = false;
        buttonText.textContent = 'Sign In';
    }
});
