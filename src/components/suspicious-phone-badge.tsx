import { AlertTriangle } from 'lucide-react';

// Admin-only triage hint — deliberately not used anywhere in the agent
// portal, since a heuristic guess about a lead being fake shouldn't color
// how an agent treats a real person they're expected to follow up with.
export function SuspiciousPhoneBadge() {
  return (
    <span
      title="This number looks fake (repeating or sequential digits) — worth a second look before treating it as a qualified lead."
      className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
    >
      <AlertTriangle className="w-2.5 h-2.5" /> Check number
    </span>
  );
}
