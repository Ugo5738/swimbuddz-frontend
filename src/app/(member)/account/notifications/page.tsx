"use client";

import { apiGet, apiPost } from "@/lib/api";
import type { Announcement } from "@/lib/communications";
import { formatAnnouncementCategory } from "@/lib/communications";
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  GraduationCap,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────

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

// ── Constants ─────────────────────────────────────────────────────────

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
  rain_update: "bg-amber-100 text-amber-700",
  schedule_change: "bg-amber-100 text-amber-700",
  academy_update: "bg-purple-100 text-purple-700",
  event: "bg-blue-100 text-blue-700",
  competition: "bg-blue-100 text-blue-700",
  general: "bg-slate-100 text-slate-600",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sessions", label: "Sessions" },
  { value: "store", label: "Store" },
  { value: "payments", label: "Payments" },
  { value: "academy", label: "Academy" },
  { value: "announcements", label: "Announcements" },
];

const PAGE_SIZE = 20;

// ── Component ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch member ID
  useEffect(() => {
    (async () => {
      try {
        const me = await apiGet<{ id: string }>("/api/v1/members/me", {
          auth: true,
        });
        setMemberId(me.id);
      } catch {
        // silently fail
      }
    })();
  }, []);

  // Fetch notifications
  const fetchItems = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;

      if (filter === "announcements") {
        // Fetch only announcements
        const announcements = await apiGet<Announcement[]>(
          `/api/v1/communications/announcements/?limit=${PAGE_SIZE}`,
          { auth: true }
        );

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

        setItems(withReadStatus);
        setTotalItems(withReadStatus.length);
      } else {
        // Fetch notifications with optional category filter
        const categoryParam = filter !== "all" ? `&category=${filter}` : "";
        const notifResponse = await apiGet<NotificationListResponse>(
          `/api/v1/communications/notifications/?member_id=${memberId}&limit=${PAGE_SIZE}&offset=${offset}${categoryParam}`,
          { auth: true }
        );

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

        // For "all" filter on page 1, also include recent announcements
        if (filter === "all" && page === 1) {
          try {
            const announcements = await apiGet<Announcement[]>(
              "/api/v1/communications/announcements/?limit=5",
              { auth: true }
            );

            const announcementItems: UnifiedItem[] = await Promise.all(
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

            // Merge and sort
            const merged = [...announcementItems, ...notificationItems].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setItems(merged);
            setTotalItems(notifResponse.total + announcements.length);
          } catch {
            setItems(notificationItems);
            setTotalItems(notifResponse.total);
          }
        } else {
          setItems(notificationItems);
          setTotalItems(notifResponse.total);
        }

        setUnreadCount(notifResponse.unread_count);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [memberId, filter, page]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Mark single as read
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
      setItems((prev) =>
        prev.map((i) => (i.id === item.id && i.source === item.source ? { ...i, isRead: true } : i))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!memberId || markingAll) return;
    setMarkingAll(true);
    try {
      // Mark all notifications as read
      await apiPost(
        `/api/v1/communications/notifications/read-all?member_id=${memberId}`,
        {},
        { auth: true }
      );
      // Also mark visible announcements
      const unreadAnnouncements = items.filter((i) => i.source === "announcement" && !i.isRead);
      await Promise.all(
        unreadAnnouncements.map((i) =>
          apiPost(
            `/api/v1/communications/announcements/${i.id}/read?member_id=${memberId}`,
            {},
            { auth: true }
          )
        )
      );
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently fail
    } finally {
      setMarkingAll(false);
    }
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
    return new Date(dateStr).toLocaleDateString("en-NG", {
      month: "short",
      day: "numeric",
      year: days > 365 ? "numeric" : undefined,
    });
  };

  const getCategoryColor = (category: string) => {
    const c = category?.toLowerCase();
    return CATEGORY_COLORS[c] || "bg-slate-100 text-slate-600";
  };

  const getCategoryLabel = (item: UnifiedItem) => {
    if (item.source === "announcement") {
      return formatAnnouncementCategory(item.category);
    }
    const c = item.category;
    return c.charAt(0).toUpperCase() + c.slice(1);
  };

  const getCategoryIcon = (item: UnifiedItem) => {
    if (item.source === "announcement") return null;
    const IconComponent = CATEGORY_ICONS[item.category];
    return IconComponent ? <IconComponent className="h-3 w-3" /> : null;
  };

  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 transition disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setFilter(opt.value);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
              filter === opt.value
                ? "bg-cyan-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <Bell className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-base font-medium text-slate-500">No notifications</p>
            <p className="text-sm text-slate-400 mt-1">
              {filter !== "all" ? "Try a different filter" : "Check back later for updates"}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={`${item.source}-${item.id}`}>
                <Link
                  href={item.actionUrl}
                  onClick={() => {
                    if (!item.isRead) markAsRead(item);
                  }}
                  className={`flex gap-4 px-4 sm:px-6 py-4 hover:bg-slate-50 transition ${
                    !item.isRead ? "bg-cyan-50/40" : ""
                  }`}
                >
                  {/* Unread indicator */}
                  <div className="flex-shrink-0 pt-1.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        !item.isRead ? "bg-cyan-500" : "bg-transparent"
                      }`}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${getCategoryColor(item.category)}`}
                      >
                        {getCategoryIcon(item)}
                        {getCategoryLabel(item)}
                      </span>
                      {item.source === "announcement" && (
                        <span className="text-[10px] text-slate-400 font-medium">Announcement</span>
                      )}
                      {item.isPinned && (
                        <span className="text-[10px] text-amber-500 font-medium">Pinned</span>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-snug ${
                        !item.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                      }`}
                    >
                      {item.title}
                    </p>
                    {item.summary && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.summary}</p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-1.5">{timeAgo(item.createdAt)}</p>
                  </div>

                  {/* Mark as read button */}
                  {!item.isRead && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markAsRead(item);
                      }}
                      className="flex-shrink-0 self-center p-1.5 rounded-md text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 sm:px-6 py-3">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
