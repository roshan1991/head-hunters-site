"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./lib/db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const candidateEnvPaths = [
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(__dirname, '.env'),
    path_1.default.resolve(__dirname, '../.env'),
    path_1.default.resolve(__dirname, '../../.env'),
    path_1.default.resolve(__dirname, '../../../.env'),
];
for (const envPath of candidateEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        break;
    }
}
dotenv_1.default.config();
if (process.env.NODE_ENV === 'production') {
    if (!process.env.VISITOR_TOKEN_SECRET || process.env.VISITOR_TOKEN_SECRET.length < 32) {
        console.error("FATAL: VISITOR_TOKEN_SECRET is missing or weak in production. Must be at least 32 characters.");
        process.exit(1);
    }
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
const allowedOrigins = process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : ['http://localhost:3000'];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express_1.default.json());
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./api/auth"));
const settings_1 = require("./api/settings");
const dashboard_1 = require("./api/dashboard");
const jobs_1 = __importDefault(require("./api/admin/jobs"));
// adminConversationsRouter is imported dynamically when AI_CHAT_ENABLED=true (avoids conversation DB queries)
const articles_1 = require("./api/admin/articles");
const enquiries_1 = require("./api/admin/enquiries");
const users_1 = require("./api/admin/users");
const notifications_1 = require("./api/admin/notifications");
// chat, knowledge, and ai-settings routers are imported dynamically below
const tawk_settings_1 = require("./api/admin/tawk-settings");
const enquiries_2 = require("./api/enquiries");
const candidates_1 = __importDefault(require("./api/candidates"));
// Serve static frontend files
app.use(express_1.default.static(path_1.default.join(__dirname, 'public')));
app.use((0, cookie_parser_1.default)());
// Public routes
app.use('/api/auth', auth_1.default);
app.use('/api/settings', settings_1.settingsRouter);
app.use('/api/tawk-settings', tawk_settings_1.publicTawkSettingsRouter);
app.use('/api/enquiries', enquiries_2.enquiriesRouter);
app.use('/api/candidates', candidates_1.default);
// AI Chat Feature Flag — strict comparison, never truthy on "false"
const aiChatEnabled = process.env.AI_CHAT_ENABLED?.trim().toLowerCase() === "true";
// Disabled-chat fallback performs ZERO database queries
const chatDisabledFallback = (req, res) => {
    res.status(503).json({ error: 'AI chat is temporarily disabled' });
};
if (aiChatEnabled) {
    // Dynamically import chat modules — no static import means zero initialisation overhead when disabled
    Promise.all([
        Promise.resolve().then(() => __importStar(require('./api/chat'))),
        Promise.resolve().then(() => __importStar(require('./api/admin/conversations'))),
        Promise.resolve().then(() => __importStar(require('./api/admin/ai-settings'))),
        Promise.resolve().then(() => __importStar(require('./api/admin/knowledge')))
    ]).then(([{ chatRouter }, { adminConversationsRouter }, { aiSettingsRouter }, { knowledgeRouter }]) => {
        app.use('/api/chat', chatRouter);
        app.use('/api/admin/conversations', adminConversationsRouter);
        app.use('/api/admin/ai-settings', aiSettingsRouter);
        app.use('/api/admin/knowledge', knowledgeRouter);
    }).catch(console.error);
}
else {
    // All chatbot routes return 503 before any auth, session or DB middleware
    app.use('/api/chat', chatDisabledFallback);
    app.use('/api/conversations', chatDisabledFallback);
    app.use('/api/admin/conversations', chatDisabledFallback);
    app.use('/api/admin/ai-settings', chatDisabledFallback);
    app.use('/api/admin/knowledge', chatDisabledFallback);
}
// Protected Admin Routes (always mounted — no chat dependency)
app.use('/api/admin/dashboard', dashboard_1.dashboardRouter);
app.use('/api/admin/jobs', jobs_1.default);
app.use('/api/admin/articles', articles_1.adminArticlesRouter);
app.use('/api/admin/enquiries', enquiries_1.adminEnquiriesRouter);
app.use('/api/admin/users', users_1.adminUsersRouter);
app.use('/api/admin/notifications', notifications_1.adminNotificationsRouter);
app.use('/api/admin/tawk-settings', tawk_settings_1.tawkSettingsRouter);
// Endpoint: Get latest 3 active jobs for homepage
app.get('/api/jobs/latest', async (req, res) => {
    try {
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const jobs = await db_1.db.select()
            .from(schema_1.job)
            .where(eq(schema_1.job.status, "ACTIVE"))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.job.isHot), (0, drizzle_orm_1.desc)(schema_1.job.createdAt))
            .limit(3);
        res.json(jobs);
    }
    catch (error) {
        console.error('Error fetching latest jobs:', error);
        res.status(500).json({ error: 'Failed to fetch latest jobs' });
    }
});
// Example endpoint: Get all Jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const { desc } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const jobs = await db_1.db.select().from(schema_1.job).orderBy(desc(schema_1.job.isHot), desc(schema_1.job.createdAt));
        res.json(jobs);
    }
    catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});
// Endpoint: Get a single job by id
app.get('/api/jobs/:id', async (req, res) => {
    try {
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const [foundJob] = await db_1.db.select().from(schema_1.job).where(eq(schema_1.job.id, req.params.id)).limit(1);
        if (!foundJob)
            return res.status(404).json({ error: 'Job not found' });
        res.json(foundJob);
    }
    catch (error) {
        console.error('Error fetching job:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});
// Endpoint: Get all published articles
app.get('/api/articles', async (req, res) => {
    try {
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const { article } = await Promise.resolve().then(() => __importStar(require('./db/schema')));
        const articles = await db_1.db.select()
            .from(article)
            .where(eq(article.isPublished, true))
            .orderBy((0, drizzle_orm_1.desc)(article.createdAt));
        res.json(articles);
    }
    catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});
// Endpoint: Get a single article by slug
app.get('/api/articles/:slug', async (req, res) => {
    try {
        const { eq } = await Promise.resolve().then(() => __importStar(require('drizzle-orm')));
        const { article } = await Promise.resolve().then(() => __importStar(require('./db/schema')));
        const [foundArticle] = await db_1.db.select()
            .from(article)
            .where(eq(article.slug, req.params.slug))
            .limit(1);
        if (!foundArticle) {
            return res.status(404).json({ error: 'Article not found' });
        }
        res.json(foundArticle);
    }
    catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});
// Health check endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'running' });
});
app.get('/api/health/database', async (req, res) => {
    try {
        await db_1.db.execute((0, drizzle_orm_1.sql) `SELECT 1`);
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        console.error('Database connection failed'); // Do not log raw errors or connection strings
        res.status(503).json({ error: 'Database is temporarily unavailable' });
    }
});
// React SPA fallback: always serve index.html for non-API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return next();
    }
    res.sendFile(path_1.default.join(__dirname, 'public', 'index.html'), (err) => {
        if (err) {
            res.status(404).send('Frontend not built yet. Please use the Vite dev server (usually http://localhost:5173) during development.');
        }
    });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
