'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Building2, Users, LogOut, Crown } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMyPlanInfo } from "./actions";
import { getPlanTiers } from "../plans/actions";
import { PlansModal } from "./plans-modal";
import type { AgentPlanTier, PlanStatus } from "@/lib/agent-plans";

export default function AgentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showPlans, setShowPlans] = useState(false);
  const [planTiers, setPlanTiers] = useState<AgentPlanTier[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);

  useEffect(() => {
    getPlanTiers().then(setPlanTiers);
    getMyPlanInfo().then(setPlanStatus);
  }, []);

  // Auto sign-out after 20 minutes of inactivity, same policy as admin/client.
  useEffect(() => {
    const IDLE_LIMIT_MS = 20 * 60 * 1000;
    const supabase = createClient();
    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = '/login?reason=session_expired';
      }, IDLE_LIMIT_MS);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, []);

  const navItems = [
    { href: "/agent/properties", icon: Building2, label: "My Properties" },
    { href: "/agent/leads", icon: Users, label: "My Leads" },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-navy-800">
      {/* Sidebar */}
      <aside className="w-56 bg-white dark:bg-navy-900 border-r border-gray-100/60 dark:border-gray-800/60 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-100/60 dark:border-gray-800/60">
          <Image
            src="/images/logo.png"
            alt="Roofmint"
            width={140}
            height={40}
            className="h-12 w-auto"
          />
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
          <button
            onClick={() => setShowPlans(true)}
            className="flex items-center gap-2.5 h-10 px-3 text-sm font-medium rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 hover:text-navy dark:hover:bg-navy-800 transition-colors"
          >
            <Crown className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            Plans
          </button>
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
        <header className="md:hidden bg-white dark:bg-navy-900 border-b border-gray-100/60 dark:border-gray-800/60 p-4 flex items-center justify-between">
          <Image src="/images/logo.png" alt="Roofmint" width={100} height={28} className="h-6 w-auto" />
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = '/login';
            }}
            className="text-gray-500 dark:text-gray-400"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="p-6 md:p-8">
          {children}
        </div>
      </main>

      {showPlans && (
        <PlansModal tiers={planTiers} planStatus={planStatus} onClose={() => setShowPlans(false)} />
      )}
    </div>
  );
}
