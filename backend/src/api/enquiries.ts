import { Router } from 'express';
import { db } from '../lib/db';
import { enquiry } from '../db/schema';
import { sendEnquiryNotification, sendEnquiryConfirmation } from '../lib/email';
import { broadcastNotificationUpdate } from '../lib/notifications';
import { eq } from 'drizzle-orm';
import crypto from "crypto";

export const enquiriesRouter = Router();

// Simple in-memory IP rate limiter (10 per hour per IP)
const ipCache = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
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

enquiriesRouter.post('/', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '127.0.0.1';
    
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many enquiries from this IP. Please wait up to 1 hour before trying again.' });
    }

    const { name, email, phone, type, message } = req.body;

    if (!name || !email || !type || !message) {
      return res.status(400).json({ error: 'Missing required fields for enquiry.' });
    }

    // Save to DB first
    const enquiryId = crypto.randomUUID();
    await db.insert(enquiry).values({
      id: enquiryId,
      name,
      email,
      phone: phone || null,
      type,
      message,
      status: 'NEW',
    });

    const [newEnquiry] = await db.select()
      .from(enquiry)
      .where(eq(enquiry.id, enquiryId))
      .limit(1);

    // Broadcast new notification via WebSocket to all connected admins
    broadcastNotificationUpdate().catch((err) => console.error('WS broadcast error:', err));

    // Try sending emails but don't fail the request if it errors
    try {
      await sendEnquiryNotification({ name, email, phone, type, message });
      await sendEnquiryConfirmation({ name, email, type });
    } catch (emailError) {
      console.error('Failed to send enquiry emails:', emailError);
    }

    return res.json(newEnquiry);
  } catch (error) {
    console.error('Failed to create enquiry:', error);
    return res.status(500).json({ error: 'We couldn’t connect to the server. Please try again.' });
  }
});
