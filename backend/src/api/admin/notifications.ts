import { Router } from 'express';
import { db } from '../../lib/db';
import { enquiry, conversation, message, userPermission } from '../../db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';

export const adminNotificationsRouter = Router();

adminNotificationsRouter.get('/', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 1. Get new enquiries (status is NEW)
    const newEnquiries = await db.select()
      .from(enquiry)
      .where(eq(enquiry.status, 'NEW'))
      .orderBy(desc(enquiry.createdAt));

    // 2. Get active conversations that need human assistance (needsHuman is true)
    const takeoverConversations = await db.select()
      .from(conversation)
      .where(eq(conversation.needsHuman, true))
      .orderBy(desc(conversation.updatedAt));

    // For each takeover conversation, fetch the last message
    const takeoverWithMessages = await Promise.all(
      takeoverConversations.map(async (c: any) => {
        const messages = await db.select()
          .from(message)
          .where(eq(message.conversationId, c.id))
          .orderBy(desc(message.createdAt))
          .limit(1);
        
        return {
          ...c,
          lastMessage: messages.length > 0 ? messages[0].content : "No messages yet"
        };
      })
    );

    // 3. Map to standard notification format
    const notifications = [
      ...newEnquiries.map((e: any) => ({
        id: `enquiry-${e.id}`,
        type: 'ENQUIRY',
        title: 'New Enquiry Received',
        description: `${e.name || 'Anonymous'} (${e.type || 'GENERAL'})`,
        message: e.message || '',
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
        link: `/admin/enquiries?id=${e.id}`,
      })),
      ...takeoverWithMessages.map((c: any) => {
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
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});
