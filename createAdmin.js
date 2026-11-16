
require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('./src/config/database');

async function createAdmin() {
    try {
        const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

        if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
            throw new Error(
                'Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD before creating an admin.'
            );
        }

        if (ADMIN_PASSWORD.length < 12) {
            throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
        }

        const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

        await prisma.administrator.upsert({
            where: {
                username: ADMIN_USERNAME
            },
            update: {
                email: ADMIN_EMAIL,
                password_hash: hashedPassword
            },
            create: {
                username: ADMIN_USERNAME,
                email: ADMIN_EMAIL,
                password_hash: hashedPassword
            }
        });

        console.log('Admin account created successfully!');
    } catch (error) {
        console.error('Failed to create admin:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
