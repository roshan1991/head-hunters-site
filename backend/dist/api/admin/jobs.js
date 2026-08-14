"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../lib/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../../middleware/auth");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/', async (req, res) => {
    try {
        const jobs = await db_1.db.select().from(schema_1.job).orderBy((0, drizzle_orm_1.desc)(schema_1.job.createdAt));
        return res.json(jobs);
    }
    catch (error) {
        console.error('Failed to fetch jobs:', error);
        return res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        if (!data.title || !data.location || !data.type || !data.description) {
            return res.status(400).json({ error: 'Title, location, type, and description are required.' });
        }
        const jobId = crypto_1.default.randomUUID();
        await db_1.db.insert(schema_1.job).values({
            id: jobId,
            title: data.title,
            location: data.location,
            type: data.type,
            description: data.description,
            status: data.status || 'ACTIVE',
            isHot: Boolean(data.isHot),
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        const [newJob] = await db_1.db.select().from(schema_1.job).where((0, drizzle_orm_1.eq)(schema_1.job.id, jobId)).limit(1);
        return res.json({ success: true, job: newJob });
    }
    catch (error) {
        console.error('Failed to create job:', error);
        return res.status(500).json({ error: error.message || 'Failed to create job' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        await db_1.db.update(schema_1.job).set({
            title: data.title,
            location: data.location,
            type: data.type,
            description: data.description,
            status: data.status,
            isHot: Boolean(data.isHot),
            updatedAt: new Date(),
        }).where((0, drizzle_orm_1.eq)(schema_1.job.id, id));
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to update job:', error);
        return res.status(500).json({ error: error.message || 'Failed to update job' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.job).where((0, drizzle_orm_1.eq)(schema_1.job.id, id));
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to delete job:', error);
        return res.status(500).json({ error: error.message || 'Failed to delete job' });
    }
});
exports.default = router;
