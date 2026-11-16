
const requireAdmin = (req, res, next) => {
    if (!req.session.adminId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    next();
};

// Check current admin session
const getCurrentAdmin = (req, res) => {
    if (!req.session.adminId) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    res.status(200).json({
        success: true,
        admin: {
            id: req.session.adminId,
            username: req.session.username
        }
    });
};

module.exports = {
    requireAdmin,
    getCurrentAdmin
};
