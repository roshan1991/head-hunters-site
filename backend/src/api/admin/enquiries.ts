import { Router } from 'express';
import { db } from '../../lib/db';
import { enquiry } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '../../middleware/auth';
import { sendEnquiryReply } from '../../lib/email';
import { broadcastNotificationUpdate } from '../../lib/notifications';

export const adminEnquiriesRouter = Router();

adminEnquiriesRouter.use(requireAuth);

// GET /api/admin/enquiries - List all enquiries
adminEnquiriesRouter.get('/', async (req, res) => {
  try {
    const enquiries = await db.select().from(enquiry).orderBy(desc(enquiry.createdAt));
    return res.json(enquiries);
  } catch (error) {
    console.error('Failed to fetch enquiries:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/enquiries/:id/status - Update enquiry status
adminEnquiriesRouter.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    await db.update(enquiry).set({ status }).where(eq(enquiry.id, id));
    broadcastNotificationUpdate().catch(console.error);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to update enquiry status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/enquiries/:id/reply - Send email reply to enquiry submitter
adminEnquiriesRouter.post('/:id/reply', async (req: any, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;
    const adminUser = req.user;

    if (!replyText?.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const enquiries = await db.select().from(enquiry).where(eq(enquiry.id, id)).limit(1);
    if (!enquiries.length) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }

    const enq = enquiries[0];

    const emailResult = await sendEnquiryReply({
      name: enq.name,
      email: enq.email,
      replyText,
      adminName: adminUser?.name || adminUser?.email?.split('@')[0] || 'Admin',
    });

    // Mark as ASSIGNED after reply to indicate follow-up happened
    await db.update(enquiry).set({ status: 'ASSIGNED' }).where(eq(enquiry.id, id));

    return res.json({
      success: emailResult.success,
      emailId: (emailResult as any).id,
      reason: emailResult.success ? undefined : (emailResult as any).reason,
      message: emailResult.success
        ? 'Reply sent successfully'
        : 'Reply not sent — check RESEND_API_KEY and verified sender configuration',
    });
  } catch (error) {
    console.error('Failed to send reply:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/enquiries/:id - Delete an enquiry
adminEnquiriesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(enquiry).where(eq(enquiry.id, id));
    broadcastNotificationUpdate().catch(console.error);
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete enquiry:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
