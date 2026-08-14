import { Router } from 'express';
import { db } from '../../lib/db';
import { job } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';
import crypto from 'crypto';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const jobs = await db.select().from(job).orderBy(desc(job.createdAt));
    return res.json(jobs);
  } catch (error) {
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

    const jobId = crypto.randomUUID();
    await db.insert(job).values({
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

    const [newJob] = await db.select().from(job).where(eq(job.id, jobId)).limit(1);
    return res.json({ success: true, job: newJob });
  } catch (error: any) {
    console.error('Failed to create job:', error);
    return res.status(500).json({ error: error.message || 'Failed to create job' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    await db.update(job).set({
      title: data.title,
      location: data.location,
      type: data.type,
      description: data.description,
      status: data.status,
      isHot: Boolean(data.isHot),
      updatedAt: new Date(),
    }).where(eq(job.id, id));

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to update job:', error);
    return res.status(500).json({ error: error.message || 'Failed to update job' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(job).where(eq(job.id, id));
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete job:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete job' });
  }
});

export default router;
