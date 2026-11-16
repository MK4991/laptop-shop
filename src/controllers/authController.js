
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
        const admin = await prisma.administrator.findUnique({
            where: {
                username: username.trim()
            }
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
                        username: admin.username
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

module.exports = {
    login,
    logout
};
