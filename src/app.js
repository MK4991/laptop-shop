
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const session = require('express-session');
const PrismaSessionStore = require('./config/prismaSessionStore');

const prisma = require('./config/database');
const laptopRoutes = require('./routes/laptopRoutes');
const authRoutes = require('./routes/authRoutes');

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set and contain at least 32 characters.');
}

// Create Express application
const app = express();

// Convert BigInt values to strings in all JSON responses
app.set('json replacer', (key, value) => {
    return typeof value === 'bigint' ? value.toString() : value;
});

// Define port
const PORT = process.env.PORT || 5000;

// Middleware
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
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

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/laptops', laptopRoutes);

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/laptops.html', (req, res) => {
    res.redirect(301, '/laptops');
});

app.get('/laptops', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/laptops.html'));
});

app.get('/laptop/:id', (req, res) => {
    res.redirect(301, `/laptops/${encodeURIComponent(req.params.id)}`);
});

app.get('/laptops/:id', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/laptop-details.html'));
});

// Admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/login.html'));
});

// Keep old admin URLs working while the dashboard routes are updated.
app.get('/admin/dashboard', (req, res) => res.redirect(301, '/admin'));
app.get('/admin/add-laptop', (req, res) => res.redirect(301, '/admin/laptops/new'));
app.get('/admin/edit-laptop/:id', (req, res) => {
    res.redirect(301, `/admin/laptops/${encodeURIComponent(req.params.id)}/edit`);
});
app.get('/admin/manage-images/:id', (req, res) => {
    res.redirect(301, `/admin/laptops/${encodeURIComponent(req.params.id)}/images`);
});

// Admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/dashboard.html'));
});

// Add laptop page
app.get('/admin/laptops/new', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/add-laptop.html'));
});

// Edit laptop page
app.get('/admin/laptops/:id/edit', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin/edit-laptop.html'));
});

// Manage laptop images page
app.get('/admin/laptops/:id/images', (req, res) => {
    res.sendFile(
        path.join(__dirname, '../views/admin/manage-images.html')
    );
});

// Liveness and database readiness endpoints
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/test-db', (req, res) => res.redirect(301, '/health/database'));
app.get('/health/database', async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ok', database: 'connected' });
    } catch (error) {
        console.error(error);
        res.status(503).json({
            status: 'unavailable',
            database: 'unavailable'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
