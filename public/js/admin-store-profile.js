const form = document.getElementById('storeProfileForm');
const nameInput = document.getElementById('storeProfileName');
const emailInput = document.getElementById('storeProfileEmail');
const phoneInput = document.getElementById('storeProfilePhone');
const addressInput = document.getElementById('storeProfileAddress');
const mapsUrlInput = document.getElementById('storeProfileMapsUrl');
const mapEmbedUrlInput = document.getElementById('storeProfileMapEmbedUrl');
const logoInput = document.getElementById('storeProfileLogo');
const logoPreview = document.getElementById('storeProfileLogoPreview');
const removeLogo = document.getElementById('storeProfileRemoveLogo');
const removeLogoLabel = document.getElementById('storeProfileRemoveLogoLabel');
const message = document.getElementById('storeProfileMessage');
const saveButton = document.getElementById('saveStoreProfileBtn');
const socialLinksList = document.getElementById('storeSocialLinksList');
const addSocialLinkButton = document.getElementById('addSocialLinkBtn');
const socialLinkLimitNote = document.getElementById('socialLinkLimitNote');
const maxSocialLinks = 12;
const socialPlatforms = [
    ['facebook', 'Facebook'],
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['whatsapp', 'WhatsApp'],
    ['telegram', 'Telegram'],
    ['linkedin', 'LinkedIn'],
    ['x', 'X'],
    ['other', 'Other']
];
let previewObjectUrl;

function normalizeSocialLabel(value) {
    const normalized = String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const aliases = { fb: 'facebook', insta: 'instagram', yt: 'youtube', wa: 'whatsapp', twitter: 'x' };
    const alias = aliases[normalized] || normalized;
    return socialPlatforms.some(([platform]) => platform === alias && platform !== 'other') ? alias : 'other';
}

function renderLogo(url, name) {
    if (url) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = `${name} logo preview`;
        logoPreview.replaceChildren(image);
    } else {
        logoPreview.textContent = name.trim().charAt(0).toUpperCase() || 'S';
    }
}

function initializeProfile(store) {
    if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = undefined;
    nameInput.value = store.name;
    emailInput.value = store.contact_email || '';
    phoneInput.value = store.contact_phone || '';
    addressInput.value = store.contact_address || '';
    mapsUrlInput.value = store.maps_url || '';
    mapEmbedUrlInput.value = store.map_embed_url || '';
    renderLogo(store.logo_url, store.name);
    removeLogoLabel.hidden = !store.logo_url;
    renderSocialLinkRows(store.social_links || []);
}

function createSocialLinkRow(link = {}) {
    const row = document.createElement('div');
    row.className = 'store-social-link-row';

    const platformWrap = document.createElement('label');
    platformWrap.append(document.createTextNode('Platform'));
    const platformSelect = document.createElement('select');
    platformSelect.dataset.socialPlatform = '';
    platformSelect.add(new Option('Select a platform', ''));
    socialPlatforms.forEach(([value, label]) => platformSelect.add(new Option(label, value)));
    const selectedPlatform = link.label ? normalizeSocialLabel(link.label) : '';
    platformSelect.value = selectedPlatform;
    platformWrap.append(platformSelect);

    const customNameWrap = document.createElement('label');
    customNameWrap.append(document.createTextNode('Other platform name'));
    const customNameInput = document.createElement('input');
    customNameInput.type = 'text';
    customNameInput.maxLength = 40;
    customNameInput.placeholder = 'e.g. Threads';
    customNameInput.value = selectedPlatform === 'other' ? (link.label || '') : '';
    customNameInput.dataset.socialCustomLabel = '';
    customNameWrap.append(customNameInput);
    customNameWrap.hidden = selectedPlatform !== 'other';
    customNameInput.required = selectedPlatform === 'other';

    const urlWrap = document.createElement('label');
    urlWrap.append(document.createTextNode('Profile URL'));
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.maxLength = 500;
    urlInput.pattern = 'https?://.+';
    urlInput.title = 'Enter a URL beginning with http:// or https://';
    urlInput.placeholder = 'https://example.com/your-profile';
    urlInput.value = link.url || '';
    urlInput.dataset.socialUrl = '';
    urlWrap.append(urlInput);

    platformSelect.addEventListener('change', () => {
        const isOther = platformSelect.value === 'other';
        customNameWrap.hidden = !isOther;
        customNameInput.required = isOther;
        if (!isOther) customNameInput.value = '';
        updateSocialLinkControls();
    });

    const actions = document.createElement('div');
    actions.className = 'store-social-link-actions';
    const moveUp = document.createElement('button');
    moveUp.type = 'button';
    moveUp.textContent = '↑';
    const moveDown = document.createElement('button');
    moveDown.type = 'button';
    moveDown.textContent = '↓';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-social-link';
    remove.textContent = 'Remove';

    moveUp.addEventListener('click', () => {
        const previous = row.previousElementSibling;
        if (previous) socialLinksList.insertBefore(row, previous);
        updateSocialLinkControls();
    });
    moveDown.addEventListener('click', () => {
        const next = row.nextElementSibling;
        if (next) socialLinksList.insertBefore(next, row);
        updateSocialLinkControls();
    });
    remove.addEventListener('click', () => {
        row.remove();
        updateSocialLinkControls();
    });

    actions.append(moveUp, moveDown, remove);
    row.append(platformWrap, customNameWrap, urlWrap, actions);
    return row;
}

function updateSocialLinkControls() {
    const rows = Array.from(socialLinksList.querySelectorAll('.store-social-link-row'));
    rows.forEach((row, index) => {
        const [moveUp, moveDown] = row.querySelectorAll('.store-social-link-actions button');
        const platform = row.querySelector('[data-social-platform]').value;
        const label = platform === 'other'
            ? row.querySelector('[data-social-custom-label]').value.trim() || 'custom social link'
            : (socialPlatforms.find(([value]) => value === platform)?.[1] || 'social link');
        moveUp.disabled = index === 0;
        moveDown.disabled = index === rows.length - 1;
        moveUp.setAttribute('aria-label', `Move ${label} up`);
        moveDown.setAttribute('aria-label', `Move ${label} down`);
    });
    socialLinkLimitNote.textContent = `${rows.length} of ${maxSocialLinks} links`;
    addSocialLinkButton.disabled = rows.length >= maxSocialLinks;
}

function renderSocialLinkRows(links) {
    socialLinksList.replaceChildren(...links.map(createSocialLinkRow));
    updateSocialLinkControls();
}

async function initialize() {
    try {
        const response = await fetch(storeApi('/auth/me'));
        if (!response.ok) return window.location.assign(storePath('/admin/login'));
        const auth = await response.json();
        if (auth.admin?.mustChangePassword) return window.location.assign(storePath('/admin/change-password'));
        const store = await loadStoreProfile();
        initializeProfile(store);
        if (auth.admin?.username) document.getElementById('adminUsername').textContent = `Welcome, ${auth.admin.username}`;
    } catch (error) {
        message.textContent = error.message;
        message.classList.add('error');
    }
}

logoInput.addEventListener('change', () => {
    const file = logoInput.files[0];
    if (file) {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = URL.createObjectURL(file);
        renderLogo(previewObjectUrl, nameInput.value || 'Store');
        removeLogo.checked = false;
    } else if (window.CURRENT_STORE) {
        renderLogo(window.CURRENT_STORE.logo_url, nameInput.value || window.CURRENT_STORE.name);
    }
});

nameInput.addEventListener('input', () => {
    if (!logoInput.files.length && !window.CURRENT_STORE?.logo_url) renderLogo('', nameInput.value || 'Store');
});

removeLogo.addEventListener('change', () => {
    if (removeLogo.checked) {
        logoInput.value = '';
        renderLogo('', nameInput.value || 'Store');
    } else if (window.CURRENT_STORE) {
        renderLogo(window.CURRENT_STORE.logo_url, nameInput.value || window.CURRENT_STORE.name);
    }
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    message.classList.remove('error');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    const body = new FormData();
    body.set('name', nameInput.value.trim());
    body.set('contact_email', emailInput.value.trim());
    body.set('contact_phone', phoneInput.value.trim());
    body.set('contact_address', addressInput.value.trim());
    body.set('maps_url', mapsUrlInput.value.trim());
    const mapEmbedInput = mapEmbedUrlInput.value.trim();
    const iframeSource = mapEmbedInput.match(/<iframe\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
    const mapEmbedUrl = (iframeSource ? iframeSource[2] : mapEmbedInput).replace(/&amp;/g, '&').trim();
    body.set('map_embed_url', mapEmbedUrl);
    if (logoInput.files[0]) body.set('logo', logoInput.files[0]);
    if (removeLogo.checked) body.set('removeLogo', 'true');

    const socialLinks = Array.from(socialLinksList.querySelectorAll('.store-social-link-row')).map((row) => ({
        platform: row.querySelector('[data-social-platform]').value,
        customLabel: row.querySelector('[data-social-custom-label]').value.trim(),
        url: row.querySelector('[data-social-url]').value.trim()
    }));
    const incompleteLink = socialLinks.find((link) => {
        if (!link.platform && !link.customLabel && !link.url) return false;
        return !link.platform || !link.url || (link.platform === 'other' && !link.customLabel);
    });
    if (incompleteLink) {
        message.textContent = 'Choose a platform and enter its URL. For Other, also enter a platform name.';
        message.classList.add('error');
        saveButton.disabled = false;
        saveButton.textContent = 'Save store profile';
        return;
    }
    const usedPlatforms = new Set();
    const duplicatePlatform = socialLinks.find((link) => {
        if (!link.platform || link.platform === 'other') return false;
        if (usedPlatforms.has(link.platform)) return true;
        usedPlatforms.add(link.platform);
        return false;
    });
    if (duplicatePlatform) {
        message.textContent = 'Each listed platform can only be added once. You can add multiple Other links.';
        message.classList.add('error');
        saveButton.disabled = false;
        saveButton.textContent = 'Save store profile';
        return;
    }
    body.set('socialLinks', JSON.stringify(socialLinks
        .filter((link) => link.platform && link.url)
        .map(({ platform, customLabel, url }) => ({ platform, customLabel, url }))));

    try {
        const response = await fetch(storeApi('/profile'), { method: 'PUT', body });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Could not save store profile.');
        const store = await loadStoreProfile();
        initializeProfile(store);
        logoInput.value = '';
        removeLogo.checked = false;
        message.textContent = result.message;
    } catch (error) {
        message.textContent = error.message;
        message.classList.add('error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save store profile';
    }
});

addSocialLinkButton.addEventListener('click', () => {
    const row = createSocialLinkRow();
    socialLinksList.append(row);
    updateSocialLinkControls();
    row.querySelector('[data-social-platform]').focus();
});

document.getElementById('sidebarAddLaptopBtn').addEventListener('click', () => {
    window.location.assign(storePath('/admin/laptops/new'));
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await fetch(storeApi('/auth/logout'), { method: 'POST' }); }
    finally { window.location.assign(storePath('/admin/login')); }
});

initialize();
