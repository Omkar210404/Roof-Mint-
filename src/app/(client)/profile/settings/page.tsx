'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, Save, Check, User, Phone, Mail, MapPin, Building2, ShieldCheck, Loader2, Sparkles, Clock, Compass, Moon, Sun } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { RequireLoginGate } from '@/components/require-login-gate';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { resolvedTheme, setTheme } = useTheme();
  const [themeMounted, setThemeMounted] = useState(false);
  useEffect(() => setThemeMounted(true), []);

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [bhk, setBhk] = useState('3');
  const [listingType, setListingType] = useState('Sale');
  const [ownership, setOwnership] = useState('1st Owner');
  const [timeline, setTimeline] = useState('Ready to Move');
  const [furnishing, setFurnishing] = useState('Semi-Furnished');

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      if (!user) {
        setLoading(false);
        return;
      }
      setEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || user.user_metadata?.full_name || '');
        setPhone(profile.phone || '');
        setLocation(profile.pref_location || '');
        if (profile.pref_property_type) setPropertyType(profile.pref_property_type);
        if (profile.pref_bhk) setBhk(String(profile.pref_bhk));
        if (profile.pref_listing_type) setListingType(profile.pref_listing_type);
        if (profile.pref_ownership) setOwnership(profile.pref_ownership);
        if (profile.pref_timeline) setTimeline(profile.pref_timeline);
        if (profile.pref_furnishing) setFurnishing(profile.pref_furnishing);
      }
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage({ type: 'error', text: 'You must be logged in to update settings.' });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      pref_location: location.trim(),
      pref_property_type: propertyType,
      pref_bhk: parseInt(bhk) || null,
      pref_listing_type: listingType,
      pref_ownership: ownership,
      pref_timeline: timeline,
      pref_furnishing: furnishing,
      profile_completed: true,
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Your home search preferences have been saved!' });
      setTimeout(() => setMessage(null), 4000);
    }
    setSaving(false);
  };

  const inputCls = "w-full h-11 px-3.5 pl-10 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all";
  const selectCls = "w-full h-11 px-3.5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white dark:bg-navy-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-navy dark:text-white";
  const labelCls = "block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isLoggedIn === false) {
    return (
      <RequireLoginGate
        title="Log in to edit your settings"
        message="Account details and search preferences are tied to your account — log in to manage them."
      />
    );
  }

  return (
    <div className="bg-background min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)] pb-16 max-w-4xl mx-auto px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-9 h-9 rounded-xl bg-white dark:bg-navy-900 border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-navy dark:text-white">Account & Search Preferences</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Customize your profile and AI home match maker preferences</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
          message.type === 'success' ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4 text-teal-600 shrink-0" /> : null}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Details */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-full-name" className={labelCls}>Your Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-full-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rohit Sharma"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor="settings-phone" className={labelCls}>Phone Number (For Site Visit Concierge)</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98XXX XXXXX"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="settings-email" className={labelCls}>Email Address (Account Login)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-email"
                  name="email"
                  type="email"
                  disabled
                  value={email}
                  className={inputCls + " bg-gray-50 dark:bg-navy-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center gap-2">
            {resolvedTheme === 'dark' ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />} Appearance
          </h2>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-semibold text-navy dark:text-white">Dark Mode</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Switch between light and dark theme across the app</p>
            </div>
            {themeMounted && (
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${
                  resolvedTheme === 'dark' ? 'bg-primary' : 'bg-gray-300 dark:bg-navy-700'
                }`}
              >
                <span className={`w-5 h-5 rounded-full bg-white dark:bg-navy-900 shadow-sm transition-transform ${
                  resolvedTheme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            )}
          </div>
        </div>

        {/* Home Buyer / Tenant Search Preferences */}
        <div className="bg-white dark:bg-navy-900 rounded-2xl p-5 md:p-6 border border-gray-100/60 dark:border-gray-800/60 shadow-sm space-y-4">
          <div className="border-b border-gray-100/60 dark:border-gray-800/60 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-navy dark:text-white uppercase tracking-wide flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" /> My Home Search Preferences
            </h2>
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full">
              Used by AI Matchmaker
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>What are you looking to do?</label>
              <select value={listingType} onChange={(e) => setListingType(e.target.value)} className={selectCls}>
                <option value="Sale">Buy a New Home</option>
                <option value="Rent">Rent a Home</option>
                <option value="Resale">Buy a Resale Property</option>
                <option value="Any">Open to Buying or Renting</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings-location" className={labelCls}>Preferred Locality / Area</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="settings-location"
                  name="location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Whitefield, Sarjapur, HSR Layout"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Property Type</label>
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className={selectCls}>
                <option value="Apartment">Apartment / Gated Community</option>
                <option value="Villa">Villa / Independent House</option>
                <option value="Plot">Plot / Residential Land</option>
                <option value="Penthouse">Luxury Penthouse</option>
                <option value="Row House">Row House</option>
                <option value="Commercial">Commercial / Office Space</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Bedrooms Needed (BHK)</label>
              <select value={bhk} onChange={(e) => setBhk(e.target.value)} className={selectCls}>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
                <option value="5">5+ BHK</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Builder / Seller Preference</label>
              <select value={ownership} onChange={(e) => setOwnership(e.target.value)} className={selectCls}>
                <option value="1st Owner">Direct Builder Launch (1st Owner)</option>
                <option value="2nd Owner">Pre-owned / Resale Home</option>
                <option value="No Preference">No Preference (Show All)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Possession Timeline</label>
              <select value={timeline} onChange={(e) => setTimeline(e.target.value)} className={selectCls}>
                <option value="Ready to Move">Ready to Move In</option>
                <option value="Under Construction">Under Construction (&lt; 1 Year)</option>
                <option value="New Launch">New Builder Launch (2+ Years)</option>
                <option value="Any Timeline">Any Timeline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <Link href="/profile" className="h-11 px-5 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-800 flex items-center transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="h-11 px-6 bg-primary hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
