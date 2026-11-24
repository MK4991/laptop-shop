const storePathMatch = window.location.pathname.match(/^\/s\/([^/]+)/);
if (!storePathMatch) throw new Error('Store URL is missing its store slug.');

window.STORE_SLUG = decodeURIComponent(storePathMatch[1]);
window.STORE_PATH_BASE = `/s/${encodeURIComponent(window.STORE_SLUG)}`;
window.STORE_API_BASE = `/api/stores/${encodeURIComponent(window.STORE_SLUG)}`;
window.storePath = (suffix = '') => `${window.STORE_PATH_BASE}${suffix}`;
window.storeApi = (suffix = '') => `${window.STORE_API_BASE}${suffix}`;

const identifySocialPlatform = (label) => {
    const normalized = String(label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.includes('facebook') || normalized === 'fb') return 'facebook';
    if (normalized.includes('instagram') || normalized === 'insta') return 'instagram';
    if (normalized.includes('tiktok')) return 'tiktok';
    if (normalized.includes('youtube') || normalized === 'yt') return 'youtube';
    if (normalized.includes('whatsapp') || normalized === 'wa') return 'whatsapp';
    if (normalized.includes('telegram')) return 'telegram';
    if (normalized.includes('linkedin')) return 'linkedin';
    if (normalized === 'x' || normalized.includes('twitter')) return 'x';
    return 'link';
};

const socialIconMarkup = {
    facebook: '<path d="M14.2 21v-7.4h2.5l.4-2.9h-2.9V8.9c0-.8.2-1.4 1.5-1.4h1.5V4.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v1.9H8.4v2.9H11V21z"/>',
    instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.6" cy="6.7" r="1.2"/>',
    tiktok: '<path d="M15.5 3h3a5.5 5.5 0 0 0 2.5 4.5V11a9 9 0 0 1-5.5-2v6.7a5.8 5.8 0 1 1-5.8-5.8c.5 0 1 .1 1.5.2v3.2a2.7 2.7 0 1 0 1.3 2.3z"/>',
    youtube: '<path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2a31 31 0 0 0-.5 4.8A31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM10 15.7V8.3l6.3 3.7z"/>',
    whatsapp: '<path d="M12 2a9.8 9.8 0 0 0-8.4 14.8L2.3 22l5.4-1.4A10 10 0 1 0 12 2zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-3.2.8.9-3.1-.2-.3A8 8 0 1 1 12 19.8zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.6.1a6.6 6.6 0 0 1-3.3-2.9c-.3-.5.3-.5.8-1.4.1-.2 0-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3s-.9.9-.9 2.1 1 2.4 1.1 2.6a10.5 10.5 0 0 0 4.1 3.6c1.5.6 2.1.7 2.9.6.4-.1 1.4-.6 1.6-1.2s.2-1.1.1-1.2-.2-.2-.5-.3z"/>',
    telegram: '<path d="M22 3 2.7 10.5c-1.3.5-1.3 1.3-.2 1.6l4.9 1.5 1.9 6c.2.7.1 1 .8 1 .5 0 .8-.2 1.1-.5l2.4-2.4 5 3.7c.9.5 1.5.3 1.7-.8L23.5 4c.3-1.3-.5-1.9-1.5-1zm-12 10.3 10-6.3c.5-.3.9-.1.5.2l-8.2 7.5-.3 3.2z"/>',
    linkedin: '<path d="M5.2 8.3a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM3.3 10h3.8v11H3.3zm6.1 0H13v1.5h.1A4 4 0 0 1 16.7 9c3.9 0 4.6 2.5 4.6 5.8V21h-3.8v-5.5c0-1.3 0-3.1-1.9-3.1s-2.2 1.4-2.2 3V21H9.4z"/>',
    x: '<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.7 5.6 22H2.5l7.3-8.4L1.8 2h6.5l4.5 6.7zm-1.1 18h1.7L7.3 3.9H5.5z"/>',
    link: '<path d="M10.6 13.4a1 1 0 0 0 1.4 0l3.4-3.4a3 3 0 0 0-4.2-4.2L9.3 7.7a1 1 0 0 0 1.4 1.4l1.9-1.9a1 1 0 1 1 1.4 1.4l-3.4 3.4a1 1 0 0 0 0 1.4zM13.4 10.6a1 1 0 0 0-1.4 0l-3.4 3.4a3 3 0 0 0 4.2 4.2l1.9-1.9a1 1 0 0 0-1.4-1.4l-1.9 1.9a1 1 0 1 1-1.4-1.4l3.4-3.4a1 1 0 0 0 0-1.4z"/>'
};

const renderSocialLinks = (links = []) => {
    document.querySelectorAll('.store-social-links').forEach((container) => {
        container.replaceChildren();
        const compact = container.classList.contains('footer-social-links') ||
            container.classList.contains('contact-page-social-links');
        links.forEach(({ label, url }) => {
            let parsedUrl;
            try { parsedUrl = new URL(url); } catch (_) { return; }
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) return;

            const platform = identifySocialPlatform(label);
            const anchor = document.createElement('a');
            anchor.className = `store-social-link store-social-link--${platform}${compact ? ' store-social-link-compact' : ''}`;
            anchor.href = parsedUrl.toString();
            anchor.target = '_blank';
            anchor.rel = 'noopener noreferrer';
            anchor.setAttribute('aria-label', label);
            anchor.title = label;

            const icon = document.createElement('span');
            icon.className = 'store-social-icon';
            icon.setAttribute('aria-hidden', 'true');
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('focusable', 'false');
            svg.innerHTML = socialIconMarkup[platform];
            icon.append(svg);
            anchor.append(icon);
            if (!compact) {
                const text = document.createElement('span');
                text.textContent = label;
                anchor.append(text);
            }
            container.append(anchor);
        });
        container.hidden = container.childElementCount === 0;
    });
};

const setContactAction = (element, label, iconMarkup, value) => {
    const detail = element.querySelector('.contact-detail-value');
    if (detail) {
        detail.textContent = value;
        return;
    }
    element.replaceChildren();
    const icon = document.createElement('span');
    icon.className = 'contact-action-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = iconMarkup;
    const text = document.createElement('span');
    text.textContent = label;
    element.append(icon, text);
};

const phoneIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.1-.2 11.4 11.4 0 0 0 3.6.6 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17.1 17.1 0 0 1 3 4a1 1 0 0 1 1-1h3.4a1 1 0 0 1 1 1 11.4 11.4 0 0 0 .6 3.6 1 1 0 0 1-.2 1.1z"/></svg>';
const emailIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M3 5h18a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm9 8L4.5 7h15zM4 17h16V8.5l-8 6-8-6z"/></svg>';

window.loadStoreProfile = async () => {
    const response = await fetch(window.storeApi(''));
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Could not load store profile.');
    const store = result.data;
    window.CURRENT_STORE = store;
    document.querySelectorAll('.store-brand-name').forEach((element) => {
        element.textContent = store.name;
    });
    document.querySelectorAll('.store-contact-email').forEach((element) => {
        if (!store.contact_email) { element.hidden = true; return; }
        element.href = `mailto:${store.contact_email}`;
        setContactAction(element, 'Email', emailIcon, store.contact_email);
        element.hidden = false;
    });
    document.querySelectorAll('.store-contact-phone').forEach((element) => {
        if (!store.contact_phone) { element.hidden = true; return; }
        element.href = `tel:${store.contact_phone}`;
        setContactAction(element, 'Call', phoneIcon, store.contact_phone);
        element.hidden = false;
    });
    document.querySelectorAll('.store-contact-address').forEach((element) => {
        element.textContent = store.contact_address || '';
        element.hidden = !store.contact_address;
    });
    document.querySelectorAll('.store-contact-map-link').forEach((element) => {
        const fallbackUrl = store.contact_address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.contact_address)}`
            : '';
        const mapUrl = store.maps_url || fallbackUrl;
        let parsedMapUrl;
        try { parsedMapUrl = new URL(mapUrl); } catch (_) { parsedMapUrl = null; }
        if (!parsedMapUrl || !['http:', 'https:'].includes(parsedMapUrl.protocol)) {
            element.hidden = true;
            return;
        }
        element.href = parsedMapUrl.toString();
        element.target = '_blank';
        element.rel = 'noopener noreferrer';
        element.hidden = false;
    });
    renderSocialLinks(store.social_links || []);
    const hasContact = Boolean(store.contact_email || store.contact_phone || store.contact_address || store.maps_url || store.map_embed_url || (store.social_links || []).length);
    const contactSection = document.getElementById('contactSection');
    if (contactSection) {
        contactSection.hidden = !hasContact;
    }
    document.querySelectorAll('.contact-nav-link').forEach((link) => {
        link.hidden = !hasContact;
    });
    document.querySelectorAll('.brand-icon, .brand-logo').forEach((element) => {
        if (store.logo_url) {
            const image = document.createElement('img');
            image.src = store.logo_url;
            image.alt = `${store.name} logo`;
            image.className = 'store-logo-image';
            element.replaceChildren(image);
            element.classList.add('has-store-logo');
        } else {
            element.textContent = store.name.trim().charAt(0).toUpperCase() || 'S';
        }
    });
    document.querySelectorAll('a[data-store-route]').forEach((link) => {
        link.href = window.storePath(link.dataset.storeRoute || '');
    });
    document.querySelectorAll('.store-name-text').forEach((element) => {
        element.textContent = store.name;
    });
    document.querySelectorAll('.store-admin-label').forEach((element) => {
        element.textContent = `${store.name} Admin Panel`;
    });
    document.title = document.title.replace(/LIQ TECHNOLOGIES|Laptop Store|LIQ TECH/g, () => store.name);
    return store;
};
