import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../lib/db';
import { candidate } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const router = Router();

// Ensure uploads directory exists
const uploadDir = path.resolve(process.cwd(), 'uploads/cvs');
const parentUploadDir = path.resolve(process.cwd(), '../uploads/cvs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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

// POST /api/candidates/upload
router.post('/upload', upload.single('cv'), async (req, res) => {
  try {
    const { name, email, phone, interestedJobs } = req.body;
    const file = req.file;

    if (!name || !email || !file) {
      return res.status(400).json({ error: 'Name, email, and CV file are required' });
    }

    // Check if candidate already exists by email
    const [existing] = await db.select().from(candidate).where(eq(candidate.email, email)).limit(1);

    if (existing) {
      // Remove old file if replaced
      if (existing.cvFileName && existing.cvFileName !== file.filename) {
        const oldPath = path.join(uploadDir, existing.cvFileName);
        if (fs.existsSync(oldPath)) {
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

      const [updated] = await db.select().from(candidate).where(eq(candidate.id, existing.id)).limit(1);
      return res.status(200).json({ message: 'CV updated successfully', candidate: updated });
    }

    const candidateId = crypto.randomUUID();
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

    res.status(201).json({ message: 'CV uploaded successfully', candidate: newCandidate });
  } catch (error: any) {
    console.error('Error uploading CV:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'A candidate with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
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
  let filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    filePath = path.join(parentUploadDir, filename);
  }

  if (fs.existsSync(filePath)) {
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
      const filePath = path.join(uploadDir, existing.cvFileName);
      if (fs.existsSync(filePath)) {
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
