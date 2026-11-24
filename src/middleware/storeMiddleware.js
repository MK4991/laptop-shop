const prisma = require('../config/database');

const resolveStore = async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }
        const store = await prisma.store.findUnique({ where: { slug } });
        if (!store || !store.is_active) {
            return res.status(404).json({ success: false, message: 'Store not found.' });
        }
        req.store = store;
        req.storeId = store.store_id;
        next();
    } catch (error) {
        console.error('Store resolution error:', error);
        res.status(500).json({ success: false, message: 'Could not load this store.' });
    }
};

const resolveStorePage = async (req, res, next) => {
    try {
        const slug = req.params.slug;
        if (typeof slug !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
            return res.status(404).send('Store not found.');
        }
        const store = await prisma.store.findUnique({ where: { slug } });
        if (!store || !store.is_active) return res.status(404).send('Store not found.');
        req.store = store;
        req.storeId = store.store_id;
        next();
    } catch (error) {
        console.error('Store page resolution error:', error);
        res.status(500).send('Could not load this store.');
    }
};

module.exports = { resolveStore, resolveStorePage };
