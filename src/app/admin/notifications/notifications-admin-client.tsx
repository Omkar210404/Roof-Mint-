'use client';

import { useState } from 'react';
import { Send, Bell, Tag, Building2, ShieldCheck, CheckCircle2, Trash2, Users, Loader2, Link as LinkIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { sendNotificationToUser, broadcastNotificationToAll, deleteNotificationLog } from './actions';

export function NotificationsAdminClientWrapper({
  initialLogs,
  users = [],
  properties = []
}: {
  initialLogs: any[];
  users?: any[];
  properties?: any[];
}) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notifType, setNotifType] = useState('system');
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    setSending(true);
    setStatusMsg(null);

    let res;
    if (targetType === 'all') {
      res = await broadcastNotificationToAll(notifType, messageText, selectedPropertyId);
    } else {
      if (!selectedUserId) {
        setStatusMsg({ type: 'error', text: 'Please select a specific user to receive the notification.' });
        setSending(false);
        return;
      }
      res = await sendNotificationToUser(selectedUserId, notifType, messageText, selectedPropertyId);
    }

    if (res?.error) {
      setStatusMsg({ type: 'error', text: res.error });
    } else {
      const countText = targetType === 'all' ? `to all ${(res as any)?.count || users.length} users` : 'to selected user';
      setStatusMsg({ type: 'success', text: `Notification sent successfully ${countText}!` });
      setMessageText('');
      setSelectedPropertyId('');
      setTimeout(() => window.location.reload(), 1500);
    }

    setSending(false);
  };

  const handleDeleteLog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification record?')) return;
    setLogs(prev => prev.filter(l => l.id !== id));
    await deleteNotificationLog(id);
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">Push Notifications Hub</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Broadcast platform updates, price drop alerts, or direct notifications to client-side users.
          </p>
        </div>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-navy-800 px-3 py-1 rounded-full">{logs.length} total logs</span>
      </div>

      {statusMsg && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /> : null}
          {statusMsg.text}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Sent Logs</p>
          <p className="text-2xl font-bold text-navy dark:text-white mt-1">{logs.length}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Unread Client Alerts</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{logs.filter(l => !l.is_read).length}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Client Audience</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{users.length} Users</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-1 h-fit bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Compose Notification
            </h2>
          </div>

          <div className="p-5">
            <form onSubmit={handleSend} className="space-y-4">
              {/* Recipient Target */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Send Audience Target *</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTargetType('all')}
                    className={`h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'all'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" /> All Users ({users.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('specific')}
                    className={`h-9 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'specific'
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-gray-50 dark:bg-navy-800 text-gray-600 dark:text-gray-300 border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-100'
                    }`}
                  >
                    Specific User
                  </button>
                </div>
              </div>

              {/* Specific User Select */}
              {targetType === 'specific' && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Select User *</label>
                  <select
                    value={selectedUserId}
                    onChange={e => setSelectedUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- Choose Client Profile --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || 'Anonymous User'} ({u.phone || 'No phone'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notification Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notification Type</label>
                <select
                  value={notifType}
                  onChange={e => setNotifType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="system">🛡️ System Alert / Platform Update</option>
                  <option value="price_drop">🎉 Price Drop Announcement</option>
                  <option value="new_listing">✨ New Property Match / Project Launch</option>
                  <option value="enquiry_update">📅 Site Visit / Callback Update</option>
                </select>
              </div>

              {/* Property Link (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Link to Property (Optional)</label>
                <select
                  value={selectedPropertyId}
                  onChange={e => setSelectedPropertyId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- None / General Notification --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notification Message */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notification Message *</label>
                <textarea
                  required
                  rows={4}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="e.g. Price drop alert! Sattva Lumina starting price reduced by ₹5 Lakhs."
                  className="w-full p-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full mt-2 bg-primary hover:bg-teal-700 text-white font-bold h-10 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60 text-xs"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? 'Dispatching Alert...' : 'Dispatch Notification'}
              </button>
            </form>
          </div>
        </div>

        {/* Sent Notifications Log */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden h-fit">
          <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">Client Notifications Feed</h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">Synced to Client Profile Notifications</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Time</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Recipient</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Type & Message</TableHead>
                  <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Read Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">No sent notifications found</TableCell>
                  </TableRow>
                ) : logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs font-medium">
                      {timeAgo(log.created_at)}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-navy dark:text-white">
                      {log.user?.full_name || 'All Users / Client'}
                    </TableCell>

                    <TableCell className="max-w-[240px]">
                      <span className="inline-block bg-teal-50 dark:bg-teal-950/40 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded capitalize mb-1">
                        {log.type?.replace('_', ' ') || 'system'}
                      </span>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">{log.message}</p>
                      {log.property?.title && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary mt-1">
                          <LinkIcon className="w-3 h-3" /> {log.property.title}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {log.is_read ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Read
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          Unread
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <button
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
