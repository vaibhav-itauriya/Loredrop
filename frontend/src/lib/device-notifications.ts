type DeviceNotificationPayload = {
  id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

const STORAGE_KEY = "loredrop_seen_notification_ids";
let hydrated = false;
let seenIds = new Set<string>();
let baselineEstablished = false;

function canUseNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function canUseServiceWorker() {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function hydrateSeenIds() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      seenIds = new Set(parsed.filter((item) => typeof item === "string"));
    }
  } catch {
    seenIds = new Set<string>();
  }
}

function persistSeenIds() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seenIds).slice(-500)));
  } catch {
    // Ignore storage write issues.
  }
}

export function getNotificationPermission() {
  if (!canUseNotifications()) return "unsupported";
  return Notification.permission;
}

export async function requestDeviceNotificationPermission() {
  if (!canUseNotifications()) return "unsupported";
  return Notification.requestPermission();
}

export async function registerNotificationServiceWorker() {
  if (!canUseServiceWorker()) return null;
  try {
    return await navigator.serviceWorker.register("/notification-sw.js");
  } catch (error) {
    console.error("Failed to register notification service worker:", error);
    return null;
  }
}

async function showWithServiceWorker(payload: DeviceNotificationPayload) {
  if (!canUseServiceWorker()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag || payload.id,
      data: { url: payload.url || "/feed" },
      icon: "/vite.svg",
      badge: "/vite.svg",
    });
    return true;
  } catch (error) {
    console.error("Service worker notification failed:", error);
    return false;
  }
}

async function showForegroundNotification(payload: DeviceNotificationPayload) {
  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag || payload.id,
      icon: "/vite.svg",
      data: { url: payload.url || "/feed" },
    });
    notification.onclick = () => {
      window.focus();
      if (payload.url) {
        window.location.href = payload.url;
      }
      notification.close();
    };
    return true;
  } catch (error) {
    console.error("Foreground notification failed:", error);
    return false;
  }
}

export async function notifyDevice(payload: DeviceNotificationPayload) {
  if (getNotificationPermission() !== "granted") return false;

  if (document.visibilityState === "hidden") {
    return showWithServiceWorker(payload);
  }
  return showForegroundNotification(payload);
}

export async function announceNewNotifications<T extends { _id: string; read: boolean; message: string; type?: string; eventId?: string | { _id: string } }>(
  notifications: T[],
) {
  hydrateSeenIds();

  const unread = notifications.filter((notification) => !notification.read);
  if (!baselineEstablished) {
    unread.forEach((notification) => seenIds.add(notification._id));
    persistSeenIds();
    baselineEstablished = true;
    return;
  }

  const newlyDiscovered = unread.filter((notification) => !seenIds.has(notification._id));
  newlyDiscovered.forEach((notification) => seenIds.add(notification._id));
  persistSeenIds();

  for (const notification of newlyDiscovered) {
    const eventId =
      typeof notification.eventId === "object"
        ? notification.eventId?._id
        : notification.eventId;
    const url = eventId ? `/feed?event=${eventId}` : notification.type === "feedback_request" ? "/profile" : "/feed";
    await notifyDevice({
      id: notification._id,
      title: "Loredrop",
      body: notification.message,
      url,
      tag: notification.type || notification._id,
    });
  }
}
