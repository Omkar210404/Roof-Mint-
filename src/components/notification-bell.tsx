'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Tag, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from('notifications')
      .select('*, property:properties(title, slug)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(8);
    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        fetchNotifications(data.user.id);
      }
    });
  }, []);

  // Live badge — updates the moment admin sends a notification, no refresh needed.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('header_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        fetchNotifications(userId);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => userId ? setOpen(o => !o) : (window.location.href = '/login')}
        className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-navy-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] max-h-[70vh] overflow-y-auto bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-2xl shadow-xl z-50">
          <div className="flex items-center justify-between px-4 h-12 border-b border-gray-100/60 dark:border-gray-800/60 sticky top-0 bg-white dark:bg-navy-900">
            <span className="text-sm font-bold text-navy dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-primary hover:text-teal-700">Mark all read</button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <Bell className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-400 dark:text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.property?.slug ? `/properties/${n.property.slug}` : '/profile/notifications'}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-2.5 px-4 py-3 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors ${!n.is_read ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    {n.type === 'price_drop' && <Tag className="w-3.5 h-3.5" />}
                    {n.type === 'new_listing' && <Building2 className="w-3.5 h-3.5" />}
                    {n.type === 'enquiry_update' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {(n.type === 'system' || !n.type) && <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{timeAgo(n.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link href="/profile/notifications" onClick={() => setOpen(false)} className="block text-center text-xs font-semibold text-primary hover:text-teal-700 py-2.5 border-t border-gray-100/60 dark:border-gray-800/60 sticky bottom-0 bg-white dark:bg-navy-900">
            View All Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
