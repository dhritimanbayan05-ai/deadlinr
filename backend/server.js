require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

const AppData = require('./models/DataModel');

const app = express();
const PORT = process.env.PORT || 3000;
const IS_SERVERLESS = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

// ──────────────────────────────────────────────
// Middleware
// ──────────────────────────────────────────────
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.json({ limit: '5mb' }));

// Trust reverse-proxy headers (Netlify, Render, etc.)
app.set('trust proxy', 1);

// Serve static website (only in traditional server mode)
if (!IS_SERVERLESS) {
    app.use(express.static(path.join(__dirname, '..', 'website')));
}

// ──────────────────────────────────────────────
// MongoDB Connection  (lazy, cached, serverless-safe)
// ──────────────────────────────────────────────
let dbConnection = null;

function ensureDB() {
    if (dbConnection && mongoose.connection.readyState === 1) {
        return dbConnection;
    }
    const uri = process.env.MONGO_URI;
    if (!uri) {
        return Promise.reject(new Error('MONGO_URI environment variable is not set'));
    }
    dbConnection = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
    }).then(() => {
        console.log('✅ MongoDB connected');
    }).catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        dbConnection = null;
        throw err;
    });
    return dbConnection;
}

// ──────────────────────────────────────────────
// Health-check (responds even if DB is down)
// ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        env: process.env.NODE_ENV || 'development'
    });
});

// ──────────────────────────────────────────────
// Ensure DB is connected for all /api/* routes
// ──────────────────────────────────────────────
app.use('/api', async (_req, res, next) => {
    try {
        await ensureDB();
        next();
    } catch (err) {
        res.status(503).json({ error: 'Database not connected. Check MONGO_URI.' });
    }
});

const zlib = require('zlib');

// Helper – always return (or create) the single AppData doc
async function getOrCreateDoc() {
    let raw = await AppData.findOne();
    let data;

    if (!raw) {
        data = { _version: 4, users: [], votes: [], weekStartDate: new Date().toISOString() };
        raw = new AppData({ payload: zlib.deflateSync(JSON.stringify(data)) });
        await raw.save();
        console.log('Created default AppData document');
    } else if (raw.users && !raw.payload) {
        // MIGRATION: Convert uncompressed legacy BSON to compressed Buffer
        data = {
            _version: 4,
            users: raw.users,
            votes: raw.votes || [],
            weekStartDate: raw.weekStartDate || new Date().toISOString()
        };
        raw.payload = zlib.deflateSync(JSON.stringify(data));
        raw.users = undefined;
        raw.votes = undefined;
        raw.weekStartDate = undefined;
        await raw.save();
        console.log('Migrated old AppData to compressed payload');
    } else {
        data = JSON.parse(zlib.inflateSync(raw.payload));
    }
    return { raw, data };
}

// ──────────────────────────────────────────────
// API Routes
// ──────────────────────────────────────────────

// GET /api/data  →  return the full app data object
app.get('/api/data', async (req, res) => {
    try {
        const { raw, data } = await getOrCreateDoc();
        // Keep updatedAt so clients can detect changes
        data.updatedAt = raw.updatedAt;
        res.json(data);
    } catch (err) {
        console.error('GET /api/data error:', err);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// GET /api/data/version  →  lightweight change-check (returns only updatedAt)
app.get('/api/data/version', async (req, res) => {
    try {
        const doc = await AppData.findOne().select('updatedAt').lean();
        res.json({ updatedAt: doc ? doc.updatedAt : null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get version' });
    }
});

// POST /api/data  →  save app data (requires x-user-name for per-user merge)
app.post('/api/data', async (req, res) => {
    try {
        const payload = req.body;
        const authUser = req.headers['x-user-name'];

        if (!payload || !Array.isArray(payload.users)) {
            return res.status(400).json({ error: 'Invalid payload: users array required' });
        }

        let raw = await AppData.findOne();
        if (!raw) {
            // First-time seed: allow the initial data creation without auth
            raw = new AppData({ payload: zlib.deflateSync(JSON.stringify(payload)) });
            await raw.save();
            return res.json({ ok: true });
        }

        const { data } = await getOrCreateDoc();
        data._version = payload._version ?? data._version;

        if (!authUser) {
            return res.status(403).json({ error: 'Forbidden: x-user-name header required' });
        }

        // Only merge the authenticated user's data
        const incomingUserData = payload.users.find(u => u.name === authUser);
        if (incomingUserData) {
            const idx = data.users.findIndex(u => u.name === authUser);
            if (idx !== -1) {
                Object.assign(data.users[idx], incomingUserData);
            } else {
                data.users.push(incomingUserData);
            }
        }

        data.votes = payload.votes ?? data.votes;
        data.weekStartDate = payload.weekStartDate ?? data.weekStartDate;

        raw.payload = zlib.deflateSync(JSON.stringify(data));
        await raw.save();
        res.json({ ok: true });
    } catch (err) {
        console.error('POST /api/data error:', err);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// PATCH /api/data/user/:name  →  update one user's data
app.patch('/api/data/user/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const updates = req.body;
        const authUser = req.headers['x-user-name'];

        if (!authUser || authUser !== name) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own data' });
        }

        const { raw, data } = await getOrCreateDoc();
        const idx = data.users.findIndex(u => u.name === name);
        if (idx === -1) {
            return res.status(404).json({ error: `User "${name}" not found` });
        }

        Object.assign(data.users[idx], updates);
        raw.payload = zlib.deflateSync(JSON.stringify(data));
        await raw.save();

        res.json({ ok: true });
    } catch (err) {
        console.error('PATCH /api/data/user error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// DELETE /api/data  →  reset data to defaults (dev only)
app.delete('/api/data', async (req, res) => {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Forbidden: data reset is disabled in production' });
    }
    try {
        await AppData.deleteMany({});
        res.json({ ok: true, message: 'Data reset' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reset data' });
    }
});

// ──────────────────────────────────────────────
// Export app for serverless usage
// ──────────────────────────────────────────────
module.exports = app;

// ──────────────────────────────────────────────
// Start server only when run directly (local dev)
// ──────────────────────────────────────────────
if (require.main === module) {
    ensureDB();  // fire initial connection

    app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
        console.log(`🌐 Open http://localhost:${PORT}/timetable.html`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
        console.log(`\n${signal} received. Shutting down gracefully…`);
        try { await mongoose.connection.close(); } catch (_) { }
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}
