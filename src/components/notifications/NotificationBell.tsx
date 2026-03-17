"use client";

import { apiGet, apiPost } from "@/lib/api";
import type { Announcement } from "@/lib/communications";
import { formatAnnouncementCategory } from "@/lib/communications";
import { Bell, Check, ExternalLink, X } from "lucide-react";
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

type AnnouncementItem = Announcement & {
  _isRead?: boolean;
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
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!memberId) return;
    try {
      const res = await apiGet<{ unread_count: number }>(
        `/api/v1/communications/announcements/unread-count?member_id=${memberId}`,
        { auth: true },
      );
      setUnreadCount(res.unread_count);
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

  // Fetch recent announcements when dropdown opens
  const fetchAnnouncements = useCallback(async () => {
    setLoadingItems(true);
    try {
      const items = await apiGet<Announcement[]>(
        "/api/v1/communications/announcements/",
        { auth: true },
      );
      // Take only the latest 8
      const recent = items.slice(0, 8);

      // Check read status for each if we have memberId
      if (memberId) {
        const withReadStatus = await Promise.all(
          recent.map(async (item) => {
            try {
              const status = await apiGet<{ read: boolean }>(
                `/api/v1/communications/announcements/${item.id}/read-status?member_id=${memberId}`,
                { auth: true },
              );
              return { ...item, _isRead: status.read };
            } catch {
              return { ...item, _isRead: false };
            }
          }),
        );
        setAnnouncements(withReadStatus);
      } else {
        setAnnouncements(recent.map((item) => ({ ...item, _isRead: false })));
      }
    } catch {
      setAnnouncements([]);
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
      fetchAnnouncements();
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!memberId) return;
    try {
      await apiPost(
        `/api/v1/communications/announcements/${announcementId}/read?member_id=${memberId}`,
        {},
        { auth: true },
      );
      // Update local state
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === announcementId ? { ...a, _isRead: true } : a)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    if (!memberId) return;
    const unreadItems = announcements.filter((a) => !a._isRead);
    await Promise.all(unreadItems.map((a) => markAsRead(a.id)));
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

  const categoryColor = (category: string) => {
    const c = category?.toLowerCase();
    if (c === "rain_update" || c === "schedule_change") return "bg-amber-100 text-amber-700";
    if (c === "academy_update") return "bg-purple-100 text-purple-700";
    if (c === "event" || c === "competition") return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
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
            ) : announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Bell className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No announcements yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Check back later for updates
                </p>
              </div>
            ) : (
              <ul>
                {announcements.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/announcements/${item.id}`}
                      onClick={() => {
                        if (!item._isRead) markAsRead(item.id);
                        setOpen(false);
                      }}
                      className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0 ${
                        !item._isRead ? "bg-cyan-50/50" : ""
                      }`}
                    >
                      {/* Unread dot */}
                      <div className="flex-shrink-0 pt-1.5">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            !item._isRead ? "bg-cyan-500" : "bg-transparent"
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryColor(item.category)}`}
                          >
                            {formatAnnouncementCategory(item.category)}
                          </span>
                          {item.is_pinned && (
                            <span className="text-[10px] text-amber-500 font-medium">Pinned</span>
                          )}
                        </div>
                        <p
                          className={`text-sm leading-tight ${
                            !item._isRead
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
                        <p className="text-[11px] text-slate-400 mt-1">
                          {timeAgo(item.published_at || item.created_at)}
                        </p>
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
              href="/announcements"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition py-1"
            >
              View all announcements
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
