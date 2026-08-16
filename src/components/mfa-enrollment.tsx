'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, Trash2, KeyRound } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };

// Shared TOTP (authenticator app) enrollment UI for the admin and agent
// portals. Regular users deliberately don't get this — 2FA was scoped to
// admin + agent accounts only, since those hold access to buyer PII and
// platform controls, and there are few enough of them that the extra step
// isn't the kind of friction that scares off a general signup flow.
//
// Once a factor is verified here, login for that account requires a TOTP
// code going forward — enforced both in the login flow (client) and in
// proxy.ts (server), so it can't be skipped by hitting a protected route
// directly with an old aal1 session.
export function MfaEnrollment() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadFactors = async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (!error) {
      setFactors((data?.totp || []).filter(f => f.status === 'verified'));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const startEnroll = async () => {
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  };

  const confirmEnroll = async () => {
    if (!factorId || verifyCode.trim().length !== 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setBusy(true);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: verifyCode.trim(),
    });

    setBusy(false);
    if (verifyError) {
      setError('That code didn\'t match — check your authenticator app and try again.');
      return;
    }

    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode('');
    await loadFactors();
  };

  const cancelEnroll = async () => {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setEnrolling(false);
    setQrCode(null);
    setSecret(null);
    setVerifyCode('');
    setError(null);
  };

  const removeFactor = async (id: string) => {
    if (!confirm('Turn off two-factor authentication? You\'ll be able to log in with just your password again.')) return;
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    await loadFactors();
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-navy-900 rounded-2xl p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const hasFactor = factors.length > 0;

  return (
    <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
      <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-primary" /> Two-Factor Authentication
      </h2>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      {!enrolling && hasFactor && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-400">
            <ShieldCheck className="w-4 h-4" /> Two-factor authentication is on
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Every login now requires a 6-digit code from your authenticator app, in addition to your password.
          </p>
          {factors.map(f => (
            <div key={f.id} className="flex items-center justify-between bg-gray-50 dark:bg-navy-800 rounded-xl px-3.5 h-11 border border-gray-100/60 dark:border-gray-800/60">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                Authenticator app — added {new Date(f.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => removeFactor(f.id)}
                disabled={busy}
                className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-500 dark:text-red-400 flex items-center justify-center disabled:opacity-50"
                title="Turn off 2FA"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!enrolling && !hasFactor && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" /> Two-factor authentication is off
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Add an extra layer of security — after enabling this, logging in will require a code from an authenticator app (Google Authenticator, Authy, etc.) as well as your password.
          </p>
          <button
            onClick={startEnroll}
            disabled={busy}
            className="h-10 px-5 bg-primary hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Enable Two-Factor Authentication
          </button>
        </div>
      )}

      {enrolling && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it shows.
          </p>
          {qrCode && (
            // qr_code from Supabase is an inline SVG data URI, safe to render directly.
            <div className="flex justify-center p-4 bg-white rounded-xl border border-gray-200/60">
              <img src={qrCode} alt="Scan with your authenticator app" className="w-40 h-40" />
            </div>
          )}
          {secret && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center break-all">
              Can't scan? Enter this code manually: <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{secret}</span>
            </p>
          )}
          <div>
            <label htmlFor="mfa-enroll-code" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">6-digit code</label>
            <input
              id="mfa-enroll-code"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              className="w-full h-11 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-center text-lg tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={cancelEnroll}
              disabled={busy}
              className="flex-1 h-10 border border-gray-200/60 dark:border-gray-800/60 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmEnroll}
              disabled={busy || verifyCode.length !== 6}
              className="flex-1 h-10 bg-primary hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-1.5"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Verify & Enable
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
