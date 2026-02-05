import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageCircle,
  Heart,
  Calendar,
  Users,
  Shield,
  CheckCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { interactionsAPI } from "@/lib/api";
import { cn } from "@/lib/utils.ts";

type NotificationType =
  | "event_comment"
  | "event_like"
  | "new_org_event"
  | "event_reminder"
  | "access_request";

interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  eventId?: string | { _id: string; title?: string };
  requestId?: string;
  fromUserId?: { displayName?: string; avatar?: string };
  read: boolean;
  createdAt: string;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case "event_comment":
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case "event_like":
      return <Heart className="w-4 h-4 text-red-500" />;
    case "new_org_event":
      return <Calendar className="w-4 h-4 text-green-500" />;
    case "event_reminder":
      return <Bell className="w-4 h-4 text-amber-500" />;
    case "access_request":
      return <Shield className="w-4 h-4 text-violet-500" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await interactionsAPI.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount for unread badge, and when popover opens
  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  // Poll for new notifications when popover is closed
  useEffect(() => {
    if (!open) {
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const handleMarkAsRead = async (
    notification: Notification
  ) => {
    try {
      await interactionsAPI.markNotificationRead(notification._id);
      setNotifications(
        notifications.map((n) =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
      setOpen(false);
      if (notification.type === "access_request") {
        navigate("/admin");
        return;
      }
      const eventId = notification.eventId;
      const id = typeof eventId === "object" ? eventId?._id : eventId;
      if (id) {
        navigate(`/feed?event=${id}`);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await interactionsAPI.markAllNotificationsRead();
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full animate-in zoom-in-50">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 sm:w-96 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When someone likes or comments on your events, you'll see it here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => handleMarkAsRead(notification)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex gap-3 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm line-clamp-2",
                        !notification.read && "font-medium"
                      )}
                    >
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
