"use client";

import { apiGet, apiPost } from "@/lib/api";
import type { Announcement } from "@/lib/communications";
import { formatAnnouncementCategory } from "@/lib/communications";
import {
  Bell,
  Calendar,
  Check,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificationBellProps = {
  /** Member UUID — required to fetch unread count and mark-as-read */
  memberId?: string;
  /** Accent color class for the badge (default: bg-rose-500) */
  badgeColor?: string;
  /** Icon hover color class (default: hover:text-cyan-700) */
  hoverColor?: string;
  /** Icon size class (default: h-5 w-5) */
  iconSize?: string;
  /** Poll interval in ms (0 = no polling). Default: 60000 */
  pollInterval?: number;
};

/** A personal notification from the system. */
type NotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  body?: string | null;
  icon?: string | null;
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
};

type NotificationListResponse = {
  items: NotificationItem[];
  total: number;
  unread_count: number;
};

/** Unified item shape for both announcements and notifications. */
type UnifiedItem = {
  id: string;
  source: "announcement" | "notification";
  category: string;
  title: string;
  summary?: string | null;
  isRead: boolean;
  actionUrl: string;
  icon?: string | null;
  isPinned?: boolean;
  createdAt: string;
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  store: ShoppingBag,
  payments: CreditCard,
  sessions: Calendar,
  academy: GraduationCap,
  transport: Users,
  events: Users,
  community: Heart,
  admin: ShieldCheck,
};

const CATEGORY_COLORS: Record<string, string> = {
  store: "bg-amber-100 text-amber-700",
  payments: "bg-green-100 text-green-700",
  sessions: "bg-blue-100 text-blue-700",
  academy: "bg-purple-100 text-purple-700",
  coaching: "bg-indigo-100 text-indigo-700",
  transport: "bg-teal-100 text-teal-700",
  events: "bg-pink-100 text-pink-700",
  community: "bg-rose-100 text-rose-700",
  admin: "bg-slate-100 text-slate-700",
  // Announcement categories
  rain_update: "bg-amber-100 text-amber-700",
  schedule_change: "bg-amber-100 text-amber-700",
  academy_update: "bg-purple-100 text-purple-700",
  event: "bg-blue-100 text-blue-700",
  competition: "bg-blue-100 text-blue-700",
  general: "bg-slate-100 text-slate-600",
};

export function NotificationBell({
  memberId,
  badgeColor = "bg-rose-500",
  hoverColor = "hover:text-cyan-700",
  iconSize = "h-5 w-5",
  pollInterval = 60_000,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unified unread count (announcements + notifications)
  const fetchUnreadCount = useCallback(async () => {
    if (!memberId) return;
    try {
      const [annRes, notifRes] = await Promise.all([
        apiGet<{ unread_count: number }>(
          `/api/v1/communications/announcements/unread-count?member_id=${memberId}`,
          { auth: true }
        ),
        apiGet<{ unread_count: number }>(
          `/api/v1/communications/notifications/unread-count?member_id=${memberId}`,
          { auth: true }
        ).catch(() => ({ unread_count: 0 })),
      ]);
      setUnreadCount(annRes.unread_count + notifRes.unread_count);
    } catch {
      // silently fail
    }
  }, [memberId]);

  // Initial fetch + polling
  useEffect(() => {
    fetchUnreadCount();
    if (pollInterval > 0) {
      const interval = setInterval(fetchUnreadCount, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchUnreadCount, pollInterval]);

  // Fetch and merge both sources when dropdown opens
  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const [announcements, notifResponse] = await Promise.all([
        apiGet<Announcement[]>("/api/v1/communications/announcements/?limit=5", { auth: true }),
        apiGet<NotificationListResponse>(
          `/api/v1/communications/notifications/?member_id=${memberId}&limit=5`,
          { auth: true }
        ).catch(() => ({ items: [], total: 0, unread_count: 0 }) as NotificationListResponse),
      ]);

      // Check read status for announcements
      let announcementItems: UnifiedItem[] = [];
      if (memberId && announcements.length > 0) {
        const withReadStatus = await Promise.all(
          announcements.map(async (item) => {
            try {
              const status = await apiGet<{ read: boolean }>(
                `/api/v1/communications/announcements/${item.id}/read-status?member_id=${memberId}`,
                { auth: true }
              );
              return {
                id: item.id,
                source: "announcement" as const,
                category: item.category,
                title: item.title,
                summary: item.summary,
                isRead: status.read,
                actionUrl: `/announcements/${item.id}`,
                isPinned: item.is_pinned,
                createdAt: item.published_at || item.created_at,
              };
            } catch {
              return {
                id: item.id,
                source: "announcement" as const,
                category: item.category,
                title: item.title,
                summary: item.summary,
                isRead: false,
                actionUrl: `/announcements/${item.id}`,
                isPinned: item.is_pinned,
                createdAt: item.published_at || item.created_at,
              };
            }
          })
        );
        announcementItems = withReadStatus;
      } else {
        announcementItems = announcements.map((item) => ({
          id: item.id,
          source: "announcement" as const,
          category: item.category,
          title: item.title,
          summary: item.summary,
          isRead: false,
          actionUrl: `/announcements/${item.id}`,
          isPinned: item.is_pinned,
          createdAt: item.published_at || item.created_at,
        }));
      }

      const notificationItems: UnifiedItem[] = notifResponse.items.map((n) => ({
        id: n.id,
        source: "notification" as const,
        category: n.category,
        title: n.title,
        summary: n.body,
        isRead: !!n.read_at,
        actionUrl: n.action_url || "#",
        icon: n.icon,
        createdAt: n.created_at,
      }));

      // Merge and sort by date, take latest 8
      const merged = [...announcementItems, ...notificationItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);

      setItems(merged);
    } catch {
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, [memberId]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  const toggleDropdown = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen) {
      fetchItems();
    }
  };

  const markAsRead = async (item: UnifiedItem) => {
    if (!memberId || item.isRead) return;
    try {
      if (item.source === "announcement") {
        await apiPost(
          `/api/v1/communications/announcements/${item.id}/read?member_id=${memberId}`,
          {},
          { auth: true }
        );
      } else {
        await apiPost(
          `/api/v1/communications/notifications/${item.id}/read?member_id=${memberId}`,
          {},
          { auth: true }
        );
      }
      // Update local state
      setItems((prev) =>
        prev.map((i) => (i.id === item.id && i.source === item.source ? { ...i, isRead: true } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    if (!memberId) return;
    const unreadItems = items.filter((i) => !i.isRead);
    await Promise.all(unreadItems.map((i) => markAsRead(i)));
  };

  const timeAgo = (dateStr: string) => {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-NG", { month: "short", day: "numeric" });
  };

  const getCategoryColor = (category: string) => {
    const c = category?.toLowerCase();
    return CATEGORY_COLORS[c] || "bg-slate-100 text-slate-600";
  };

  const getCategoryLabel = (item: UnifiedItem) => {
    if (item.source === "announcement") {
      return formatAnnouncementCategory(item.category);
    }
    // Capitalize notification category
    const c = item.category;
    return c.charAt(0).toUpperCase() + c.slice(1);
  };

  const getCategoryIcon = (item: UnifiedItem) => {
    if (item.source === "announcement") return null;
    const IconComponent = CATEGORY_ICONS[item.category];
    return IconComponent ? <IconComponent className="h-3 w-3" /> : null;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        className={`relative p-2 rounded-full text-slate-500 ${hoverColor} hover:bg-slate-100 transition`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
      >
        <Bell className={iconSize} />
        {unreadCount > 0 && (
          <span
            className={`absolute top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full ${badgeColor} px-1 text-[10px] font-bold text-white`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="max-h-[400px] overflow-y-auto">
            {loadingItems ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">Check back later for updates</p>
              </div>
            ) : (
              <ul>
                {items.map((item) => (
                  <li key={`${item.source}-${item.id}`}>
                    <Link
                      href={item.actionUrl}
                      onClick={() => {
                        if (!item.isRead) markAsRead(item);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 ${
                        !item.isRead ? "bg-cyan-50/50" : ""
                      }`}
                    >
                      {/* Unread dot */}
                      <div className="flex-shrink-0 pt-1.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            !item.isRead ? "bg-cyan-500" : "bg-transparent"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(item.category)}`}
                          >
                            {getCategoryIcon(item)}
                            {getCategoryLabel(item)}
                          </span>
                          {item.isPinned && (
                            <span className="text-[10px] text-amber-500 font-medium">Pinned</span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-tight ${
                            !item.isRead
                              ? "font-semibold text-slate-900"
                              : "font-medium text-slate-700"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.summary && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                            {item.summary}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">{timeAgo(item.createdAt)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition py-1"
            >
              View all notifications
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
