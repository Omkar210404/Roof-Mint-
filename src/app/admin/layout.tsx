'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { LayoutDashboard, Building2, Users, Briefcase, LogOut, UserCheck, Bell, MessageSquare, KeyRound, History, Menu, X } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { RoofmintLogo } from "@/components/roofmint-logo";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // No idle-timeout auto sign-out — an admin with multiple tabs/windows
  // open (easy to end up with, e.g. an old forgotten tab) would have each
  // one running its own independent timer, and Supabase's signOut() is
  // global by default: whichever tab's timer fired first killed the
  // session everywhere, including the tab actually being used. 2FA now
  // covers the account at login time, and the manual Logout button in the
  // sidebar/header still ends a session on demand.

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/properties", icon: Building2, label: "Properties" },
    { href: "/admin/leads", icon: Users, label: "Leads" },
    { href: "/admin/users", icon: UserCheck, label: "User Data" },
    { href: "/admin/notifications", icon: Bell, label: "Send Notifications" },
    { href: "/admin/agents", icon: Briefcase, label: "Agents" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback" },
    { href: "/admin/activity", icon: History, label: "Activity Log" },
    { href: "/admin/security", icon: KeyRound, label: "Security" },
  ];

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
          <Link href="/admin">
            <RoofmintLogo width={140} height={40} className="h-12 w-auto" />
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-1 p-3">
          <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3 mt-2">Menu</div>
          {navItems.map((item) => {
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
          <Link href="/admin">
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

      {/* Mobile Nav Drawer — the sidebar above is desktop-only, so mobile
          had no way to reach anything beyond whatever page it landed on. */}
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
              {navItems.map((item) => {
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
