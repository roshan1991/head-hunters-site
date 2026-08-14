import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { fetchAdminNotifications } from '../../lib/notifications';

export const adminNotificationsRouter = Router();

adminNotificationsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await fetchAdminNotifications();
    res.json({ notifications });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
