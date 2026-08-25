'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { Video, LogOut, Menu, X, ArrowLeftRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoofmintLogo } from "@/components/roofmint-logo";

// Its own full panel, mirroring /admin/layout.tsx and /technical/layout.tsx —
// a third choice on the admin-select chooser rather than a tab buried inside
// Business Admin. Same requireAdmin() gating per page/action as the other
// two panels; this layout itself has no auth check, same as technical's.
const socialNavItems = [
  { href: "/social", icon: Video, label: "Overview" },
];

export default function SocialLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-navy-800">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-navy-900 border-r border-gray-100/60 dark:border-gray-800/60 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100/60 dark:border-gray-800/60">
          <Link href="/social">
            <RoofmintLogo width={140} height={40} className="h-12 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3 mt-2">Social Panel</div>
          {socialNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg transition-colors ${isActive
                  ? "bg-teal-50 dark:bg-teal-950/40 text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-navy"
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"}`} />
                {item.label}
              </Link>
            );
          })}

          {/* Back to the panel chooser — not a direct jump into Business
              Admin, just returns to the same screen shown right after login. */}
          <div className="mt-2 pt-2 border-t border-gray-100/60 dark:border-gray-800/60">
            <Link
              href="/admin-select"
              className="flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800 hover:text-navy dark:hover:text-white transition-colors"
            >
              <ArrowLeftRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              Switch Panel
            </Link>
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-gray-100/60 dark:border-gray-800/60 flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 p-4 flex items-center justify-between">
          <Link href="/social">
            <RoofmintLogo width={100} height={28} className="h-6 w-auto" />
          </Link>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-72 max-w-[80%] h-full bg-white dark:bg-navy-900 shadow-2xl flex flex-col">
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100/60 dark:border-gray-800/60 shrink-0">
              <RoofmintLogo width={120} height={32} className="h-8 w-auto" />
              <button
                onClick={() => setMobileNavOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto flex flex-col gap-1 p-3">
              {socialNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={`flex items-center gap-2.5 h-11 px-3 text-sm font-medium rounded-lg transition-colors ${isActive
                      ? "bg-teal-50 dark:bg-teal-950/40 text-primary"
                      : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800 hover:text-navy dark:hover:text-white"
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-gray-400 dark:text-gray-500"}`} />
                    {item.label}
                  </Link>
                );
              })}

              <div className="mt-2 pt-2 border-t border-gray-100/60 dark:border-gray-800/60">
                <Link
                  href="/admin-select"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2.5 h-11 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800 hover:text-navy dark:hover:text-white transition-colors"
                >
                  <ArrowLeftRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  Switch Panel
                </Link>
              </div>
            </nav>
            <div className="p-3 border-t border-gray-100/60 dark:border-gray-800/60 flex items-center gap-2 shrink-0">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
