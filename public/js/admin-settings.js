async function initializeSettings() {
    try {
        const response = await fetch(storeApi('/auth/me'));
        if (!response.ok) return window.location.assign(storePath('/admin/login'));
        const result = await response.json();
        if (result.admin?.mustChangePassword) return window.location.assign(storePath('/admin/change-password'));
        await loadStoreProfile();
        if (result.admin?.username) document.getElementById('adminUsername').textContent = `Welcome, ${result.admin.username}`;
    } catch (error) {
        console.error('Could not initialize settings:', error);
        window.location.assign(storePath('/admin/login'));
    }
}

document.getElementById('sidebarAddLaptopBtn').addEventListener('click', () => {
    window.location.assign(storePath('/admin/laptops/new'));
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await fetch(storeApi('/auth/logout'), { method: 'POST' }); }
    finally { window.location.assign(storePath('/admin/login')); }
});

initializeSettings();
