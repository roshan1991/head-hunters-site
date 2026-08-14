"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminNotificationsRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const notifications_1 = require("../../lib/notifications");
exports.adminNotificationsRouter = (0, express_1.Router)();
exports.adminNotificationsRouter.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const notifications = await (0, notifications_1.fetchAdminNotifications)();
        res.json({ notifications });
    }
    catch (error) {
        console.error('Error fetching admin notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
