const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const session = require('express-session');
const PrismaSessionStore = require('./config/prismaSessionStore');
const prisma = require('./config/database');
const laptopRoutes = require('./routes/laptopRoutes');
const authRoutes = require('./routes/authRoutes');
const optionRoutes = require('./routes/optionRoutes');
const customSpecificationRoutes = require('./routes/customSpecificationRoutes');
const platformRoutes = require('./routes/platformRoutes');
const { resolveStore, resolveStorePage } = require('./middleware/storeMiddleware');
const {
    requireAdmin,
    requireAdminPage,
    requirePasswordChangePage,
    redirectAuthenticatedAdmin
} = require('./middleware/authMiddleware');
const { updateStoreProfile } = require('./controllers/storeProfileController');
const upload = require('./config/multer');

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set and contain at least 32 characters.');
}

const app = express();
app.set('json replacer', (key, value) => typeof value === 'bigint' ? value.toString() : value);
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    store: new PrismaSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use(express.static(path.join(__dirname, '../public')));

app.use('/api/platform', platformRoutes);
app.get('/api/stores/:slug', resolveStore, async (req, res) => {
    const { name, slug, logo_url, contact_email, contact_phone, contact_address, maps_url, map_embed_url } = req.store;
    const social_links = await prisma.storeSocialLink.findMany({
        where: { store_id: req.storeId },
        orderBy: [{ display_order: 'asc' }, { social_link_id: 'asc' }],
        select: { social_link_id: true, label: true, url: true, display_order: true }
    });
    res.json({ success: true, data: { name, slug, logo_url, contact_email, contact_phone, contact_address, maps_url, map_embed_url, social_links } });
});
app.put('/api/stores/:slug/profile', resolveStore, requireAdmin, upload.single('logo'), upload.handleUploadError, upload.validateFileSignatures, updateStoreProfile);
app.use('/api/stores/:slug/auth', resolveStore, authRoutes);
app.use('/api/stores/:slug/options', resolveStore, optionRoutes);
app.use('/api/stores/:slug/custom-specifications', resolveStore, customSpecificationRoutes);
app.use('/api/stores/:slug/laptops', resolveStore, laptopRoutes);

app.get('/', (req, res) => res.redirect(302, '/s/liq-technologies'));
app.get('/s/:slug', resolveStorePage, (req, res) => res.sendFile(path.join(__dirname, '../views/index.html')));
app.get('/s/:slug/laptops', resolveStorePage, (req, res) => res.sendFile(path.join(__dirname, '../views/laptops.html')));
app.get('/s/:slug/laptops/:id', resolveStorePage, (req, res) => res.sendFile(path.join(__dirname, '../views/laptop-details.html')));
app.get('/s/:slug/contact', resolveStorePage, (req, res) => res.sendFile(path.join(__dirname, '../views/contact.html')));

app.get('/s/:slug/admin/login', resolveStorePage, redirectAuthenticatedAdmin, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/login.html')));
app.get('/s/:slug/admin/change-password', resolveStorePage, requirePasswordChangePage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/change-password.html')));
app.get('/s/:slug/admin', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/dashboard.html')));
app.get('/s/:slug/admin/settings', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/settings.html')));
app.get('/s/:slug/admin/settings/profile', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/store-profile.html')));
app.get('/s/:slug/admin/settings/product-options', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/options.html')));
app.get('/s/:slug/admin/settings/options', (req, res) => res.redirect(301, `/s/${encodeURIComponent(req.params.slug)}/admin/settings/product-options`));
app.get('/s/:slug/admin/laptops/new', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/add-laptop.html')));
app.get('/s/:slug/admin/laptops/:id/edit', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/edit-laptop.html')));
app.get('/s/:slug/admin/laptops/:id/images', resolveStorePage, requireAdminPage, (req, res) => res.sendFile(path.join(__dirname, '../views/admin/manage-images.html')));

app.get('/platform/login', (req, res) => res.sendFile(path.join(__dirname, '../views/platform-login.html')));
app.get('/platform', (req, res) => res.sendFile(path.join(__dirname, '../views/platform-dashboard.html')));

// Legacy URLs continue to lead to the LIQ TECHNOLOGIES tenant.
app.get(['/laptops.html', '/laptops'], (req, res) => res.redirect(301, '/s/liq-technologies/laptops'));
app.get('/laptop/:id', (req, res) => res.redirect(301, `/s/liq-technologies/laptops/${encodeURIComponent(req.params.id)}`));
app.get('/laptops/:id', (req, res) => res.redirect(301, `/s/liq-technologies/laptops/${encodeURIComponent(req.params.id)}`));
app.get('/admin/login', (req, res) => res.redirect(301, '/s/liq-technologies/admin/login'));
app.get(['/admin/dashboard', '/admin'], (req, res) => res.redirect(301, '/s/liq-technologies/admin'));
app.get('/admin/add-laptop', (req, res) => res.redirect(301, '/s/liq-technologies/admin/laptops/new'));
app.get('/admin/edit-laptop/:id', (req, res) => res.redirect(301, `/s/liq-technologies/admin/laptops/${encodeURIComponent(req.params.id)}/edit`));
app.get('/admin/manage-images/:id', (req, res) => res.redirect(301, `/s/liq-technologies/admin/laptops/${encodeURIComponent(req.params.id)}/images`));
app.get('/admin/settings/options', (req, res) => res.redirect(301, '/s/liq-technologies/admin/settings/product-options'));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/test-db', (req, res) => res.redirect(301, '/health/database'));
app.get('/health/database', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error(error);
        res.status(503).json({ status: 'unavailable', database: 'unavailable' });
    }
});

if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running at http://localhost:${PORT}`));
}

module.exports = app;
