"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminEnquiriesRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../lib/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../../middleware/auth");
const email_1 = require("../../lib/email");
const notifications_1 = require("../../lib/notifications");
exports.adminEnquiriesRouter = (0, express_1.Router)();
exports.adminEnquiriesRouter.use(auth_1.requireAuth);
// GET /api/admin/enquiries - List all enquiries
exports.adminEnquiriesRouter.get('/', async (req, res) => {
    try {
        const enquiries = await db_1.db.select().from(schema_1.enquiry).orderBy((0, drizzle_orm_1.desc)(schema_1.enquiry.createdAt));
        return res.json(enquiries);
    }
    catch (error) {
        console.error('Failed to fetch enquiries:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// PUT /api/admin/enquiries/:id/status - Update enquiry status
exports.adminEnquiriesRouter.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!status)
            return res.status(400).json({ error: 'Status is required' });
        await db_1.db.update(schema_1.enquiry).set({ status }).where((0, drizzle_orm_1.eq)(schema_1.enquiry.id, id));
        (0, notifications_1.broadcastNotificationUpdate)().catch(console.error);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to update enquiry status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /api/admin/enquiries/:id/reply - Send email reply to enquiry submitter
exports.adminEnquiriesRouter.post('/:id/reply', async (req, res) => {
    try {
        const { id } = req.params;
        const { replyText } = req.body;
        const adminUser = req.user;
        if (!replyText?.trim()) {
            return res.status(400).json({ error: 'Reply text is required' });
        }
        const enquiries = await db_1.db.select().from(schema_1.enquiry).where((0, drizzle_orm_1.eq)(schema_1.enquiry.id, id)).limit(1);
        if (!enquiries.length) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }
        const enq = enquiries[0];
        const emailResult = await (0, email_1.sendEnquiryReply)({
            name: enq.name,
            email: enq.email,
            replyText,
            adminName: adminUser?.name || adminUser?.email?.split('@')[0] || 'Admin',
        });
        // Mark as ASSIGNED after reply to indicate follow-up happened
        await db_1.db.update(schema_1.enquiry).set({ status: 'ASSIGNED' }).where((0, drizzle_orm_1.eq)(schema_1.enquiry.id, id));
        return res.json({
            success: emailResult.success,
            emailId: emailResult.id,
            reason: emailResult.success ? undefined : emailResult.reason,
            message: emailResult.success
                ? 'Reply sent successfully'
                : 'Reply not sent — check RESEND_API_KEY and verified sender configuration',
        });
    }
    catch (error) {
        console.error('Failed to send reply:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// DELETE /api/admin/enquiries/:id - Delete an enquiry
exports.adminEnquiriesRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(schema_1.enquiry).where((0, drizzle_orm_1.eq)(schema_1.enquiry.id, id));
        (0, notifications_1.broadcastNotificationUpdate)().catch(console.error);
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to delete enquiry:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
