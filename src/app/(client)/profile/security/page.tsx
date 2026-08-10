'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Key, Download, Trash2, CheckCircle2, AlertTriangle, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function SecurityPage() {
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setUpdating(true);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setStatusMsg({ type: 'error', text: error.message });
    } else {
      setStatusMsg({ type: 'success', text: 'Your password has been updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMsg(null), 4000);
    }
    setUpdating(false);
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let profileData = null;
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      profileData = data;
    }

    const exportPayload = {
      exportTimestamp: new Date().toISOString(),
      user: {
        id: user?.id,
        email: user?.email,
        createdAt: user?.created_at,
      },
      profile: profileData,
      recentSearches: JSON.parse(localStorage.getItem('roofmint_recent_searches') || '[]'),
      starredProperties: JSON.parse(localStorage.getItem('roofmint_starred_properties') || '[]'),
      appVersion: 'Roofmint 2.0.26',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `roofmint_my_data_${Date.now()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();

    setDownloading(false);
  };

  const inputCls = "w-full h-11 px-3.5 pl-10 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="bg-background min-h-screen pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Privacy & Security</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage security options and your personal data controls</p>
          </div>
        </div>
      </div>

      {statusMsg && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          statusMsg.type === 'success' ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />}
          {statusMsg.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Password Update */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Update Password
          </h2>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Confirm New Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={updating}
                className="h-10 px-5 bg-primary hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
              >
                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                {updating ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Roofmint Zero PII Guarantee */}
        <div className="bg-gradient-to-r from-navy via-slate-900 to-teal-950 text-white rounded-2xl p-5 md:p-6 shadow-md border border-teal-500/20 space-y-3">
          <div className="flex items-center gap-2 text-teal-300 font-extrabold text-sm uppercase tracking-wide">
            <EyeOff className="w-4 h-4 text-teal-400" />
            Confidential Agent & Buyer Privacy Protocol
          </div>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            Roofmint enforces strict **Supabase Row-Level Security (RLS)**. Your personal contact info is never exposed to public APIs or individual builder brokers without your explicit enquiry intent. Agent and developer commission data is encrypted and visible strictly to agency admins.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-teal-400 pt-1">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 256-bit SSL Encryption</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> DPDP Act 2023 Compliant</span>
          </div>
        </div>

        {/* Data Rights & Export */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" /> Data Ownership & Control
          </h2>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy dark:text-white">Download Personal Data</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Export a full JSON copy of your profile, preferences, and saved properties.</p>
              </div>
              <button
                onClick={handleDownloadData}
                disabled={downloading}
                className="h-9 px-4 border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 text-navy dark:text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-primary" />}
                Download JSON
              </button>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account & Erase Data</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permanently remove your account and clear all saved preferences.</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="h-9 px-4 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-navy dark:text-white">Delete Account?</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                This action is permanent. All your saved properties, preferences, and search history will be erased.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-10 border border-gray-200/60 dark:border-gray-800/60 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50"
              >
                Keep My Account
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/account/delete', { method: 'POST' });
                  } catch (err) {
                    console.error('Account deletion API failed', err);
                  }
                  await supabase.auth.signOut();
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="flex-1 h-10 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
