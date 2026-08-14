import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../lib/db';
import { candidate, jobApplication } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Ensure upload directories exist
const jobsUploadDir = path.resolve(process.cwd(), 'uploads/jobs');
const cvsUploadDir = path.resolve(process.cwd(), 'uploads/cvs');
const parentJobsUploadDir = path.resolve(process.cwd(), '../uploads/jobs');
const parentCvsUploadDir = path.resolve(process.cwd(), '../uploads/cvs');

[jobsUploadDir, cvsUploadDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage for jobs folder and renaming with jobId
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, jobsUploadDir);
  },
  filename: (req, file, cb) => {
    const rawJobId = (req.body?.jobId || '').toString().trim();
    // Sanitize jobId for filename safety
    const safeJobId = rawJobId ? rawJobId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    
    // Rename as <jobId>-<timestamp>-<suffix>.<ext>
    const generatedName = `${safeJobId}-${timestamp}-${randomSuffix}${ext}`;
    cb(null, generatedName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

// Helper to find file in candidate directories
function findFilePath(filename: string): string | null {
  const candidatePaths = [
    path.join(jobsUploadDir, filename),
    path.join(parentJobsUploadDir, filename),
    path.join(cvsUploadDir, filename),
    path.join(parentCvsUploadDir, filename),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// POST /api/candidates/upload
router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    const { name, email, phone, interestedJobs, jobId } = req.body;
    const file = req.file;

    if (!name || !email || !file) {
      return res.status(400).json({ error: 'Name, email, and CV file are required' });
    }

    // Check if candidate already exists by email
    const [existing] = await db.select().from(candidate).where(eq(candidate.email, email)).limit(1);
    let candidateId = existing?.id;

    if (existing) {
      // Remove old file if replaced
      if (existing.cvFileName && existing.cvFileName !== file.filename) {
        const oldPath = findFilePath(existing.cvFileName);
        if (oldPath) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }

      await db.update(candidate).set({
        name,
        phone: phone || existing.phone,
        interestedJobs: interestedJobs || existing.interestedJobs,
        cvFileName: file.filename,
        originalCvFileName: file.originalname,
        status: 'ACTIVE',
        updatedAt: new Date(),
      }).where(eq(candidate.id, existing.id));

      candidateId = existing.id;
    } else {
      candidateId = crypto.randomUUID();
      const newCandidate = {
        id: candidateId,
        name,
        email,
        phone: phone || null,
        interestedJobs: interestedJobs || null,
        cvFileName: file.filename,
        originalCvFileName: file.originalname,
        status: 'ACTIVE',
        source: 'DIRECT_UPLOAD',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.insert(candidate).values(newCandidate);
    }

    // If a specific jobId was provided, record the job application
    if (jobId && candidateId) {
      try {
        const existingApp = await db.select()
          .from(jobApplication)
          .where(and(eq(jobApplication.jobId, jobId), eq(jobApplication.candidateId, candidateId)))
          .limit(1);

        if (existingApp.length === 0) {
          await db.insert(jobApplication).values({
            id: crypto.randomUUID(),
            jobId,
            candidateId,
            applicationStatus: 'SUBMITTED',
            source: 'WEBSITE',
            appliedAt: new Date(),
          });
        }
      } catch (appErr) {
        console.warn('Notice on jobApplication creation:', appErr);
      }
    }

    const [savedCandidate] = await db.select().from(candidate).where(eq(candidate.id, candidateId)).limit(1);
    return res.status(201).json({
      message: 'CV uploaded successfully',
      candidate: savedCandidate,
      jobId: jobId || null,
      folder: 'jobs'
    });
  } catch (error: any) {
    console.error('Error uploading CV:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A candidate with this email already exists' });
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/candidates
router.get('/', async (req, res) => {
  try {
    const candidates = await db.select().from(candidate).orderBy(candidate.createdAt);
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/candidates/download/:filename
router.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = findFilePath(filename);

  if (filePath) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

// DELETE /api/candidates/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.select().from(candidate).where(eq(candidate.id, id)).limit(1);
    if (!existing) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (existing.cvFileName) {
      const filePath = findFilePath(existing.cvFileName);
      if (filePath) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await db.delete(candidate).where(eq(candidate.id, id));
    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

export default router;
