'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { LayoutDashboard, Building2, Users, Briefcase, LogOut, UserCheck, Bell, MessageSquare, KeyRound, History } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

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

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-navy-800">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-navy-900 border-r border-gray-100/60 dark:border-gray-800/60 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100/60 dark:border-gray-800/60">
          <Link href="/admin">
            <Image
              src="/images/logo.png"
              alt="Roofmint"
              width={140}
              height={40}
              className="h-12 w-auto"
            />
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
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="flex-1 flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header (Placeholder if needed) */}
        <header className="md:hidden bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 p-4 flex items-center justify-between">
          <Image src="/images/logo.png" alt="Roofmint" width={100} height={28} className="h-6 w-auto" />
          {/* Mobile menu button could go here */}
        </header>

        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
