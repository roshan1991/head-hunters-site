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
// Ensure uploads directory exists
const uploadDir = path_1.default.resolve(process.cwd(), 'uploads/cvs');
const parentUploadDir = path_1.default.resolve(process.cwd(), '../uploads/cvs');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure multer storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path_1.default.extname(file.originalname));
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
// POST /api/candidates/upload
router.post('/upload', upload.single('cv'), async (req, res) => {
    try {
        const { name, email, phone, interestedJobs } = req.body;
        const file = req.file;
        if (!name || !email || !file) {
            return res.status(400).json({ error: 'Name, email, and CV file are required' });
        }
        // Check if candidate already exists by email
        const [existing] = await db_1.db.select().from(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.email, email)).limit(1);
        if (existing) {
            // Remove old file if replaced
            if (existing.cvFileName && existing.cvFileName !== file.filename) {
                const oldPath = path_1.default.join(uploadDir, existing.cvFileName);
                if (fs_1.default.existsSync(oldPath)) {
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
            const [updated] = await db_1.db.select().from(schema_1.candidate).where((0, drizzle_orm_1.eq)(schema_1.candidate.id, existing.id)).limit(1);
            return res.status(200).json({ message: 'CV updated successfully', candidate: updated });
        }
        const candidateId = crypto_1.default.randomUUID();
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
        res.status(201).json({ message: 'CV uploaded successfully', candidate: newCandidate });
    }
    catch (error) {
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
    let filePath = path_1.default.join(uploadDir, filename);
    if (!fs_1.default.existsSync(filePath)) {
        filePath = path_1.default.join(parentUploadDir, filename);
    }
    if (fs_1.default.existsSync(filePath)) {
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
            const filePath = path_1.default.join(uploadDir, existing.cvFileName);
            if (fs_1.default.existsSync(filePath)) {
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
