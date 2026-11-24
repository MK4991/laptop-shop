(() => {
    const preferenceKey = 'liq-admin-theme';
    const applyTheme = (theme) => {
        document.body.classList.toggle('admin-dark', theme === 'dark');
    };

    let savedTheme;
    try { savedTheme = localStorage.getItem(preferenceKey); } catch (_) { savedTheme = null; }
    applyTheme(savedTheme === 'dark' ? 'dark' : 'light');

    const addMobileNavigation = () => {
        if (!document.querySelector('.sidebar') || document.querySelector('.mobile-admin-nav')) return;

        const nav = document.createElement('nav');
        nav.className = 'mobile-admin-nav';
        nav.setAttribute('aria-label', 'Admin navigation');

        const pathname = window.location.pathname;
        const adminPath = window.storePath('/admin');
        const items = [
            { label: 'Dashboard', icon: '▦', href: adminPath, active: pathname === adminPath && !window.location.hash },
            { label: 'Inventory', icon: '▤', href: window.storePath('/admin#inventory'), active: window.location.hash === '#inventory' || (pathname.includes('/admin/laptops/') && !pathname.endsWith('/admin/laptops/new')) || pathname.includes('/admin/edit-laptop') || pathname.includes('/admin/manage-images') },
            { label: 'Settings', icon: '⚙', href: window.storePath('/admin/settings'), active: pathname.includes('/admin/settings') },
            { label: 'Add', icon: '＋', href: window.storePath('/admin/laptops/new'), active: pathname.endsWith('/admin/laptops/new') }
        ];

        items.forEach((item) => {
            const link = document.createElement('a');
            link.href = item.href;
            link.className = 'mobile-admin-nav-item';
            if (item.active) link.setAttribute('aria-current', 'page');
            const icon = document.createElement('span');
            icon.className = 'mobile-admin-nav-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = item.icon;
            const label = document.createElement('span');
            label.textContent = item.label;
            link.append(icon, label);
            nav.append(link);
        });

        const logout = document.createElement('button');
        logout.type = 'button';
        logout.className = 'mobile-admin-nav-item mobile-admin-logout';
        logout.setAttribute('aria-label', 'Log out');
        logout.innerHTML = '<span class="mobile-admin-nav-icon" aria-hidden="true">↪</span><span>Log out</span>';
        logout.addEventListener('click', async () => {
            logout.disabled = true;
            try {
                const response = await fetch(window.storeApi('/auth/logout'), { method: 'POST' });
                if (!response.ok) throw new Error('Could not log out. Please try again.');
                window.location.assign(window.storePath('/admin/login'));
            } catch (error) {
                logout.disabled = false;
                window.alert(error.message);
            }
        });
        nav.append(logout);
        document.body.append(nav);
        document.body.classList.add('has-mobile-admin-nav');
    };

    const addToggle = () => {
        const header = document.querySelector('.topbar');
        if (document.querySelector('.admin-theme-toggle')) {
            addMobileNavigation();
            return;
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'admin-theme-toggle';
        button.setAttribute('aria-pressed', String(savedTheme === 'dark'));

        const updateButton = () => {
            const dark = document.body.classList.contains('admin-dark');
            button.textContent = dark ? '☀ Light theme' : '☾ Dark theme';
            button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
            button.setAttribute('aria-pressed', String(dark));
        };

        button.addEventListener('click', () => {
            const dark = !document.body.classList.contains('admin-dark');
            applyTheme(dark ? 'dark' : 'light');
            savedTheme = dark ? 'dark' : 'light';
            try { localStorage.setItem(preferenceKey, savedTheme); } catch (_) { /* Theme still applies for this page. */ }
            updateButton();
        });
        updateButton();

        const rightSide = header?.querySelector('.topbar-right');
        if (rightSide) rightSide.prepend(button);
        else if (header) header.append(button);
        else document.body.append(button);

        addMobileNavigation();
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addToggle, { once: true });
    else addToggle();
})();
