"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../lib/db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Ensure upload directories exist
const jobsUploadDir = path_1.default.resolve(process.cwd(), 'uploads/jobs');
const cvsUploadDir = path_1.default.resolve(process.cwd(), 'uploads/cvs');
const parentJobsUploadDir = path_1.default.resolve(process.cwd(), '../uploads/jobs');
const parentCvsUploadDir = path_1.default.resolve(process.cwd(), '../uploads/cvs');
[jobsUploadDir, cvsUploadDir].forEach((dir) => {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
});
// Configure multer storage for jobs folder and renaming with jobId
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, jobsUploadDir);
    },
    filename: (req, file, cb) => {
        const rawJobId = (req.body?.jobId || '').toString().trim();
        // Sanitize jobId for filename safety
        const safeJobId = rawJobId ? rawJobId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'general';
        const timestamp = Date.now();
        const randomSuffix = Math.round(Math.random() * 1e6);
        const ext = path_1.default.extname(file.originalname);
        // Rename as <jobId>-<timestamp>-<suffix>.<ext>
        const generatedName = `${safeJobId}-${timestamp}-${randomSuffix}${ext}`;
        cb(null, generatedName);
    }
});
const upload = (0, multer_1.default)({
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
        }
        else {
            cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
        }
    }
});
// Helper to find file in candidate directories
function findFilePath(filename) {
    const candidatePaths = [
        path_1.default.join(jobsUploadDir, filename),
        path_1.default.join(parentJobsUploadDir, filename),
        path_1.default.join(cvsUploadDir, filename),
        path_1.default.join(parentCvsUploadDir, filename),
    ];
    for (const p of candidatePaths) {
        if (fs_1.default.existsSync(p))
            return p;
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
        const [existing] = await db_1.db.select().from(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.email, email)).limit(1);
        let candidateId = existing?.id;
        if (existing) {
            // Remove old file if replaced
            if (existing.cvFileName && existing.cvFileName !== file.filename) {
                const oldPath = findFilePath(existing.cvFileName);
                if (oldPath) {
                    try {
                        fs_1.default.unlinkSync(oldPath);
                    }
                    catch (e) { }
                }
            }
            await db_1.db.update(schema_1.candidate).set({
                name,
                phone: phone || existing.phone,
                interestedJobs: interestedJobs || existing.interestedJobs,
                cvFileName: file.filename,
                originalCvFileName: file.originalname,
                status: 'ACTIVE',
                updatedAt: new Date(),
            }).where((0, drizzle_orm_1.eq)(schema_1.candidate.id, existing.id));
            candidateId = existing.id;
        }
        else {
            candidateId = crypto_1.default.randomUUID();
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
            await db_1.db.insert(schema_1.candidate).values(newCandidate);
        }
        // If a specific jobId was provided, record the job application
        if (jobId && candidateId) {
            try {
                const existingApp = await db_1.db.select()
                    .from(schema_1.jobApplication)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.jobApplication.jobId, jobId), (0, drizzle_orm_1.eq)(schema_1.jobApplication.candidateId, candidateId)))
                    .limit(1);
                if (existingApp.length === 0) {
                    await db_1.db.insert(schema_1.jobApplication).values({
                        id: crypto_1.default.randomUUID(),
                        jobId,
                        candidateId,
                        applicationStatus: 'SUBMITTED',
                        source: 'WEBSITE',
                        appliedAt: new Date(),
                    });
                }
            }
            catch (appErr) {
                console.warn('Notice on jobApplication creation:', appErr);
            }
        }
        const [savedCandidate] = await db_1.db.select().from(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.id, candidateId)).limit(1);
        return res.status(201).json({
            message: 'CV uploaded successfully',
            candidate: savedCandidate,
            jobId: jobId || null,
            folder: 'jobs'
        });
    }
    catch (error) {
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
        const candidates = await db_1.db.select().from(schema_1.candidate).orderBy(schema_1.candidate.createdAt);
        res.json(candidates);
    }
    catch (error) {
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
    }
    else {
        res.status(404).json({ error: 'File not found' });
    }
});
// DELETE /api/candidates/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [existing] = await db_1.db.select().from(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.id, id)).limit(1);
        if (!existing) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        if (existing.cvFileName) {
            const filePath = findFilePath(existing.cvFileName);
            if (filePath) {
                try {
                    fs_1.default.unlinkSync(filePath);
                }
                catch (e) { }
            }
        }
        await db_1.db.delete(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.id, id));
        res.json({ success: true, message: 'Candidate deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ error: 'Failed to delete candidate' });
    }
});
exports.default = router;
