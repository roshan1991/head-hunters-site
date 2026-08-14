import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './lib/db';
import { job } from './db/schema';
import { desc, sql } from 'drizzle-orm';

import fs from 'fs';
import path from 'path';

const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}
dotenv.config();

if (process.env.NODE_ENV === 'production') {
  if (!process.env.VISITOR_TOKEN_SECRET || process.env.VISITOR_TOKEN_SECRET.length < 32) {
    console.error("FATAL: VISITOR_TOKEN_SECRET is missing or weak in production. Must be at least 32 characters.");
    process.exit(1);
  }
}

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.NEXT_PUBLIC_SITE_URL ? [process.env.NEXT_PUBLIC_SITE_URL] : ['http://localhost:3000'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

import cookieParser from 'cookie-parser';
import authRouter from './api/auth';
import { settingsRouter } from './api/settings';
import { dashboardRouter } from './api/dashboard';
import adminJobsRouter from './api/admin/jobs';
// adminConversationsRouter is imported dynamically when AI_CHAT_ENABLED=true (avoids conversation DB queries)
import { adminArticlesRouter } from './api/admin/articles';
import { adminEnquiriesRouter } from './api/admin/enquiries';
import { adminUsersRouter } from './api/admin/users';
import { adminNotificationsRouter } from './api/admin/notifications';
// chat, knowledge, and ai-settings routers are imported dynamically below
import { tawkSettingsRouter, publicTawkSettingsRouter } from './api/admin/tawk-settings';
import { enquiriesRouter } from './api/enquiries';
import candidatesRouter from './api/candidates';

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Public routes
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/tawk-settings', publicTawkSettingsRouter);
app.use('/api/enquiries', enquiriesRouter);
app.use('/api/candidates', candidatesRouter);

// AI Chat Feature Flag — strict comparison, never truthy on "false"
const aiChatEnabled = process.env.AI_CHAT_ENABLED?.trim().toLowerCase() === "true";

// Disabled-chat fallback performs ZERO database queries
const chatDisabledFallback = (req: any, res: any) => {
  res.status(503).json({ error: 'AI chat is temporarily disabled' });
};

if (aiChatEnabled) {
  // Dynamically import chat modules — no static import means zero initialisation overhead when disabled
  Promise.all([
    import('./api/chat'),
    import('./api/admin/conversations'),
    import('./api/admin/ai-settings'),
    import('./api/admin/knowledge')
  ]).then(([{ chatRouter }, { adminConversationsRouter }, { aiSettingsRouter }, { knowledgeRouter }]) => {
    app.use('/api/chat', chatRouter);
    app.use('/api/admin/conversations', adminConversationsRouter);
    app.use('/api/admin/ai-settings', aiSettingsRouter);
    app.use('/api/admin/knowledge', knowledgeRouter);
  }).catch(console.error);
} else {
  // All chatbot routes return 503 before any auth, session or DB middleware
  app.use('/api/chat', chatDisabledFallback);
  app.use('/api/conversations', chatDisabledFallback);
  app.use('/api/admin/conversations', chatDisabledFallback);
  app.use('/api/admin/ai-settings', chatDisabledFallback);
  app.use('/api/admin/knowledge', chatDisabledFallback);
}

// Protected Admin Routes (always mounted — no chat dependency)
app.use('/api/admin/dashboard', dashboardRouter);
app.use('/api/admin/jobs', adminJobsRouter);
app.use('/api/admin/articles', adminArticlesRouter);
app.use('/api/admin/enquiries', adminEnquiriesRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/notifications', adminNotificationsRouter);
app.use('/api/admin/tawk-settings', tawkSettingsRouter);

// Endpoint: Get latest 3 active jobs for homepage
app.get('/api/jobs/latest', async (req, res) => {
  try {
    const { eq } = await import('drizzle-orm');
    const jobs = await db.select()
      .from(job)
      .where(eq(job.status, "ACTIVE"))
      .orderBy(desc(job.isHot), desc(job.createdAt))
      .limit(3);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching latest jobs:', error);
    res.status(500).json({ error: 'Failed to fetch latest jobs' });
  }
});

// Example endpoint: Get all Jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const { desc } = await import('drizzle-orm');
    const jobs = await db.select().from(job).orderBy(desc(job.isHot), desc(job.createdAt));
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Endpoint: Get a single job by id
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const { eq } = await import('drizzle-orm');
    const [foundJob] = await db.select().from(job).where(eq(job.id, req.params.id)).limit(1);
    if (!foundJob) return res.status(404).json({ error: 'Job not found' });
    res.json(foundJob);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Endpoint: Get all published articles
app.get('/api/articles', async (req, res) => {
  try {
    const { eq } = await import('drizzle-orm');
    const { article } = await import('./db/schema');
    const articles = await db.select()
      .from(article)
      .where(eq(article.isPublished, true))
      .orderBy(desc(article.createdAt));
    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Endpoint: Get a single article by slug
app.get('/api/articles/:slug', async (req, res) => {
  try {
    const { eq } = await import('drizzle-orm');
    const { article } = await import('./db/schema');
    const [foundArticle] = await db.select()
      .from(article)
      .where(eq(article.slug, req.params.slug))
      .limit(1);
      
    if (!foundArticle) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(foundArticle);
  } catch (error) {
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
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed'); // Do not log raw errors or connection strings
    res.status(503).json({ error: 'Database is temporarily unavailable' });
  }
});

// React SPA fallback: always serve index.html for non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Frontend not built yet. Please use the Vite dev server (usually http://localhost:5173) during development.');
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
