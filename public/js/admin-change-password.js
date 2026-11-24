const passwordForm = document.getElementById('changePasswordForm');
const passwordMessage = document.getElementById('passwordMessage');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

async function initializePasswordPage() {
    try {
        const response = await fetch(storeApi('/auth/me'));
        if (!response.ok) return window.location.assign(storePath('/admin/login'));
        const result = await response.json();
        if (!result.admin?.mustChangePassword) return window.location.assign(storePath('/admin'));
        await loadStoreProfile();
    } catch (error) {
        passwordMessage.textContent = error.message || 'Could not load this store.';
    }
}

initializePasswordPage();

passwordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    passwordMessage.textContent = '';
    if (newPassword.value !== confirmPassword.value) {
        passwordMessage.textContent = 'The passwords do not match.';
        return;
    }
    try {
        const response = await fetch(storeApi('/auth/change-password'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: newPassword.value })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Could not change password.');
        window.location.href = storePath('/admin');
    } catch (error) {
        passwordMessage.textContent = error.message;
    }
});

document.getElementById('changePasswordLogout').addEventListener('click', async () => {
    await fetch(storeApi('/auth/logout'), { method: 'POST' });
    window.location.href = storePath('/admin/login');
});
