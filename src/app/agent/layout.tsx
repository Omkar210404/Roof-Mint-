'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { Building2, Users, LogOut, Crown, KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMyPlanInfo, getMyAgentProfile } from "./actions";
import { getPlanTiers } from "../plans/actions";
import { PlansModal } from "./plans-modal";
import type { AgentPlanTier, PlanStatus } from "@/lib/agent-plans";

export default function AgentLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [showPlans, setShowPlans] = useState(false);
  const [planTiers, setPlanTiers] = useState<AgentPlanTier[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus | null>(null);
  const [profile, setProfile] = useState<{ name: string; company: string | null } | null>(null);

  useEffect(() => {
    getPlanTiers().then(setPlanTiers);
    getMyPlanInfo().then(setPlanStatus);
    getMyAgentProfile().then(setProfile);
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
    { href: "/agent/security", icon: KeyRound, label: "Security" },
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

        {/* Profile chip — agent identity + plan, same idea as how Claude or
            Google show your name with your plan tag next to it. */}
        {profile && (
          <button
            onClick={() => setShowPlans(true)}
            className="flex items-center gap-2.5 mx-3 mt-3 p-2.5 rounded-xl border border-gray-100/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-full bg-navy dark:bg-teal-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy dark:text-white truncate">{profile.name}</p>
              {planStatus?.started && (
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${planStatus.expired ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-primary bg-teal-50 dark:bg-teal-950/40'}`}>
                  {planStatus.expired ? 'Plan Expired' : planStatus.tier.label}
                </span>
              )}
            </div>
          </button>
        )}

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

        <div className="p-6 md:p-8 pb-20 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav — the sidebar above is desktop-only, so mobile
          had no way to reach Properties/Leads/Plans at all before this. */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-navy-900 border-t border-gray-100/60 dark:border-gray-800/60 z-40 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 flex-1 h-full justify-center ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{item.label.replace('My ', '')}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setShowPlans(true)}
            className="flex flex-col items-center gap-0.5 flex-1 h-full justify-center text-gray-400 dark:text-gray-500"
          >
            <Crown className="w-5 h-5 stroke-[1.5px]" />
            <span className="text-[10px] font-medium">Plans</span>
          </button>
        </div>
      </nav>

      {showPlans && (
        <PlansModal tiers={planTiers} planStatus={planStatus} onClose={() => setShowPlans(false)} />
      )}
    </div>
  );
}
