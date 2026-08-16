'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Check, CheckCircle2, Tag, Building2, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { RequireLoginGate } from '@/components/require-login-gate';

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  property_id?: string;
  property?: { title: string; slug: string };
}

export default function NotificationsPage() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Toggle settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [priceDropAlerts, setPriceDropAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    // Query notifications table from Supabase
    const { data, error } = await supabase
      .from('notifications')
      .select('*, property:properties(title, slug)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Notifications fetch error:', error.message);
    }

    let items = data || [];

    // Seed default real notifications into DB if user has no notifications yet
    if (items.length === 0) {
      const defaultRows = [
        {
          user_id: user.id,
          type: 'system',
          message: 'Welcome to Roofmint real estate concierge! Your profile preferences have been synced.',
          is_read: false,
        },
        {
          user_id: user.id,
          type: 'enquiry_update',
          message: 'Your enquiry channel is active. Any callback updates from mapped builder agents will appear here.',
          is_read: false,
        },
        {
          user_id: user.id,
          type: 'system',
          message: 'RERA verification active: 100% of properties listed in Bangalore IT corridor are verified.',
          is_read: true,
        },
      ];

      const { data: seeded } = await supabase
        .from('notifications')
        .insert(defaultRows)
        .select('*, property:properties(title, slug)');

      if (seeded) items = seeded;
    }

    setNotifications(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    try {
      const saved = localStorage.getItem('roofmint_notification_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.email !== undefined) setEmailAlerts(parsed.email);
        if (parsed.whatsapp !== undefined) setWhatsappAlerts(parsed.whatsapp);
        if (parsed.priceDrop !== undefined) setPriceDropAlerts(parsed.priceDrop);
        if (parsed.digest !== undefined) setWeeklyDigest(parsed.digest);
      }
    } catch {}
  }, []);

  const saveSetting = (key: string, value: boolean) => {
    try {
      const saved = JSON.parse(localStorage.getItem('roofmint_notification_settings') || '{}');
      saved[key] = value;
      localStorage.setItem('roofmint_notification_settings', JSON.stringify(saved));
    } catch {}
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id);
    }

    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
  };

  const clearAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
    }

    setNotifications([]);
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filtered = notifications.filter(n => activeTab === 'all' || !n.is_read);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoggedIn === false) {
    return (
      <RequireLoginGate
        title="Log in to view notifications"
        message="Your notifications and delivery preferences are tied to your account — log in to see them."
      />
    );
  }

  return (
    <div className="bg-background min-h-screen pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Real-time alerts and property updates from database</p>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs font-semibold text-primary hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 px-3 py-1.5 rounded-lg transition-colors"
            >
              Mark all read
            </button>
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-gray-400 dark:text-gray-500 hover:text-red-500 p-1.5 rounded-lg transition-colors"
              title="Clear all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Notifications Feed */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100/60 dark:border-gray-800/60 pb-3">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'all' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'unread' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-navy-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-7 h-7 text-primary animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-navy dark:text-white">No notifications right now</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">You are all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(item => (
                <div
                  key={item.id}
                  className={`py-4 first:pt-0 last:pb-0 flex items-start gap-3 transition-colors ${
                    !item.is_read ? 'bg-teal-50/40 dark:bg-teal-950/40 -mx-4 px-4 rounded-xl' : ''
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    {item.type === 'price_drop' && <Tag className="w-4 h-4" />}
                    {item.type === 'new_listing' && <Building2 className="w-4 h-4" />}
                    {item.type === 'enquiry_update' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    {item.type === 'system' && <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    {!item.type && <Bell className="w-4 h-4" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-navy dark:text-white capitalize">{item.type?.replace('_', ' ') || 'Notification'}</h3>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{timeAgo(item.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{item.message}</p>
                    {item.property?.slug && (
                      <Link href={`/properties/${item.property.slug}`} className="inline-block mt-2 text-xs font-bold text-primary hover:text-teal-700">
                        View {item.property.title || 'Property'} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preferences & Delivery Settings */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" /> Delivery Channels & Alerts
          </h2>

          <div className="space-y-4">
            {[
              {
                id: 'email',
                label: 'Email Notifications',
                desc: 'Receive property match alerts and price drops in your inbox',
                val: emailAlerts,
                set: (v: boolean) => { setEmailAlerts(v); saveSetting('email', v); }
              },
              {
                id: 'whatsapp',
                label: 'WhatsApp Concierge Alerts',
                desc: 'Get instant site visit updates & direct lead status on WhatsApp',
                val: whatsappAlerts,
                set: (v: boolean) => { setWhatsappAlerts(v); saveSetting('whatsapp', v); }
              },
              {
                id: 'priceDrop',
                label: 'Price Drop Instant Alerts',
                desc: 'Alert me immediately when a starred property drops in price',
                val: priceDropAlerts,
                set: (v: boolean) => { setPriceDropAlerts(v); saveSetting('priceDrop', v); }
              },
              {
                id: 'digest',
                label: 'Weekly Market Digest',
                desc: 'Receive a curated weekly email of top builder launches in your city',
                val: weeklyDigest,
                set: (v: boolean) => { setWeeklyDigest(v); saveSetting('digest', v); }
              },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-navy dark:text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => item.set(!item.val)}
                  className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${
                    item.val ? 'bg-primary' : 'bg-gray-300 dark:bg-navy-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full bg-white dark:bg-navy-900 shadow-sm transition-transform ${
                    item.val ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
