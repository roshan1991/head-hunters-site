import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { enquiry, conversation, message } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

interface NotificationItem {
  id: string;
  type: 'ENQUIRY' | 'CHAT';
  title: string;
  description: string;
  message: string;
  createdAt: string;
  link: string;
}

const activeAdminSockets = new Set<WebSocket>();

// Helper to parse cookies from header string
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) {
      list[key] = decodeURIComponent(parts.join('='));
    }
  });

  return list;
}

// Fetch structured notifications from database
export async function fetchAdminNotifications(): Promise<NotificationItem[]> {
  try {
    // 1. Get new enquiries (status is NEW)
    const newEnquiries = await db.select()
      .from(enquiry)
      .where(eq(enquiry.status, 'NEW'))
      .orderBy(desc(enquiry.createdAt));

    // 2. Get active conversations that need human assistance
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
          lastMessage: messages.length > 0 ? messages[0].content : 'No messages yet'
        };
      })
    );

    // 3. Map to standard notification format
    const notifications: NotificationItem[] = [
      ...newEnquiries.map((e: any) => ({
        id: `enquiry-${e.id}`,
        type: 'ENQUIRY' as const,
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
          type: 'CHAT' as const,
          title: 'Takeover Requested',
          description: visitorName,
          message: c.lastMessage || 'No messages yet',
          createdAt: c.updatedAt ? new Date(c.updatedAt).toISOString() : (c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString()),
          link: `/admin/chat?select=${c.id}`,
        };
      }),
    ];

    // Sort descending by date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifications;
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    return [];
  }
}

// Broadcast updated notifications to all active admin sockets
export async function broadcastNotificationUpdate() {
  if (activeAdminSockets.size === 0) return;

  const notifications = await fetchAdminNotifications();
  const payload = JSON.stringify({
    type: 'NOTIFICATIONS_UPDATE',
    notifications,
  });

  for (const socket of activeAdminSockets) {
    if (socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(payload);
      } catch (err) {
        console.error('Failed to send notification to socket:', err);
      }
    }
  }
}

// Set up WebSocket server on the HTTP server instance
export function setupNotificationWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    
    // Only handle /ws/notifications path
    if (url.pathname !== '/ws/notifications') {
      return;
    }

    // Authenticate client
    const cookies = parseCookies(request.headers.cookie);
    const token = cookies.auth_token || url.searchParams.get('token');

    if (!token) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    try {
      jwt.verify(token, process.env.AUTH_SECRET || 'fallback-secret');
    } catch (err) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', async (ws: WebSocket) => {
    activeAdminSockets.add(ws);

    // Send initial notification snapshot immediately
    const initialNotifications = await fetchAdminNotifications();
    ws.send(JSON.stringify({
      type: 'NOTIFICATIONS_SNAPSHOT',
      notifications: initialNotifications,
    }));

    // Heartbeat mechanism to detect disconnected clients
    let isAlive = true;
    ws.on('pong', () => {
      isAlive = true;
    });

    const pingInterval = setInterval(() => {
      if (!isAlive) {
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, 30000);

    ws.on('close', () => {
      clearInterval(pingInterval);
      activeAdminSockets.delete(ws);
    });

    ws.on('error', () => {
      clearInterval(pingInterval);
      activeAdminSockets.delete(ws);
    });
  });

  console.log('📡 WebSocket Notification Server ready on path /ws/notifications');
  return wss;
}
