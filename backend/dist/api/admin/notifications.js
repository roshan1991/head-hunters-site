"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminNotificationsRouter = void 0;
const express_1 = require("express");
const db_1 = require("../../lib/db");
const schema_1 = require("../../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../../middleware/auth");
exports.adminNotificationsRouter = (0, express_1.Router)();
exports.adminNotificationsRouter.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        // 1. Get new enquiries (status is NEW)
        const newEnquiries = await db_1.db.select()
            .from(schema_1.enquiry)
            .where((0, drizzle_orm_1.eq)(schema_1.enquiry.status, 'NEW'))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.enquiry.createdAt));
        // 2. Get active conversations that need human assistance (needsHuman is true)
        const takeoverConversations = await db_1.db.select()
            .from(schema_1.conversation)
            .where((0, drizzle_orm_1.eq)(schema_1.conversation.needsHuman, true))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.conversation.updatedAt));
        // For each takeover conversation, fetch the last message
        const takeoverWithMessages = await Promise.all(takeoverConversations.map(async (c) => {
            const messages = await db_1.db.select()
                .from(schema_1.message)
                .where((0, drizzle_orm_1.eq)(schema_1.message.conversationId, c.id))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.message.createdAt))
                .limit(1);
            return {
                ...c,
                lastMessage: messages.length > 0 ? messages[0].content : "No messages yet"
            };
        }));
        // 3. Map to standard notification format
        const notifications = [
            ...newEnquiries.map((e) => ({
                id: `enquiry-${e.id}`,
                type: 'ENQUIRY',
                title: 'New Enquiry Received',
                description: `${e.name || 'Anonymous'} (${e.type || 'GENERAL'})`,
                message: e.message || '',
                createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
                link: `/admin/enquiries?id=${e.id}`,
            })),
            ...takeoverWithMessages.map((c) => {
                const userIdStr = String(c.userId || '');
                const visitorName = userIdStr.length > 4 ? `Visitor #${userIdStr.slice(-4)}` : `Visitor #${userIdStr || 'Guest'}`;
                return {
                    id: `chat-${c.id}`,
                    type: 'CHAT',
                    title: 'Takeover Requested',
                    description: visitorName,
                    message: c.lastMessage || 'No messages yet',
                    createdAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
                    link: `/admin/chat?select=${c.id}`,
                };
            }),
        ];
        // Sort notifications by date descending (newest first)
        notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        res.json({ notifications });
    }
    catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
