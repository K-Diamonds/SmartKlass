import { apiFetch } from './client';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListResult = {
  items: NotificationItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
};

export function listMyNotifications(limit = 20): Promise<NotificationsListResult> {
  return apiFetch<NotificationsListResult>(`/notifications/me?limit=${limit}`);
}

export function markNotificationRead(id: string): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return apiFetch<{ updatedCount: number }>('/notifications/read-all', {
    method: 'POST',
  });
}
