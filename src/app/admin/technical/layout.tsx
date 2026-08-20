'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { ArrowLeft, Gauge, KeyRound, LayoutDashboard } from "lucide-react";

const technicalNavItems = [
  { href: "/admin/technical", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/technical/usage", icon: Gauge, label: "Usage & Limits" },
  { href: "/admin/technical/security", icon: KeyRound, label: "Security" },
];

export default function TechnicalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100/60 dark:border-gray-800/60 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          {technicalNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-9 px-3.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-950/40 text-primary"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-navy-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <Link
          href="/admin"
          className="h-9 px-3.5 rounded-lg border border-gray-200/60 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-navy-800 text-sm font-semibold text-navy dark:text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> Admin Panel
        </Link>
      </div>

      {children}
    </div>
  );
}
