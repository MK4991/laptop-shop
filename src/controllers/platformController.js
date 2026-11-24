const crypto = require('crypto');
const bcrypt = require('bcrypt');
const prisma = require('../config/database');

const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

async function revokeSessions(predicate) {
    const sessions = await prisma.adminSession.findMany({ select: { sid: true, data: true } });
    const ids = sessions.filter((session) => predicate(session.data || {})).map((session) => session.sid);
    if (ids.length) await prisma.adminSession.deleteMany({ where: { sid: { in: ids } } });
}

const login = async (req, res) => {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }
    try {
        const owner = await prisma.platformOwner.findUnique({ where: { username: username.trim() } });
        if (!owner || !(await bcrypt.compare(password, owner.password_hash))) {
            return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }
        req.session.regenerate((error) => {
            if (error) return res.status(500).json({ success: false, message: 'Sign-in failed.' });
            req.session.platformOwnerId = owner.owner_id.toString();
            req.session.platformOwnerUsername = owner.username;
            req.session.save((saveError) => {
                if (saveError) return res.status(500).json({ success: false, message: 'Sign-in failed.' });
                res.json({ success: true, owner: { username: owner.username } });
            });
        });
    } catch (error) {
        console.error('Platform owner login error:', error);
        res.status(500).json({ success: false, message: 'Sign-in failed.' });
    }
};

const me = (req, res) => {
    if (!req.session.platformOwnerId) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    res.json({ success: true, owner: { username: req.session.platformOwnerUsername } });
};

const logout = (req, res) => {
    req.session.destroy((error) => {
        if (error) return res.status(500).json({ success: false, message: 'Sign-out failed.' });
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
};

const listStores = async (req, res) => {
    try {
        const stores = await prisma.store.findMany({
            orderBy: { created_at: 'desc' },
            include: { _count: { select: { administrators: true, laptops: true } } }
        });
        res.json({ success: true, data: stores.map((store) => ({
            ...store,
            store_id: store.store_id.toString(),
            _count: store._count
        })) });
    } catch (error) {
        console.error('List stores error:', error);
        res.status(500).json({ success: false, message: 'Could not load stores.' });
    }
};

const createStore = async (req, res) => {
    const { name, slug, logo_url, contact_email, contact_phone, admin_username, admin_email } = req.body;
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
    const username = typeof admin_username === 'string' ? admin_username.trim() : '';
    const email = typeof admin_email === 'string' ? admin_email.trim().toLowerCase() : '';
    if (!cleanName || cleanName.length > 100 || !slugPattern.test(cleanSlug) || cleanSlug === 'liq-technologies') {
        return res.status(400).json({ success: false, message: 'Enter a store name and a unique URL slug using lowercase letters, numbers, and hyphens.' });
    }
    if (!/^[\w.-]{2,50}$/.test(username) || !/^\S+@\S+\.\S+$/.test(email) || email.length > 100) {
        return res.status(400).json({ success: false, message: 'Enter a valid first administrator username and email address.' });
    }
    if (logo_url && (typeof logo_url !== 'string' || logo_url.length > 500 || !/^https:\/\//i.test(logo_url))) {
        return res.status(400).json({ success: false, message: 'Logo URL must be a valid HTTPS URL.' });
    }
    try {
        const temporaryPassword = crypto.randomBytes(12).toString('base64url');
        const store = await prisma.$transaction(async (tx) => {
            const created = await tx.store.create({
                data: {
                    name: cleanName,
                    slug: cleanSlug,
                    logo_url: logo_url || null,
                    contact_email: typeof contact_email === 'string' && contact_email.trim() ? contact_email.trim().slice(0, 100) : null,
                    contact_phone: typeof contact_phone === 'string' && contact_phone.trim() ? contact_phone.trim().slice(0, 40) : null
                }
            });
            await Promise.all([
                tx.processorBrandOption.createMany({ data: ['Intel', 'AMD', 'Apple', 'Other'].map((option_name) => ({ store_id: created.store_id, option_name })) }),
                tx.storageTypeOption.createMany({ data: ['SSD', 'HDD', 'NVMe SSD', 'eMMC', 'Other'].map((option_name) => ({ store_id: created.store_id, option_name })) }),
                tx.conditionOption.createMany({ data: ['New', 'Used'].map((option_name) => ({ store_id: created.store_id, option_name })) })
            ]);
            const admin = await tx.administrator.create({
                data: {
                    store_id: created.store_id,
                    username,
                    email,
                    password_hash: await bcrypt.hash(temporaryPassword, 12),
                    must_change_password: true
                },
                select: { admin_id: true, username: true, email: true }
            });
            return { store: created, admin };
        });
        res.status(201).json({
            success: true,
            data: {
                store: { ...store.store, store_id: store.store.store_id.toString() },
                admin: { ...store.admin, admin_id: store.admin.admin_id.toString() }
            },
            temporaryPassword
        });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'That store URL slug is already in use.' });
        console.error('Create store error:', error);
        res.status(500).json({ success: false, message: 'Could not create store.' });
    }
};

const updateStore = async (req, res) => {
    const id = /^\d{1,18}$/.test(req.params.id) ? BigInt(req.params.id) : null;
    const { name, logo_url, contact_email, contact_phone } = req.body;
    if (id === null) return res.status(400).json({ success: false, message: 'Invalid store.' });
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        return res.status(400).json({ success: false, message: 'Store name is required.' });
    }
    if (logo_url && (typeof logo_url !== 'string' || logo_url.length > 500 || !/^https:\/\//i.test(logo_url))) {
        return res.status(400).json({ success: false, message: 'Logo URL must be a valid HTTPS URL.' });
    }
    try {
        const store = await prisma.store.update({
            where: { store_id: id },
            data: {
                name: name.trim(),
                logo_url: logo_url || null,
                contact_email: typeof contact_email === 'string' && contact_email.trim() ? contact_email.trim().slice(0, 100) : null,
                contact_phone: typeof contact_phone === 'string' && contact_phone.trim() ? contact_phone.trim().slice(0, 40) : null
            }
        });
        res.json({ success: true, data: { ...store, store_id: store.store_id.toString() } });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Store not found.' });
        console.error('Update store error:', error);
        res.status(500).json({ success: false, message: 'Could not update store.' });
    }
};

const setStoreStatus = async (req, res) => {
    const id = /^\d{1,18}$/.test(req.params.id) ? BigInt(req.params.id) : null;
    if (id === null || typeof req.body.is_active !== 'boolean') {
        return res.status(400).json({ success: false, message: 'Choose a valid store status.' });
    }
    try {
        const store = await prisma.store.update({ where: { store_id: id }, data: { is_active: req.body.is_active } });
        if (!store.is_active) {
            await revokeSessions((data) => data.storeId === store.store_id.toString());
        }
        res.json({ success: true, data: { store_id: store.store_id.toString(), is_active: store.is_active } });
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Store not found.' });
        console.error('Change store status error:', error);
        res.status(500).json({ success: false, message: 'Could not update store status.' });
    }
};

const listAdmins = async (req, res) => {
    if (!/^\d{1,18}$/.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid store.' });
    try {
        const admins = await prisma.administrator.findMany({
            where: { store_id: BigInt(req.params.id) },
            orderBy: { username: 'asc' },
            select: { admin_id: true, username: true, email: true, must_change_password: true }
        });
        res.json({ success: true, data: admins.map((admin) => ({ ...admin, admin_id: admin.admin_id.toString() })) });
    } catch (error) {
        console.error('List store admins error:', error);
        res.status(500).json({ success: false, message: 'Could not load store administrators.' });
    }
};

const createAdmin = async (req, res) => {
    const storeId = /^\d{1,18}$/.test(req.params.id) ? BigInt(req.params.id) : null;
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (storeId === null || !/^[\w.-]{2,50}$/.test(username) || !/^\S+@\S+\.\S+$/.test(email) || email.length > 100) {
        return res.status(400).json({ success: false, message: 'Enter a valid username and email address.' });
    }
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    try {
        const admin = await prisma.administrator.create({
            data: {
                store_id: storeId,
                username,
                email,
                password_hash: await bcrypt.hash(temporaryPassword, 12),
                must_change_password: true
            },
            select: { admin_id: true, username: true, email: true, must_change_password: true }
        });
        res.status(201).json({
            success: true,
            data: { ...admin, admin_id: admin.admin_id.toString() },
            temporaryPassword
        });
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'That username or email is already used in this store.' });
        if (error.code === 'P2003') return res.status(404).json({ success: false, message: 'Store not found.' });
        console.error('Create store admin error:', error);
        res.status(500).json({ success: false, message: 'Could not create administrator.' });
    }
};

const resetAdminPassword = async (req, res) => {
    if (!/^\d{1,18}$/.test(req.params.id) || !/^\d{1,18}$/.test(req.params.adminId)) {
        return res.status(400).json({ success: false, message: 'Invalid store or administrator.' });
    }
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    try {
        const result = await prisma.administrator.updateMany({
            where: { admin_id: BigInt(req.params.adminId), store_id: BigInt(req.params.id) },
            data: { password_hash: await bcrypt.hash(temporaryPassword, 12), must_change_password: true }
        });
        if (!result.count) return res.status(404).json({ success: false, message: 'Administrator not found.' });
        await revokeSessions((data) => data.adminId === req.params.adminId);
        res.json({ success: true, temporaryPassword });
    } catch (error) {
        console.error('Reset store admin password error:', error);
        res.status(500).json({ success: false, message: 'Could not reset administrator password.' });
    }
};

module.exports = { login, me, logout, listStores, createStore, updateStore, setStoreStatus, listAdmins, createAdmin, resetAdminPassword };
