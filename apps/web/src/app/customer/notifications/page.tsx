'use client';

import * as React from 'react';
import { apiFetch } from '@/lib/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, CheckCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { CustomerNotificationDto } from '@pharmacy/shared-types';

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = React.useState<CustomerNotificationDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [marking, setMarking] = React.useState(false);

  const loadNotifications = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<CustomerNotificationDto[]>('/customer/notifications');
      setNotifications(data || []);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      setMarking(true);
      await apiFetch('/customer/notifications/read-all', { method: 'POST' });
      await loadNotifications();
    } catch {
      // Handled
    } finally {
      setMarking(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/customer/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // Handled
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#EAE8F0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#351F65] flex items-center gap-2">
            <Bell className="h-6 w-6 text-[#6240E8]" />
            Your Notifications
          </h1>
          <p className="text-xs text-[#78879A] mt-1">
            Refill reminders, prescription approvals, and order delivery alerts.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={marking}
            className="text-xs border-[#EAE8F0] text-[#351F65] flex items-center gap-1.5"
          >
            <CheckCheck className="h-4 w-4 text-[#6240E8]" />
            <span>Mark All as Read</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-[#78879A]">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-[#6240E8]" />
          Loading your alerts...
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center space-y-3 border-[#EAE8F0]">
          <Bell className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-semibold text-[#351F65]">No Notifications</h3>
          <p className="text-xs text-[#78879A]">You have no recent alerts or refill reminders.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.isRead && handleMarkRead(notif.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                notif.isRead
                  ? 'bg-white border-[#EAE8F0] opacity-80'
                  : 'bg-[#F7F5FD] border-[#6240E8]/30 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${notif.isRead ? 'bg-slate-100 text-slate-500' : 'bg-[#6240E8]/10 text-[#6240E8]'}`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-[#351F65]">{notif.title}</h4>
                      {!notif.isRead && <span className="h-2 w-2 rounded-full bg-[#6240E8]" />}
                    </div>
                    <p className="text-xs text-[#55476D] mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-[10px] text-[#78879A] mt-2 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
