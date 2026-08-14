"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enquiriesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../lib/db");
const schema_1 = require("../db/schema");
const email_1 = require("../lib/email");
const notifications_1 = require("../lib/notifications");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = __importDefault(require("crypto"));
exports.enquiriesRouter = (0, express_1.Router)();
// Simple in-memory IP rate limiter (10 per hour per IP)
const ipCache = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const record = ipCache.get(ip);
    if (!record) {
        ipCache.set(ip, { count: 1, resetTime: now + 3600000 }); // 1 hour window
        return true;
    }
    if (now > record.resetTime) {
        ipCache.set(ip, { count: 1, resetTime: now + 3600000 });
        return true;
    }
    if (record.count >= 10) {
        return false;
    }
    record.count += 1;
    return true;
}
exports.enquiriesRouter.post('/', async (req, res) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        if (!checkRateLimit(ip)) {
            return res.status(429).json({ error: 'Too many enquiries from this IP. Please wait up to 1 hour before trying again.' });
        }
        const { name, email, phone, type, message } = req.body;
        if (!name || !email || !type || !message) {
            return res.status(400).json({ error: 'Missing required fields for enquiry.' });
        }
        // Save to DB first
        const enquiryId = crypto_1.default.randomUUID();
        await db_1.db.insert(schema_1.enquiry).values({
            id: enquiryId,
            name,
            email,
            phone: phone || null,
            type,
            message,
            status: 'NEW',
        });
        const [newEnquiry] = await db_1.db.select()
            .from(schema_1.enquiry)
            .where((0, drizzle_orm_1.eq)(schema_1.enquiry.id, enquiryId))
            .limit(1);
        // Broadcast new notification via WebSocket to all connected admins
        (0, notifications_1.broadcastNotificationUpdate)().catch((err) => console.error('WS broadcast error:', err));
        // Try sending emails but don't fail the request if it errors
        try {
            await (0, email_1.sendEnquiryNotification)({ name, email, phone, type, message });
            await (0, email_1.sendEnquiryConfirmation)({ name, email, type });
        }
        catch (emailError) {
            console.error('Failed to send enquiry emails:', emailError);
        }
        return res.json(newEnquiry);
    }
    catch (error) {
        console.error('Failed to create enquiry:', error);
        return res.status(500).json({ error: 'We couldn’t connect to the server. Please try again.' });
    }
});
