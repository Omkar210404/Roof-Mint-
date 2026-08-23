'use client';

import { useMemo, useState } from 'react';
import { Send, Bell, Tag, Building2, ShieldCheck, CheckCircle2, Trash2, Users, Loader2, Link as LinkIcon, Search, X, ClipboardPaste } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { sendNotificationToUser, broadcastNotificationToAll, deleteNotificationLog } from './actions';
import { AiEnhanceButton } from '@/components/ai-enhance-button';

const MAX_LIST_ROWS = 100;
const CUSTOM_TYPE_VALUE = '__custom__';

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

  // Specific-user targeting: search + checkbox multi-select + bulk paste
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [bulkUserInput, setBulkUserInput] = useState('');
  const [showBulkUserInput, setShowBulkUserInput] = useState(false);
  const [bulkMatchResult, setBulkMatchResult] = useState<{ matched: number; unmatched: string[] } | null>(null);

  const [notifType, setNotifType] = useState('system');
  const [customType, setCustomType] = useState('');

  // Property link: search combobox
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredUsers = useMemo(() => {
    const q = userSearchQuery.trim().toLowerCase();
    const base = q
      ? users.filter(u =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.phone || '').toLowerCase().includes(q) ||
          u.id.toLowerCase().includes(q)
        )
      : users;
    return base.slice(0, MAX_LIST_ROWS);
  }, [users, userSearchQuery]);

  const selectedProperty = properties.find(p => p.id === selectedPropertyId);
  const filteredProperties = useMemo(() => {
    const q = propertySearchQuery.trim().toLowerCase();
    if (!q) return properties.slice(0, MAX_LIST_ROWS);
    return properties.filter(p => (p.title || '').toLowerCase().includes(q)).slice(0, MAX_LIST_ROWS);
  }, [properties, propertySearchQuery]);

  const toggleUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Resolves comma-separated tokens against id, phone, or name (this app has
  // no human-readable "USER001"-style codes, so phone/name doubles as one).
  const resolveBulkPaste = () => {
    const tokens = bulkUserInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) return;

    const unmatched: string[] = [];
    const newIds = new Set(selectedUserIds);

    tokens.forEach(token => {
      const lower = token.toLowerCase();
      const match = users.find(u =>
        u.id.toLowerCase() === lower ||
        (u.phone || '').toLowerCase() === lower ||
        (u.phone || '').replace(/\D/g, '') === token.replace(/\D/g, '') && token.replace(/\D/g, '').length >= 7 ||
        (u.full_name || '').toLowerCase() === lower
      );
      if (match) newIds.add(match.id);
      else unmatched.push(token);
    });

    setSelectedUserIds(newIds);
    setBulkMatchResult({ matched: tokens.length - unmatched.length, unmatched });
    setBulkUserInput('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const effectiveType = notifType === CUSTOM_TYPE_VALUE ? customType.trim() : notifType;
    if (notifType === CUSTOM_TYPE_VALUE && !effectiveType) {
      setStatusMsg({ type: 'error', text: 'Enter a custom notification type.' });
      return;
    }

    setSending(true);
    setStatusMsg(null);

    let res: any;
    if (targetType === 'all') {
      res = await broadcastNotificationToAll(effectiveType, messageText, selectedPropertyId);
    } else {
      const ids = Array.from(selectedUserIds);
      if (ids.length === 0) {
        setStatusMsg({ type: 'error', text: 'Select at least one user to receive the notification.' });
        setSending(false);
        return;
      }
      const results = await Promise.all(ids.map(id => sendNotificationToUser(id, effectiveType, messageText, selectedPropertyId)));
      const failed = results.filter(r => r?.error);
      res = failed.length > 0 ? { error: `${failed.length} of ${ids.length} failed to send.` } : { success: true, count: ids.length };
    }

    if (res?.error) {
      setStatusMsg({ type: 'error', text: res.error });
    } else {
      const countText = targetType === 'all' ? `to all ${(res as any)?.count || users.length} users` : `to ${(res as any)?.count || selectedUserIds.size} selected user${selectedUserIds.size === 1 ? '' : 's'}`;
      setStatusMsg({ type: 'success', text: `Notification sent successfully ${countText}!` });
      setMessageText('');
      setSelectedPropertyId('');
      setSelectedUserIds(new Set());
      setBulkMatchResult(null);
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
      <div className="flex flex-wrap justify-between items-center gap-3">
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
                    Specific User(s)
                  </button>
                </div>
              </div>

              {/* Specific User Multi-Select */}
              {targetType === 'specific' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Select User(s) * {selectedUserIds.size > 0 && <span className="text-primary">({selectedUserIds.size} selected)</span>}
                  </label>

                  {selectedUserIds.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(selectedUserIds).map(id => {
                        const u = users.find(u => u.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 text-primary text-[10px] font-bold pl-2 pr-1 py-1 rounded-full">
                            {u?.full_name || u?.phone || id.slice(0, 8)}
                            <button type="button" onClick={() => removeSelectedUser(id)} className="hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-full p-0.5">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={e => setUserSearchQuery(e.target.value)}
                      placeholder="Search by name or phone..."
                      className="w-full h-9 pl-8 pr-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div className="border border-gray-200/60 dark:border-gray-800/60 rounded-lg max-h-52 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No users match your search</p>
                    ) : filteredUsers.map(u => (
                      <label key={u.id} className="flex items-center gap-2 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-navy-800 cursor-pointer text-xs border-b border-gray-50 dark:border-gray-800/60 last:border-0">
                        <input
                          type="checkbox"
                          checked={selectedUserIds.has(u.id)}
                          onChange={() => toggleUser(u.id)}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 shrink-0"
                        />
                        <span className="truncate">{u.full_name || 'Anonymous User'} <span className="text-gray-400">({u.phone || 'No phone'})</span></span>
                      </label>
                    ))}
                    {users.length > MAX_LIST_ROWS && filteredUsers.length === MAX_LIST_ROWS && (
                      <p className="text-[10px] text-gray-400 text-center py-1.5 bg-gray-50 dark:bg-navy-800">Showing first {MAX_LIST_ROWS} of {users.length} — refine your search for more</p>
                    )}
                  </div>

                  <button type="button" onClick={() => setShowBulkUserInput(!showBulkUserInput)} className="text-[11px] font-semibold text-primary hover:text-teal-700 flex items-center gap-1">
                    <ClipboardPaste className="w-3 h-3" /> {showBulkUserInput ? 'Hide' : 'Paste multiple IDs/phones/names'}
                  </button>

                  {showBulkUserInput && (
                    <div className="space-y-1.5">
                      <textarea
                        value={bulkUserInput}
                        onChange={e => setBulkUserInput(e.target.value)}
                        placeholder="Paste comma-separated user IDs, phone numbers, or names..."
                        rows={2}
                        className="w-full p-2 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                      <button type="button" onClick={resolveBulkPaste} className="h-7 px-2.5 bg-primary text-white rounded-lg text-[11px] font-semibold hover:bg-teal-700">
                        Match & Add
                      </button>
                      {bulkMatchResult && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          Matched {bulkMatchResult.matched}. {bulkMatchResult.unmatched.length > 0 && `Unmatched: ${bulkMatchResult.unmatched.join(', ')}`}
                        </p>
                      )}
                    </div>
                  )}
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
                  <option value={CUSTOM_TYPE_VALUE}>✍️ Custom / Manual Entry</option>
                </select>
                {notifType === CUSTOM_TYPE_VALUE && (
                  <input
                    type="text"
                    value={customType}
                    onChange={e => setCustomType(e.target.value)}
                    placeholder="e.g. maintenance_alert"
                    className="w-full h-9 px-3 mt-1 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                )}
              </div>

              {/* Property Link (Optional) — searchable */}
              <div className="space-y-1 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Link to Property (Optional)</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={selectedProperty ? selectedProperty.title : propertySearchQuery}
                    onChange={e => { setPropertySearchQuery(e.target.value); setSelectedPropertyId(''); setShowPropertyDropdown(true); }}
                    onFocus={() => setShowPropertyDropdown(true)}
                    placeholder="Search properties..."
                    className="w-full h-9 pl-8 pr-8 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {selectedPropertyId && (
                    <button type="button" onClick={() => { setSelectedPropertyId(''); setPropertySearchQuery(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {showPropertyDropdown && !selectedPropertyId && (
                  <div className="absolute z-10 mt-1 w-full border border-gray-200/60 dark:border-gray-800/60 rounded-lg max-h-48 overflow-y-auto bg-white dark:bg-navy-900 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setSelectedPropertyId(''); setPropertySearchQuery(''); setShowPropertyDropdown(false); }}
                      className="w-full text-left px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-navy-800 text-xs text-gray-400 border-b border-gray-50 dark:border-gray-800/60"
                    >
                      -- None / General Notification --
                    </button>
                    {filteredProperties.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">No properties match</p>
                    ) : filteredProperties.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setSelectedPropertyId(p.id); setPropertySearchQuery(''); setShowPropertyDropdown(false); }}
                        className="w-full text-left px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-navy-800 text-xs truncate border-b border-gray-50 dark:border-gray-800/60 last:border-0"
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification Message */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Notification Message *</label>
                  <AiEnhanceButton getValue={() => messageText} setValue={setMessageText} fieldType="notification" />
                </div>
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
