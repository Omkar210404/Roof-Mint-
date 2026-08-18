'use client';

import { useState, useMemo, useEffect } from 'react';
import { Search, Download, Printer, Filter, Calendar, CheckCircle2, XCircle, UserCheck, Trash2, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deleteUserProfile, updateUserRole } from './actions';
import { isSuspiciousPhone } from '@/lib/suspicious-phone';
import { SuspiciousPhoneBadge } from '@/components/suspicious-phone-badge';

function formatBudget(min?: number, max?: number) {
  if (!min && !max) return '—';
  const fmt = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr: string) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function getMonthKey(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${month}`;
}

function getMonthLabel(monthKey: string) {
  if (!monthKey) return 'All Months';
  const [year, month] = monthKey.split('-');
  const d = new Date(parseInt(year), parseInt(month) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

type SortKey = 'date' | 'name';
type SortDir = 'asc' | 'desc';

export function UsersClientWrapper({ initialUsers }: { initialUsers: any[] }) {
  const [usersList, setUsersList] = useState<any[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user "${name || 'User'}"?`)) return;
    const removed = usersList.find(u => u.id === id);
    setUsersList(prev => prev.filter(u => u.id !== id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    const result = await deleteUserProfile(id);
    if (result?.error) {
      alert(result.error);
      if (removed) setUsersList(prev => [...prev, removed].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  };

  const handleRoleChange = async (id: string, role: string) => {
    const previousRole = usersList.find(u => u.id === id)?.role;
    setUsersList(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    const result = await updateUserRole(id, role);
    if (result?.error) {
      alert(result.error);
      setUsersList(prev => prev.map(u => u.id === id ? { ...u, role: previousRole } : u));
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const selectable = filteredUsers.filter(u => !u.is_primary_admin);
      const allSelected = selectable.length > 0 && selectable.every(u => prev.has(u.id));
      const next = new Set(prev);
      if (allSelected) selectable.forEach(u => next.delete(u.id));
      else selectable.forEach(u => next.add(u.id));
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkDeleteUsers = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} selected user${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBulkBusy(true);
    const removed = usersList.filter(u => selectedIds.has(u.id));
    setUsersList(prev => prev.filter(u => !selectedIds.has(u.id)));
    const results = await Promise.all(ids.map(id => deleteUserProfile(id)));
    const failedIds = new Set(ids.filter((id, i) => results[i]?.error));
    if (failedIds.size > 0) {
      setUsersList(prev => [...prev, ...removed.filter(u => failedIds.has(u.id))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      alert(results.find(r => r?.error)?.error || 'Some users could not be deleted.');
    }
    clearSelection();
    setBulkBusy(false);
  };

  const bulkRoleChange = async (role: string) => {
    if (!role) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    const previousRoles = new Map(usersList.filter(u => selectedIds.has(u.id)).map(u => [u.id, u.role]));
    setUsersList(prev => prev.map(u => selectedIds.has(u.id) ? { ...u, role } : u));
    const results = await Promise.all(ids.map(id => updateUserRole(id, role)));
    const failed = ids.filter((id, i) => results[i]?.error);
    if (failed.length > 0) {
      setUsersList(prev => prev.map(u => failed.includes(u.id) ? { ...u, role: previousRoles.get(u.id) } : u));
      alert(results.find(r => r?.error)?.error || 'Some roles could not be updated.');
    }
    setBulkBusy(false);
  };

  // Extract unique available months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    usersList.forEach(u => {
      if (u.created_at) {
        monthsSet.add(getMonthKey(u.created_at));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [usersList]);

  // A date range takes precedence over the month dropdown when both start
  // and end are set — they're two independent ways to narrow the same data,
  // not meant to be combined.
  const dateRangeActive = !!(startDate && endDate);

  // Filter users based on search term and selected month/date-range
  const filteredUsers = useMemo(() => {
    const filtered = usersList.filter(user => {
      if (dateRangeActive) {
        if (!user.created_at) return false;
        const created = new Date(user.created_at).getTime();
        const rangeStart = new Date(startDate + 'T00:00:00').getTime();
        const rangeEnd = new Date(endDate + 'T23:59:59.999').getTime();
        if (created < rangeStart || created > rangeEnd) return false;
      } else if (selectedMonth !== 'all' && getMonthKey(user.created_at) !== selectedMonth) {
        return false;
      }
      // Search term filter
      if (debouncedSearch) {
        const name = (user.full_name || '').toLowerCase();
        const phone = (user.phone || '').toLowerCase();
        const location = (user.pref_location || '').toLowerCase();
        const propType = (user.pref_property_type || '').toLowerCase();
        return name.includes(debouncedSearch) || phone.includes(debouncedSearch) || location.includes(debouncedSearch) || propType.includes(debouncedSearch);
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else cmp = (a.full_name || '').localeCompare(b.full_name || '');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [usersList, selectedMonth, debouncedSearch, sortKey, sortDir]);

  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

  const SortHeader = ({ label, sortKeyVal }: { label: string; sortKeyVal: SortKey }) => (
    <button
      onClick={() => toggleSort(sortKeyVal)}
      className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-navy dark:hover:text-white transition-colors"
    >
      {label}
      {sortKey === sortKeyVal ? (
        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  // Download Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      'Full Name',
      'Phone',
      'Role',
      'Joined Date',
      'Profile Complete',
      'Budget Range',
      'Preferred Location',
      'BHK Needed',
      'Property Type',
      'Transaction Type',
      'Ownership Pref',
      'Furnishing',
      'Timeline',
      'Must-have Amenities',
      'Notes'
    ];

    const rows = filteredUsers.map(u => [
      `"${u.full_name || 'Anonymous User'}"`,
      `"${u.phone || 'N/A'}"`,
      `"${u.role || 'user'}"`,
      `"${formatDate(u.created_at)}"`,
      `"${u.profile_completed ? 'Completed' : 'Pending'}"`,
      `"${formatBudget(u.pref_budget_min, u.pref_budget_max)}"`,
      `"${u.pref_location || 'N/A'}"`,
      `"${u.pref_bhk ? u.pref_bhk + ' BHK' : 'N/A'}"`,
      `"${u.pref_property_type || 'N/A'}"`,
      `"${u.pref_listing_type || 'Any'}"`,
      `"${u.pref_ownership || 'Any'}"`,
      `"${u.pref_furnishing || 'N/A'}"`,
      `"${u.pref_timeline || 'N/A'}"`,
      `"${(u.pref_amenities || []).join(', ') || 'N/A'}"`,
      `"${(u.pref_notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const periodSuffix = dateRangeActive ? `${startDate}_to_${endDate}` : selectedMonth === 'all' ? 'all_time' : selectedMonth;
    link.setAttribute('download', `roofmint_user_data_${periodSuffix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download PDF / Print
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-navy dark:text-white">User Data & Preferences</h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            View collected user details and personalized real estate requirements.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold rounded-lg transition-all shadow-sm flex items-center gap-2 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            Export Excel / CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="h-10 px-4 bg-navy hover:bg-slate-800 text-white text-xs md:text-sm font-semibold rounded-lg transition-all shadow-sm flex items-center gap-2 active:scale-[0.98] whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Registered Users</p>
          <p className="text-2xl font-bold text-navy dark:text-white mt-1">{initialUsers.length}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Profiles Completed</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">
            {initialUsers.filter(u => u.profile_completed).length}
          </p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Filtered Count</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{filteredUsers.length}</p>
        </div>
        <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Selected Period</p>
          <p className="text-sm font-bold text-navy dark:text-white mt-2 truncate">
            {dateRangeActive
              ? `${formatDate(startDate)} → ${formatDate(endDate)}`
              : selectedMonth === 'all' ? 'All Time' : getMonthLabel(selectedMonth)}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-shrink-0">Month:</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 px-3 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-navy dark:text-white w-full md:w-56"
          >
            <option value="all">All Months ({initialUsers.length} users)</option>
            {availableMonths.map(monthKey => {
              const count = initialUsers.filter(u => getMonthKey(u.created_at) === monthKey).length;
              return (
                <option key={monthKey} value={monthKey}>
                  {getMonthLabel(monthKey)} ({count} users)
                </option>
              );
            })}
          </select>
        </div>

        {/* Date Range Picker — independent of the Month dropdown above; whichever was set most recently wins */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto min-w-0">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex-shrink-0">Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
            className="h-10 px-2.5 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-navy dark:text-white"
          />
          <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
            className="h-10 px-2.5 rounded-lg border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-navy dark:text-white"
          />
          {dateRangeActive && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              title="Clear date range"
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-navy-800 hover:bg-gray-200 dark:hover:bg-navy-700 flex items-center justify-center text-gray-500 dark:text-gray-400 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl px-4 py-2.5">
          <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
          <button onClick={clearSelection} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
          <div className="flex-1" />
          <select
            defaultValue=""
            disabled={bulkBusy}
            onChange={(e) => { bulkRoleChange(e.target.value); e.target.value = ''; }}
            className="h-8 text-xs font-medium bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 rounded-lg px-2 text-navy dark:text-white focus:outline-none disabled:opacity-50"
          >
            <option value="" disabled>Set Role...</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={bulkDeleteUsers}
            disabled={bulkBusy}
            className="h-8 px-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-navy-900 border border-gray-100/60 dark:border-gray-800/60 shadow-sm rounded-xl overflow-hidden">
        <div className="h-12 px-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide">
            User Preference Directory ({filteredUsers.length})
          </h2>
          {selectedMonth !== 'all' && (
            <span className="text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-primary px-3 py-1 rounded-full">
              {getMonthLabel(selectedMonth)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60 dark:bg-navy-800">
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                  />
                </TableHead>
                <TableHead><SortHeader label="User Info" sortKeyVal="name" /></TableHead>
                <TableHead><SortHeader label="Joined Date" sortKeyVal="date" /></TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Active</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Budget</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Preferred Area</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">BHK & Type</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Furnishing & Timeline</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Amenities / Notes</TableHead>
                <TableHead className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-gray-400 dark:text-gray-500">
                    No user data matching the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id} className={`hover:bg-gray-50/50 dark:hover:bg-navy-800/50 transition-colors ${selectedIds.has(user.id) ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''}`}>
                    <TableCell>
                      {!user.is_primary_admin && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(user.id)}
                          onChange={() => toggleSelectOne(user.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                        />
                      )}
                    </TableCell>
                    {/* User Info */}
                    <TableCell>
                      <div>
                        <p className="font-semibold text-navy dark:text-white text-sm">{user.full_name || 'Anonymous User'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                          {user.phone || 'No phone'}
                          {isSuspiciousPhone(user.phone) && <SuspiciousPhoneBadge />}
                        </p>
                      </div>
                    </TableCell>

                    {/* Joined Date */}
                    <TableCell className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {formatDate(user.created_at)}
                    </TableCell>

                    {/* Last Active — from auth.users.last_sign_in_at, the
                        activity data the Privacy Policy already says is
                        kept "to operate the platform securely" */}
                    <TableCell className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-nowrap">
                      {user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : <span className="text-gray-400 dark:text-gray-500 italic">Never signed in</span>}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {user.profile_completed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                          <XCircle className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </TableCell>

                    {/* Budget */}
                    <TableCell className="font-bold text-primary text-sm">
                      {formatBudget(user.pref_budget_min, user.pref_budget_max)}
                    </TableCell>

                    {/* Preferred Area */}
                    <TableCell className="text-xs font-medium text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
                      {user.pref_location || '—'}
                    </TableCell>

                    {/* BHK & Type */}
                    <TableCell className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                      <div>
                        {user.pref_bhk ? `${user.pref_bhk} BHK ` : ''}
                        {user.pref_property_type || '—'}
                      </div>
                      {(user.pref_listing_type || user.pref_ownership) && (
                        <div className="flex items-center gap-1 mt-1 text-[10px]">
                          {user.pref_listing_type && <span className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 font-semibold px-1 rounded">{user.pref_listing_type}</span>}
                          {user.pref_ownership && <span className="bg-purple-50 text-purple-700 font-semibold px-1 rounded">{user.pref_ownership}</span>}
                        </div>
                      )}
                    </TableCell>

                    {/* Furnishing & Timeline */}
                    <TableCell className="text-xs text-gray-600 dark:text-gray-300">
                      <div>{user.pref_furnishing || '—'}</div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{user.pref_timeline || ''}</div>
                    </TableCell>

                    {/* Amenities & Notes */}
                    <TableCell className="text-xs text-gray-600 dark:text-gray-300 max-w-[180px]">
                      {user.pref_amenities && user.pref_amenities.length > 0 && (
                        <div className="truncate text-teal-700 font-medium">
                          {user.pref_amenities.join(', ')}
                        </div>
                      )}
                      {user.pref_notes && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate italic mt-0.5">
                          &quot;{user.pref_notes}&quot;
                        </div>
                      )}
                      {!user.pref_amenities?.length && !user.pref_notes && '—'}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      {user.is_primary_admin ? (
                        <span
                          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold bg-navy dark:bg-teal-950/40 text-white dark:text-teal-400"
                          title="The primary admin account — role is fixed and it cannot be deleted"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Admin (fixed)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="h-8 text-xs font-semibold rounded-lg px-2 border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.full_name)}
                            className="text-red-600 dark:text-red-400 hover:text-red-800 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 h-8 px-2.5 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-1"
                            title="Delete User Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
