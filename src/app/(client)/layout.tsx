'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Home, Search, Heart, MessageSquare, User, MapPin, SlidersHorizontal, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

  useEffect(() => {
    try {
      const cached = localStorage.getItem('roofmint_user_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        setLocation(parsed);
        setLocationLoading(false);
      }
    } catch {}

    if ('geolocation' in navigator) {
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
            setLocation(prev => prev.locality === 'Detecting...' ? { locality: 'Your Location', city: 'India', state: '' } : prev);
          }
          setLocationLoading(false);
        },
        () => {
          setLocation(prev => prev.locality === 'Detecting...' ? { locality: 'Your Location', city: 'India', state: '' } : prev);
          setLocationLoading(false);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    } else {
      setLocation({ locality: 'Your Location', city: 'India', state: '' });
      setLocationLoading(false);
    }
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
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-gray-800 md:w-[calc(100%-4rem)] md:ml-16">
        <div className="flex items-center justify-between px-4 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding/ai"
              className="hidden md:flex items-center gap-1.5 h-9 px-3.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-primary text-xs font-bold rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Recommendation
            </Link>
            <button
              onClick={() => {
                setLocationLoading(true);
                localStorage.removeItem('roofmint_user_location');
                setLocation({ locality: 'Detecting...', city: '', state: '' });
                if ('geolocation' in navigator) {
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
                      setLocation({ locality: 'Your Location', city: 'India', state: '' });
                      setLocationLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                  );
                }
              }}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="Re-detect location"
            >
              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <Link
              href="/onboarding/ai"
              className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gray-50 dark:bg-navy-800 flex items-center justify-center hover:bg-gray-100 transition-colors relative"
              title="Filter & AI Preferences"
            >
              <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-white dark:ring-navy-900" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16 md:pb-0 md:ml-16 min-h-[calc(100vh-4rem)]">
        {children}
      </main>

      {/* Navigation (Mobile Bottom Bar / Desktop Hover-Expand Rail) */}
      <nav className="group fixed bottom-0 md:bottom-auto md:top-0 left-1/2 md:left-0 -translate-x-1/2 md:translate-x-0 w-full max-w-[480px] md:max-w-none md:h-screen bg-white dark:bg-navy-900 border-t md:border-t-0 md:border-r border-gray-100 dark:border-gray-800 z-50 safe-area-bottom overflow-hidden md:w-16 md:hover:w-56 transition-[width] duration-200 ease-out">
        <div className="flex md:flex-col items-center md:items-stretch justify-around md:justify-start px-2 md:px-3 h-16 md:h-full md:py-4 md:gap-1 md:w-16 md:group-hover:w-56 transition-[width] duration-200 ease-out">
          {/* Logo for Desktop — only shown once the rail expands */}
          <div className="hidden md:group-hover:flex h-14 items-center px-3 mb-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Roofmint"
                width={130}
                height={36}
                className="object-contain h-10 w-auto"
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
    </div>
  );
}
