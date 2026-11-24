const storeList = document.getElementById('storeList');
const storeListMessage = document.getElementById('storeListMessage');
const createStoreForm = document.getElementById('createStoreForm');
const createStoreMessage = document.getElementById('createStoreMessage');
const credentialNotice = document.getElementById('credentialNotice');
const platformDialog = document.getElementById('platformDialog');
let stores = [];

function setMessage(element, value, isError = false) {
    element.textContent = value || '';
    element.classList.toggle('error', isError);
}

async function requestJson(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'The request failed.');
    return result;
}

function showTemporaryPassword(target, password, label = 'Temporary password') {
    target.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `${label} — copy and provide it securely. It will only be shown once.`;
    const code = document.createElement('code');
    code.textContent = password;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'platform-secondary-button';
    copy.textContent = 'Copy password';
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(password);
            copy.textContent = 'Copied';
        } catch {
            copy.textContent = 'Select and copy the password above';
        }
    });
    target.append(title, code, copy);
    target.hidden = false;
}

function askForConfirmation(title, message) {
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogMessage').textContent = message;
    return new Promise((resolve) => {
        platformDialog.addEventListener('close', () => resolve(platformDialog.returnValue === 'confirm'), { once: true });
        platformDialog.showModal();
    });
}

function createAdminRow(admin, storeId) {
    const row = document.createElement('div');
    row.className = 'platform-admin-row';
    const info = document.createElement('span');
    const username = document.createElement('strong');
    username.textContent = admin.username;
    const email = document.createElement('small');
    email.textContent = admin.email;
    const status = document.createElement('small');
    status.textContent = admin.must_change_password ? 'Password change required' : 'Account active';
    info.append(username, email, status);
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'platform-secondary-button';
    reset.textContent = 'Reset password';
    reset.addEventListener('click', async () => {
        if (!(await askForConfirmation('Reset admin password?', `A new temporary password will be created for ${admin.username}.`))) return;
        try {
            const result = await requestJson(`/api/platform/stores/${storeId}/admins/${admin.admin_id}/reset-password`, { method: 'POST' });
            const notice = row.parentElement.querySelector('.platform-store-credential') || document.createElement('div');
            notice.className = 'platform-store-credential';
            row.parentElement.append(notice);
            showTemporaryPassword(notice, result.temporaryPassword, `${admin.username}'s temporary password`);
            row.querySelector('span small:last-child').textContent = 'Password change required';
        } catch (error) {
            setMessage(storeListMessage, error.message, true);
        }
    });
    row.append(info, reset);
    return row;
}

function createStoreCard(store) {
    const card = document.createElement('article');
    card.className = 'platform-store-card';
    const header = document.createElement('div');
    header.className = 'platform-store-header';
    const title = document.createElement('div');
    title.className = 'platform-store-title';
    const name = document.createElement('strong');
    name.textContent = store.name;
    const slug = document.createElement('small');
    slug.textContent = `/s/${store.slug}`;
    title.append(name, slug);
    const actions = document.createElement('div');
    actions.className = 'platform-store-header-actions';
    const status = document.createElement('span');
    status.className = `platform-status${store.is_active ? '' : ' inactive'}`;
    status.textContent = store.is_active ? 'Active' : 'Suspended';
    const storefront = document.createElement('a');
    storefront.className = 'platform-secondary-button';
    storefront.href = `/s/${store.slug}`;
    storefront.target = '_blank';
    storefront.rel = 'noopener';
    storefront.textContent = 'View storefront';
    const adminLogin = document.createElement('a');
    adminLogin.className = 'platform-secondary-button';
    adminLogin.href = `/s/${store.slug}/admin/login`;
    adminLogin.target = '_blank';
    adminLogin.rel = 'noopener';
    adminLogin.textContent = 'Admin login';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = store.is_active ? 'platform-danger-button' : 'platform-secondary-button';
    toggle.textContent = store.is_active ? 'Suspend' : 'Reactivate';
    toggle.addEventListener('click', async () => {
        const action = store.is_active ? 'suspend' : 'reactivate';
        if (!(await askForConfirmation(`${action[0].toUpperCase()}${action.slice(1)} store?`, store.is_active
            ? 'The storefront will be hidden and its admins will be blocked. Store data will be preserved.'
            : 'The storefront and its admins will regain access.'))) return;
        try {
            await requestJson(`/api/platform/stores/${store.store_id}/status`, {
                method: 'PATCH', body: JSON.stringify({ is_active: !store.is_active })
            });
            await loadStores();
        } catch (error) {
            setMessage(storeListMessage, error.message, true);
        }
    });
    const adminsButton = document.createElement('button');
    adminsButton.type = 'button';
    adminsButton.className = 'platform-secondary-button';
    adminsButton.textContent = `Manage admins (${store._count.administrators})`;
    actions.append(status, storefront, adminLogin, adminsButton, toggle);
    header.append(title, actions);

    const details = document.createElement('div');
    details.className = 'platform-store-details';
    details.hidden = true;
    const profile = document.createElement('section');
    const profileTitle = document.createElement('h3');
    profileTitle.textContent = 'Store profile';
    const meta = document.createElement('div');
    meta.className = 'platform-store-meta';
    const contact = document.createElement('span');
    contact.textContent = `Contact: ${store.contact_email || 'Not set'} · ${store.contact_phone || 'Not set'}`;
    const inventory = document.createElement('span');
    inventory.textContent = `${store._count.laptops} laptop listings`;
    const storeAdmins = document.createElement('div');
    storeAdmins.className = 'platform-admin-list';
    const profileForm = document.createElement('form');
    profileForm.className = 'platform-inline-form';
    profileForm.innerHTML = '<label>Store display name<input name="name" maxlength="100" required></label><label>Contact email<input name="contact_email" type="email" maxlength="100"></label><label>Contact phone<input name="contact_phone" maxlength="40"></label><label>Logo URL<input name="logo_url" type="url" placeholder="https://..."></label><button class="platform-secondary-button" type="submit">Save store profile</button>';
    profileForm.elements.name.value = store.name;
    profileForm.elements.contact_email.value = store.contact_email || '';
    profileForm.elements.contact_phone.value = store.contact_phone || '';
    profileForm.elements.logo_url.value = store.logo_url || '';
    profileForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(profileForm).entries());
        try {
            await requestJson(`/api/platform/stores/${store.store_id}`, { method: 'PATCH', body: JSON.stringify(values) });
            await loadStores();
        } catch (error) {
            setMessage(storeListMessage, error.message, true);
        }
    });
    const addAdminForm = document.createElement('form');
    addAdminForm.className = 'platform-inline-form';
    addAdminForm.innerHTML = '<label>Username<input name="username" required maxlength="50"></label><label>Email<input name="email" type="email" required maxlength="100"></label><button class="platform-primary-button" type="submit">Create admin</button>';
    const passwordNotice = document.createElement('div');
    passwordNotice.className = 'platform-store-credential';
    passwordNotice.hidden = true;
    addAdminForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(addAdminForm).entries());
        try {
            const result = await requestJson(`/api/platform/stores/${store.store_id}/admins`, {
                method: 'POST', body: JSON.stringify(values)
            });
            addAdminForm.reset();
            showTemporaryPassword(passwordNotice, result.temporaryPassword);
            store._count.administrators += 1;
            adminsButton.textContent = `Manage admins (${store._count.administrators})`;
            await loadAdmins(store.store_id, storeAdmins);
        } catch (error) {
            setMessage(storeListMessage, error.message, true);
        }
    });
    profile.append(profileTitle, meta, profileForm, addAdminForm, passwordNotice);
    meta.append(contact, inventory);
    const adminSection = document.createElement('section');
    const adminTitle = document.createElement('h3');
    adminTitle.textContent = 'Store administrators';
    adminSection.append(adminTitle, storeAdmins);
    details.append(profile, adminSection);
    adminsButton.addEventListener('click', async () => {
        details.hidden = !details.hidden;
        if (!details.hidden) await loadAdmins(store.store_id, storeAdmins);
    });
    card.append(header, details);
    return card;
}

async function loadAdmins(storeId, target) {
    target.replaceChildren();
    const result = await requestJson(`/api/platform/stores/${storeId}/admins`);
    if (!result.data.length) {
        const empty = document.createElement('p');
        empty.className = 'platform-muted';
        empty.textContent = 'No administrators have been added.';
        target.append(empty);
        return;
    }
    result.data.forEach((admin) => target.append(createAdminRow(admin, storeId)));
}

async function loadStores() {
    try {
        const result = await requestJson('/api/platform/stores');
        stores = result.data;
        storeList.replaceChildren();
        if (!stores.length) {
            const empty = document.createElement('p');
            empty.className = 'platform-muted';
            empty.textContent = 'No stores have been created yet.';
            storeList.append(empty);
            return;
        }
        stores.forEach((store) => storeList.append(createStoreCard(store)));
        setMessage(storeListMessage, '');
    } catch (error) {
        if (error.message.includes('authentication')) {
            window.location.href = '/platform/login';
            return;
        }
        setMessage(storeListMessage, error.message, true);
    }
}

async function initPlatform() {
    try {
        const result = await requestJson('/api/platform/auth/me');
        document.getElementById('ownerName').textContent = result.owner.username;
        document.getElementById('platformWelcome').textContent = `Signed in as ${result.owner.username}`;
        await loadStores();
    } catch {
        window.location.href = '/platform/login';
    }
}

createStoreForm.elements.name.addEventListener('input', () => {
    if (createStoreForm.elements.slug.dataset.edited === 'true') return;
    createStoreForm.elements.slug.value = createStoreForm.elements.name.value
        .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
});
createStoreForm.elements.slug.addEventListener('input', () => {
    createStoreForm.elements.slug.dataset.edited = 'true';
    createStoreForm.elements.slug.value = createStoreForm.elements.slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
});
createStoreForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage(createStoreMessage, 'Creating store…');
    credentialNotice.hidden = true;
    const values = Object.fromEntries(new FormData(createStoreForm).entries());
    try {
        const result = await requestJson('/api/platform/stores', { method: 'POST', body: JSON.stringify(values) });
        createStoreForm.reset();
        createStoreForm.elements.slug.dataset.edited = 'false';
        setMessage(createStoreMessage, `Created ${result.data.store.name}.`);
        showTemporaryPassword(credentialNotice, result.temporaryPassword, `${result.data.admin.username}'s temporary password`);
        await loadStores();
    } catch (error) {
        setMessage(createStoreMessage, error.message, true);
    }
});

document.getElementById('refreshStores').addEventListener('click', loadStores);
document.getElementById('platformLogout').addEventListener('click', async () => {
    try {
        await requestJson('/api/platform/auth/logout', { method: 'POST' });
        window.location.href = '/platform/login';
    } catch (error) {
        setMessage(storeListMessage, error.message, true);
    }
});

initPlatform();
