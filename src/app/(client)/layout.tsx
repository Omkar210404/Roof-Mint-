'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Home, Search, Heart, MessageSquare, User, MapPin, X, LocateFixed, Loader2, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/client";
import { LoginPromptModal } from "@/components/login-prompt-modal";
import { NotificationBell } from "@/components/notification-bell";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/saved", icon: Heart, label: "Saved" },
  { href: "/enquiries", icon: MessageSquare, label: "Enquiries" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [location, setLocation] = useState({ locality: 'Detecting...', city: '', state: '' });
  const [locationLoading, setLocationLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showFirstVisitPrompt, setShowFirstVisitPrompt] = useState(false);
  const [showSessionExpired, setShowSessionExpired] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // An admin/agent whose session is already active (bookmark, reopened tab,
  // etc. — not just a fresh login through the form) would otherwise land
  // on the normal client site with no indication anything's off, since
  // nothing here previously checked role on page load. Bounce them to
  // their own panel immediately instead of leaving it to chance — except
  // on a property detail page, which is where admin's "View" button (and
  // an agent checking their own listing) deliberately sends them to
  // preview a live listing, not to browse the customer site.
  useEffect(() => {
    if (pathname.startsWith('/properties/')) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from('profiles').select('role, terms_accepted_at').eq('id', data.user.id).single();
      if (profile?.role === 'admin') {
        window.location.href = '/admin';
        return;
      } else if (profile?.role === 'agent') {
        window.location.href = '/agent';
        return;
      }
      // Every regular user must explicitly accept Terms & Privacy Policy
      // before using the platform — existing users (whose row predates this
      // requirement) and anyone who signed up via Google (which never showed
      // a terms checkbox) will have a null terms_accepted_at and get sent
      // here once. /accept-terms and /profile/terms are excluded so the
      // gate itself and the legal text it links to don't loop.
      if (!profile?.terms_accepted_at && pathname !== '/accept-terms' && pathname !== '/profile/terms') {
        window.location.href = '/accept-terms';
      }
    });
  }, [pathname]);

  // Shown once per browser session (tab/window), not once ever — sessionStorage
  // resets on every fresh visit, unlike localStorage which would only ever fire once.
  useEffect(() => {
    if (isLoggedIn !== false) return;
    let seen = false;
    try { seen = sessionStorage.getItem('roofmint_login_prompt_seen') === 'true'; } catch {}
    if (seen) return;
    const timer = setTimeout(() => {
      setShowFirstVisitPrompt(true);
      try { sessionStorage.setItem('roofmint_login_prompt_seen', 'true'); } catch {}
    }, 1500);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  // Auto sign-out after 20 minutes with no mouse/keyboard/touch/scroll activity.
  useEffect(() => {
    if (!isLoggedIn) return;

    const IDLE_LIMIT_MS = 20 * 60 * 1000;
    const supabase = createClient();
    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        setShowSessionExpired(true);
      }, IDLE_LIMIT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isLoggedIn]);

  const detectLocation = (highAccuracy: boolean) => {
    setLocationLoading(true);
    if (!('geolocation' in navigator)) {
      setLocation({ locality: 'Your Location', city: 'India', state: '' });
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const address = data.address || {};

          const locality = address.suburb || address.neighbourhood || address.village || address.town || address.city_district || address.city || 'Your Area';
          const city = address.city || address.town || address.state_district || '';
          const state = address.state || '';

          const locationData = { locality, city, state };
          setLocation(locationData);
          localStorage.setItem('roofmint_user_location', JSON.stringify(locationData));
        } catch {
          setLocation({ locality: 'Your Location', city: 'India', state: '' });
        }
        setLocationLoading(false);
      },
      () => {
        setLocation(prev => prev.locality === 'Detecting...' ? { locality: 'Your Location', city: 'India', state: '' } : prev);
        setLocationLoading(false);
      },
      { enableHighAccuracy: highAccuracy, timeout: highAccuracy ? 10000 : 8000, maximumAge: highAccuracy ? 0 : 300000 }
    );
  };

  const searchLocation = async (query: string) => {
    if (query.trim().length < 3) {
      setLocationResults([]);
      return;
    }
    setSearchingLocation(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&addressdetails=1&limit=6`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      setLocationResults(Array.isArray(data) ? data : []);
    } catch {
      setLocationResults([]);
    }
    setSearchingLocation(false);
  };

  useEffect(() => {
    if (!showLocationModal) return;
    const timer = setTimeout(() => searchLocation(locationQuery), 400);
    return () => clearTimeout(timer);
  }, [locationQuery, showLocationModal]);

  const selectManualLocation = (result: any) => {
    const address = result.address || {};
    const locality = address.suburb || address.neighbourhood || address.village || address.town || address.city_district || address.city || result.display_name?.split(',')[0] || 'Selected Area';
    const city = address.city || address.town || address.state_district || '';
    const state = address.state || '';
    const locationData = { locality, city, state };
    setLocation(locationData);
    setLocationLoading(false);
    localStorage.setItem('roofmint_user_location', JSON.stringify(locationData));
    setShowLocationModal(false);
    setLocationQuery('');
    setLocationResults([]);
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem('roofmint_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        setLocation(parsed);
        setLocationLoading(false);
        return;
      }
    } catch {}
    detectLocation(false);
  }, []);

  const displayLocation = location.city
    ? `${location.locality}, ${location.city}`
    : location.locality;
  const displaySubtext = location.state
    ? `${location.state}, India`
    : 'India';

  return (
    <div className="flex min-h-screen flex-col bg-background max-w-[480px] md:max-w-none mx-auto relative">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 md:w-[calc(100%-4rem)] md:ml-16">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-2 text-left hover:opacity-75 transition-opacity"
          >
            <MapPin className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <div>
              <div className="flex items-center gap-1">
                <span className={`text-sm md:text-base font-semibold text-navy dark:text-white ${locationLoading ? 'animate-pulse' : ''}`}>
                  {displayLocation}
                </span>
                <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <span className="text-[10px] md:text-xs text-gray-400 dark:text-gray-500">{displaySubtext}</span>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="hidden md:flex items-center gap-1.5 h-9 px-3.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-primary text-xs font-bold rounded-lg transition-colors"
            >
              <Search className="w-3.5 h-3.5" /> Find Verified Properties
            </Link>
            <button
              onClick={() => detectLocation(true)}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="Re-detect location"
            >
              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <NotificationBell />
            {isLoggedIn === false && (
              <Link
                href="/login"
                className="flex items-center gap-1.5 h-9 md:h-10 px-3 md:px-4 bg-primary hover:bg-teal-700 text-white text-xs md:text-sm font-bold rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Login</span>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 md:ml-16 min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Navigation (Mobile Bottom Bar / Desktop Hover-Expand Rail) */}
      <nav className="group fixed bottom-0 md:bottom-auto md:top-0 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 w-full max-w-[480px] md:max-w-none md:h-screen bg-white dark:bg-navy-900 border-t md:border-t-0 md:border-r border-gray-100/60 dark:border-gray-800/60 z-50 safe-area-bottom overflow-hidden md:w-16 md:hover:w-56 transition-[width] duration-100 ease-out">
        <div className="flex md:flex-col items-center md:items-stretch justify-around md:justify-start px-2 md:px-3 h-16 md:h-full md:py-4 md:gap-1 md:w-16 md:group-hover:w-56 transition-[width] duration-100 ease-out">
          {/* Logo for Desktop — mini mark at rest, crossfades to the full wordmark on hover-expand */}
          <div className="hidden md:flex h-14 items-center justify-center md:group-hover:justify-start px-3 mb-2 border-b border-gray-100/60 dark:border-gray-800/60 shrink-0 overflow-hidden">
            <Link href="/" className="relative shrink-0 w-7 h-7 md:group-hover:w-[130px] transition-[width] duration-100">
              <Image
                src="/images/logo-icon.png"
                alt="Roofmint"
                width={28}
                height={28}
                className="absolute inset-0 object-contain h-7 w-7 opacity-100 md:group-hover:opacity-0 transition-opacity duration-75"
                priority
              />
              <Image
                src="/images/logo.png"
                alt="Roofmint"
                width={130}
                height={36}
                className="absolute left-0 top-1/2 -translate-y-1/2 object-contain h-10 w-auto opacity-0 md:group-hover:opacity-100 transition-opacity duration-100"
                priority
              />
            </Link>
          </div>
          <div className="hidden md:group-hover:block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3 mt-2 whitespace-nowrap shrink-0">Navigation</div>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href === "/" && pathname === "/") ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex md:flex-row flex-col items-center md:justify-center md:group-hover:justify-start justify-center gap-0.5 md:gap-0 md:group-hover:gap-3 py-1 md:h-11 px-3 rounded-xl transition-colors shrink-0 ${isActive
                    ? "text-primary md:bg-teal-50 md:font-semibold"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 md:hover:bg-gray-50 md:hover:text-navy"
                  }`}
              >
                <div className={`p-1 md:p-0 rounded-lg transition-all duration-200 shrink-0 ${isActive ? 'bg-teal-50 dark:bg-teal-950/40 md:bg-transparent' : ''}`}>
                  <Icon className={`w-5 h-5 md:w-4 md:h-4 ${isActive ? 'stroke-[2.5px] text-primary' : 'stroke-[1.5px]'}`} />
                </div>
                <span className={`text-[10px] md:text-sm font-medium whitespace-nowrap md:hidden md:group-hover:inline ${isActive ? 'font-semibold text-primary' : ''}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Location Picker Modal — manual entry, plus a shortcut to auto-detect */}
      {showLocationModal && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-xs flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white dark:bg-navy-900 rounded-t-2xl md:rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy dark:text-white">Set Your Location</h3>
              <button
                onClick={() => { setShowLocationModal(false); setLocationQuery(''); setLocationResults([]); }}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => { detectLocation(true); setShowLocationModal(false); }}
              className="w-full flex items-center gap-2 justify-center h-11 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-primary font-semibold text-sm transition-colors"
            >
              <LocateFixed className="w-4 h-4" /> Use My Current Location
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR SEARCH</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-navy-700" />
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Enter city, locality or area..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-50 dark:bg-navy-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-gray-400"
              />
              {searchingLocation && (
                <Loader2 className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
              )}
            </div>

            {locationResults.length > 0 && (
              <div className="space-y-1">
                {locationResults.map((result: any) => (
                  <button
                    key={result.place_id}
                    onClick={() => selectManualLocation(result)}
                    className="w-full flex items-start gap-2.5 text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-navy dark:text-white line-clamp-2">{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            {locationQuery.trim().length >= 3 && !searchingLocation && locationResults.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No matches found. Try a different search term.</p>
            )}
          </div>
        </div>
      )}

      <LoginPromptModal
        open={showFirstVisitPrompt}
        onClose={() => setShowFirstVisitPrompt(false)}
        title="Welcome to Roofmint"
        message="Login or create a free account to save properties, get AI-personalized matches, and enquire directly with our agents."
      />

      <LoginPromptModal
        open={showSessionExpired}
        onClose={() => setShowSessionExpired(false)}
        title="Session Expired"
        message="You were logged out after 20 minutes of inactivity. Please log in again to continue."
      />
    </div>
  );
}
