require('dotenv').config();

const bcrypt = require('bcrypt');
const prisma = require('./src/config/database');

async function createPlatformOwner() {
    try {
        const existing = await prisma.platformOwner.count();
        if (existing > 0) {
            console.log('Platform owner account already exists.');
            return;
        }

        const username = process.env.PLATFORM_OWNER_USERNAME?.trim();
        const email = process.env.PLATFORM_OWNER_EMAIL?.trim().toLowerCase();
        const password = process.env.PLATFORM_OWNER_PASSWORD;
        if (!username || !email || !password) {
            throw new Error('Set PLATFORM_OWNER_USERNAME, PLATFORM_OWNER_EMAIL, and PLATFORM_OWNER_PASSWORD before creating the first platform owner.');
        }
        if (password.length < 12) throw new Error('PLATFORM_OWNER_PASSWORD must be at least 12 characters long.');

        await prisma.platformOwner.create({
            data: {
                username,
                email,
                password_hash: await bcrypt.hash(password, 12)
            }
        });
        console.log('Platform owner account created successfully.');
    } catch (error) {
        console.error('Failed to create platform owner:', error.message || error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

createPlatformOwner();
