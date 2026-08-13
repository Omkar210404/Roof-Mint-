'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ChevronRight, Bell, Shield, HelpCircle, FileText, Star,
  LogOut, Settings, Edit2, CheckCircle, Bookmark, Search as SearchIcon, Eye, MessageSquare,
  MapPin, Building2, Wallet, Tag, UserCheck, X, Check
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const menuItems = [
  { label: 'Notifications', icon: Bell, href: '/profile/notifications' },
  { label: 'Account Settings', icon: Settings, href: '/profile/settings' },
  { label: 'Privacy & Security', icon: Shield, href: '/profile/security' },
  { label: 'Help & Support', icon: HelpCircle, href: '/profile/help' },
  { label: 'Terms & Conditions', icon: FileText, href: '/profile/terms' },
  { label: 'Rate the App', icon: Star, href: '#rate', isAction: true },
];

function formatBudget(min?: number, max?: number) {
  if (!min && !max) return 'Not set';
  const fmt = (n: number) => n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` : `₹${(n / 100000).toFixed(0)}L`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dynamic counts
  const [savedCount, setSavedCount] = useState(0);
  const [searchesCount, setSearchesCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);
  const [enquiriesCount, setEnquiriesCount] = useState(0);

  // Rate Modal State
  const [showRateModal, setShowRateModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      if (authUser) {
        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
        setProfile(data);

        // Fetch user enquiries count
        const { count: enqCount } = await supabase
          .from('enquiries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        if (enqCount !== null) setEnquiriesCount(enqCount);

        // Fetch user starred properties count
        const { count: starCount } = await supabase
          .from('starred_properties')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        if (starCount !== null) setSavedCount(starCount);
      }

      // Local storage counts fallback / history
      try {
        const searches = JSON.parse(localStorage.getItem('roofmint_recent_searches') || '[]');
        setSearchesCount(searches.length);

        const viewed = JSON.parse(localStorage.getItem('roofmint_viewed_history') || '[]');
        setViewedCount(viewed.length);

        const savedIds = JSON.parse(localStorage.getItem('roofmint_saved_ids') || '[]');
        setSavedCount(prev => Math.max(prev, savedIds.length));
      } catch {}

      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    document.cookie = 'temp_admin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

  const submitRating = () => {
    setRatingSubmitted(true);
    setTimeout(() => {
      setShowRateModal(false);
      setRatingSubmitted(false);
      setFeedbackNote('');
    }, 2500);
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest User';
  const displayEmail = user?.email || 'Not logged in';
  const initial = displayName.charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pb-24 md:pb-12 max-w-6xl mx-auto md:px-8 md:pt-6">
      <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
        {/* Left Column: Profile Card, Stats & Preferences */}
        <div className="space-y-4">
          {/* Profile Header Card */}
          <div className="bg-white dark:bg-navy-900 px-4 pt-6 pb-5 md:p-6 md:rounded-2xl md:border md:border-gray-100/60 md:shadow-sm">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {initial}
                </div>
                <Link
                  href="/profile/settings"
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary hover:bg-teal-700 flex items-center justify-center shadow-sm border-2 border-white transition-colors"
                  title="Edit Account Settings"
                >
                  <Edit2 className="w-3 h-3 text-white" />
                </Link>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg md:text-xl font-bold text-navy dark:text-white">{displayName}</h1>
                  {user && <CheckCircle className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5">{displayEmail}</p>
                {!user ? (
                  <Link href="/login" className="text-xs font-semibold text-primary hover:text-teal-700 mt-1 inline-block">
                    Log in to unlock all features →
                  </Link>
                ) : (
                  <Link href="/profile/settings" className="text-xs font-semibold text-primary hover:text-teal-700 mt-1 inline-block">
                    Edit Profile Settings →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid (Fully interactive) */}
          <div className="px-4 md:px-0">
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {[
                { label: 'Saved', value: savedCount, icon: Bookmark, href: '/saved' },
                { label: 'Searches', value: searchesCount, icon: SearchIcon, href: '/search' },
                { label: 'Viewed', value: viewedCount, icon: Eye, href: '/search' },
                { label: 'Enquiries', value: enquiriesCount, icon: MessageSquare, href: '/enquiries' },
              ].map((stat) => (
                <Link key={stat.label} href={stat.href} className="block group">
                  <div className="bg-white dark:bg-navy-900 rounded-xl p-3 md:p-4 text-center shadow-sm border border-gray-100/60 dark:border-gray-800/60 group-hover:border-teal-200 group-hover:shadow-md transition-all">
                    <stat.icon className="w-4 h-4 text-primary mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <p className="text-lg md:text-xl font-bold text-navy dark:text-white">{stat.value}</p>
                    <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Current Preferences */}
          <div className="px-4 md:px-0">
            <h3 className="text-sm font-bold text-navy dark:text-white mb-2 px-1">Your Current Preferences</h3>
            <div className="bg-white dark:bg-navy-900 rounded-xl overflow-hidden shadow-sm border border-gray-100/60 dark:border-gray-800/60 divide-y divide-gray-50 dark:divide-gray-800">
              {[
                { icon: MapPin, label: 'Location', value: profile?.pref_location || 'Not set' },
                { icon: Building2, label: 'Property Type', value: profile?.pref_bhk ? `${profile.pref_bhk} BHK ${profile.pref_property_type || ''}`.trim() : (profile?.pref_property_type || 'Not set') },
                { icon: Tag, label: 'Transaction Type', value: profile?.pref_listing_type ? (profile.pref_listing_type === 'Sale' ? 'Buy' : profile.pref_listing_type) : 'Not set' },
                { icon: UserCheck, label: 'Ownership Pref', value: profile?.pref_ownership || 'Not set' },
                { icon: Wallet, label: 'Budget', value: formatBudget(profile?.pref_budget_min, profile?.pref_budget_max) },
              ].map((pref) => (
                <div key={pref.label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                    <pref.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{pref.label}</p>
                    <p className="text-sm font-semibold text-navy dark:text-white">{pref.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Banner, Menu Items, Logout */}
        <div className="space-y-4">
          {/* Update Preferences Banner */}
          <div className="px-4 md:px-0">
            <Link href="/onboarding/ai" className="block">
              <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-navy-900 flex items-center justify-center flex-shrink-0">
                  <Image src="/images/roofmintai.png" alt="AI" width={28} height={28} className="w-7 h-7 rounded-full" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-semibold">Update Your AI Preferences</p>
                  <p className="text-teal-100 text-[11px]">Get better AI recommendations</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/70" />
              </div>
            </Link>
          </div>

          {/* Menu Items */}
          <div className="px-4 md:px-0">
            <div className="bg-white dark:bg-navy-900 rounded-xl overflow-hidden shadow-sm border border-gray-100/60 dark:border-gray-800/60 divide-y divide-gray-50 dark:divide-gray-800">
              {menuItems.map((item) => (
                item.isAction ? (
                  <button
                    key={item.label}
                    onClick={() => setShowRateModal(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-navy dark:text-white">{item.label}</span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-full">Feedback</span>
                  </button>
                ) : (
                  <Link key={item.label} href={item.href}>
                    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-navy-800 flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </div>
                      <span className="flex-1 text-sm font-medium text-navy dark:text-white">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </div>
                  </Link>
                )
              ))}
            </div>
          </div>

          {/* Logout — only for signed-in users */}
          {user && (
            <div className="px-4 md:px-0 pt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 font-medium text-sm hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Rate App Modal */}
      {showRateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-navy-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowRateModal(false)}
              className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {ratingSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/40 text-primary flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-navy dark:text-white">Thank You for Your Feedback!</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Your rating helps us improve the Roofmint AI experience.</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 fill-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-navy dark:text-white">Rate Your Experience</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">How would you rate Roofmint real estate search?</p>
                </div>

                {/* Stars Selector */}
                <div className="flex justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      <Star className={`w-8 h-8 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Feedback / Suggestions</label>
                  <textarea
                    rows={3}
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Tell us what you loved or how we can improve..."
                    className="w-full p-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowRateModal(false)}
                    className="flex-1 h-10 border border-gray-200/60 dark:border-gray-800/60 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRating}
                    className="flex-1 h-10 bg-primary hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    Submit Feedback
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
