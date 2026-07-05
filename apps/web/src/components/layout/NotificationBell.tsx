'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/api/notifications';
import { getAuthToken } from '@/lib/api/client';
import { cn } from '@/lib/utils';

type NotificationBellProps = {
  variant?: 'dark' | 'light';
  className?: string;
};

function formatNotificationTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();

  if (diffMs < 60_000) {
    return 'Just now';
  }

  if (diffMs < 3_600_000) {
    const minutes = Math.floor(diffMs / 60_000);
    return `${minutes}m ago`;
  }

  if (diffMs < 86_400_000) {
    const hours = Math.floor(diffMs / 3_600_000);
    return `${hours}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function notificationHref(notification: NotificationItem): string | null {
  if (notification.type === 'NEW_SUBSCRIBER') {
    return '/studio/subscribers';
  }

  const courseId = notification.data?.courseId;
  if (typeof courseId === 'string') {
    return `/courses/${courseId}`;
  }

  return null;
}

export function NotificationBell({
  variant = 'light',
  className,
}: NotificationBellProps) {
  const isDark = variant === 'dark';
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!getAuthToken()) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);

    try {
      const result = await listMyNotifications(20);
      setItems(result.items);
      setUnreadCount(result.unreadCount);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
    }
  };

  const handleMarkRead = async (notification: NotificationItem) => {
    if (notification.readAt) {
      return;
    }

    try {
      const updated = await markNotificationRead(notification.id);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // Keep UI responsive even if mark-read fails.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      // Ignore — user can retry from the panel.
    }
  };

  const buttonClass = isDark
    ? 'relative rounded-full p-2 text-white/70 transition-colors hover:text-white'
    : 'relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-border-subtle hover:text-foreground';

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={handleToggle}
        className={buttonClass}
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-background" />
        )}
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border shadow-soft',
            isDark
              ? 'border-white/10 bg-[#141412] text-white'
              : 'border-border-subtle bg-surface text-foreground',
          )}
        >
          <div
            className={cn(
              'flex items-center justify-between border-b px-4 py-3',
              isDark ? 'border-white/10' : 'border-border-subtle',
            )}
          >
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className={cn(
                  'text-xs font-medium transition-colors',
                  isDark
                    ? 'text-white/60 hover:text-white'
                    : 'text-accent hover:opacity-80',
                )}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <p
                className={cn(
                  'px-4 py-6 text-center text-sm',
                  isDark ? 'text-white/50' : 'text-muted-foreground',
                )}
              >
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p
                className={cn(
                  'px-4 py-6 text-center text-sm',
                  isDark ? 'text-white/50' : 'text-muted-foreground',
                )}
              >
                No notifications yet.
              </p>
            ) : (
              <ul>
                {items.map((notification) => {
                  const href = notificationHref(notification);
                  const content = (
                    <>
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p
                        className={cn(
                          'mt-0.5 text-xs leading-relaxed',
                          isDark ? 'text-white/60' : 'text-muted-foreground',
                        )}
                      >
                        {notification.body}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-[11px]',
                          isDark ? 'text-white/40' : 'text-muted-foreground/80',
                        )}
                      >
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </>
                  );

                  const itemClass = cn(
                    'block w-full px-4 py-3 text-left transition-colors',
                    !notification.readAt &&
                      (isDark ? 'bg-white/5' : 'bg-accent-muted/40'),
                    isDark ? 'hover:bg-white/10' : 'hover:bg-border-subtle/60',
                  );

                  return (
                    <li key={notification.id}>
                      {href ? (
                        <Link
                          href={href}
                          className={itemClass}
                          onClick={() => {
                            void handleMarkRead(notification);
                            setOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={itemClass}
                          onClick={() => void handleMarkRead(notification)}
                        >
                          {content}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
