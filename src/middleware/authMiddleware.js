
const requireAdmin = (req, res, next) => {
    if (!req.session.adminId || !req.store || req.session.storeId !== req.store.store_id.toString()) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    if (req.session.mustChangePassword) {
        return res.status(403).json({
            success: false,
            mustChangePassword: true,
            message: 'Change your temporary password before continuing.'
        });
    }

    next();
};

const hasAdminSessionForStore = (req) => Boolean(
    req.session?.adminId &&
    req.store &&
    req.session.storeId === req.store.store_id.toString()
);

const redirectAdmin = (req, res, destination) => {
    res.redirect(302, `/s/${encodeURIComponent(req.store.slug)}/admin${destination}`);
};

// Protect admin HTML before it is sent, avoiding a visible dashboard flash.
const requireAdminPage = (req, res, next) => {
    if (!hasAdminSessionForStore(req)) return redirectAdmin(req, res, '/login');
    if (req.session.mustChangePassword) return redirectAdmin(req, res, '/change-password');
    next();
};

const requirePasswordChangePage = (req, res, next) => {
    if (!hasAdminSessionForStore(req)) return redirectAdmin(req, res, '/login');
    if (!req.session.mustChangePassword) return redirectAdmin(req, res, '');
    next();
};

const redirectAuthenticatedAdmin = (req, res, next) => {
    if (!hasAdminSessionForStore(req)) return next();
    return redirectAdmin(req, res, req.session.mustChangePassword ? '/change-password' : '');
};

const requirePlatformOwner = (req, res, next) => {
    if (!req.session.platformOwnerId) {
        return res.status(401).json({ success: false, message: 'Platform owner authentication required.' });
    }
    next();
};

// Check current admin session
const getCurrentAdmin = (req, res) => {
    if (!req.session.adminId || !req.store || req.session.storeId !== req.store.store_id.toString()) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    res.status(200).json({
        success: true,
        admin: {
            id: req.session.adminId,
            username: req.session.username,
            storeId: req.session.storeId,
            storeSlug: req.session.storeSlug,
            mustChangePassword: Boolean(req.session.mustChangePassword)
        }
    });
};

module.exports = {
    requireAdmin,
    requireAdminPage,
    requirePasswordChangePage,
    redirectAuthenticatedAdmin,
    requirePlatformOwner,
    getCurrentAdmin
};
