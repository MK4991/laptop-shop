
const prisma = require('../config/database');
const bcrypt = require('bcrypt');

// Admin login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (typeof username !== 'string' || typeof password !== 'string' ||
            !username.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.'
            });
        }

        // Find administrator by username
        const admin = await prisma.administrator.findFirst({
            where: { store_id: req.storeId, username: username.trim() }
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Compare submitted password with stored hash
        const passwordMatch = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }

        // Rotate the session identifier after authentication.
        req.session.regenerate((error) => {
            if (error) {
                console.error(error);
                return res.status(500).json({
                    success: false,
                    message: 'Login failed'
                });
            }

            req.session.adminId = admin.admin_id.toString();
            req.session.username = admin.username;
            req.session.storeId = admin.store_id.toString();
            req.session.storeSlug = req.store.slug;
            req.session.mustChangePassword = admin.must_change_password;

            req.session.save((saveError) => {
                if (saveError) {
                    console.error(saveError);
                    return res.status(500).json({
                        success: false,
                        message: 'Login failed'
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    admin: {
                        id: admin.admin_id.toString(),
                        username: admin.username,
                        mustChangePassword: admin.must_change_password
                    }
                });
            });
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
};

// Admin logout
const logout = (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }

        res.clearCookie('connect.sid');

        res.status(200).json({
            success: true,
            message: 'Logout successful'
        });
    });
};

const changePassword = async (req, res) => {
    const password = req.body.password;
    if (typeof password !== 'string' || password.length < 12) {
        return res.status(400).json({ success: false, message: 'Password must be at least 12 characters long.' });
    }
    if (!req.session.adminId || req.session.storeId !== req.storeId.toString()) {
        return res.status(401).json({ success: false, message: 'Please sign in again.' });
    }
    try {
        const password_hash = await bcrypt.hash(password, 12);
        await prisma.administrator.updateMany({
            where: {
                admin_id: BigInt(req.session.adminId),
                store_id: req.storeId
            },
            data: { password_hash, must_change_password: false }
        });
        req.session.mustChangePassword = false;
        req.session.save((error) => {
            if (error) return res.status(500).json({ success: false, message: 'Could not save your new password.' });
            res.json({ success: true, message: 'Password updated successfully.' });
        });
    } catch (error) {
        console.error('Admin password change error:', error);
        res.status(500).json({ success: false, message: 'Could not update your password.' });
    }
};

module.exports = {
    login,
    logout,
    changePassword
};
