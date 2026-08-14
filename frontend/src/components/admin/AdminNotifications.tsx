import React, { useState, useEffect, useRef } from "react";
import { Bell, Inbox, MessageSquare, AlertCircle, Clock, Wifi, WifiOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: "ENQUIRY" | "CHAT";
  title: string;
  description: string;
  message: string;
  createdAt: string;
  link: string;
}

function formatRelativeTime(dateString: string) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(dateString).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const retryCountRef = useRef(0);
  const navigate = useNavigate();

  // Establish WebSocket connection with auto-reconnect
  useEffect(() => {
    let isMounted = true;

    function connectWebSocket() {
      if (!isMounted) return;

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/notifications`;

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          retryCountRef.current = 0;
        };

        socket.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "NOTIFICATIONS_SNAPSHOT" || data.type === "NOTIFICATIONS_UPDATE") {
              setNotifications(data.notifications || []);
            }
          } catch (err) {
            console.error("Failed to parse WebSocket notification message:", err);
          }
        };

        socket.onclose = (event) => {
          if (!isMounted) return;
          setIsConnected(false);

          // If unauthorized (401 from server close), don't reconnect
          if (event.code === 4401 || event.reason === "Unauthorized") {
            return;
          }

          // Exponential backoff reconnection (max 15s)
          const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        };

        socket.onerror = () => {
          // Handled in onclose
        };
      } catch (err) {
        setIsConnected(false);
        const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
        retryCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
      }
    }

    // Initial fallback REST fetch in case WebSocket handshake takes a moment
    fetch("/api/admin/notifications", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.notifications) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {});

    connectWebSocket();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (link: string) => {
    setIsOpen(false);
    navigate(link);
  };

  const count = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-white/80 hover:text-white cursor-pointer select-none"
        aria-label="Notifications"
        title={isConnected ? "Realtime Notifications Connected" : "Connecting to Notifications..."}
      >
        <Bell size={18} className={count > 0 ? "animate-pulse text-amber-400" : ""} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-red-500 border-2 border-[#0B0B0C] flex items-center justify-center text-[10px] text-white font-extrabold px-1">
            {count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-3.5 w-[360px] rounded-[16px] border border-white/8 bg-[#0B0B0C]/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-50 flex flex-col max-h-[420px]"
          >
            {/* Header */}
            <div className="px-4.5 py-3.5 border-b border-white/6 bg-white/2 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">System Notifications</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-amber-500 animate-ping"
                  }`}
                  title={isConnected ? "WebSocket Live" : "Connecting..."}
                />
              </div>
              {count > 0 && (
                <span className="text-[10px] bg-[#02695e]/30 text-[#04a891] border border-[#04a891]/20 font-bold px-2 py-0.5 rounded-full">
                  {count} Active
                </span>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/4 max-h-[350px] scrollbar-thin scrollbar-thumb-white/10">
              {count === 0 ? (
                <div className="py-12 px-6 text-center text-white/30 flex flex-col items-center justify-center gap-2">
                  <AlertCircle size={24} className="text-white/10" />
                  <p className="text-xs">All caught up! No new notifications.</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = n.type === "CHAT" ? MessageSquare : Inbox;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n.link)}
                      className="p-4 cursor-pointer hover:bg-white/3 transition-colors flex items-start gap-3.5 group"
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                          n.type === "CHAT"
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20"
                            : "bg-blue-500/10 border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20"
                        }`}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-white group-hover:text-[#04a891] transition-colors truncate">
                            {n.title}
                          </p>
                          <span className="text-[9px] text-white/30 flex items-center gap-0.5 shrink-0">
                            <Clock size={8} /> {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-white/60 truncate mb-1">
                          {n.description}
                        </p>
                        <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
