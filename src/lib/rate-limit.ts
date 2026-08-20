import { createClient } from '@/utils/supabase/server';

// Best-effort in-memory rate limiter for API routes that call a paid AI
// service and have no login gate (they're meant to work for anonymous
// visitors). This is per-instance state — on serverless it resets on cold
// starts and isn't shared across concurrent instances, so it won't stop a
// large distributed flood, but it does stop the common case (a script
// hammering the endpoint from one place) without needing new infra (Redis/
// Vercel KV). If usage ever shows real distributed abuse, upgrade to a
// shared store.
const buckets = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter(t => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    trackRateLimitHit(key);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  return false;
}

// Fire-and-forget telemetry for the admin "Technical Usage" panel — must
// never affect (or delay) the actual rate-limit decision above, hence no
// await anywhere in the call chain. The key's prefix (everything before the
// first ':', e.g. "chat" from "chat:1.2.3.4") becomes the tracked metric
// name, so every current and future isRateLimited() call site gets counted
// automatically with no per-call-site wiring.
function trackRateLimitHit(key: string) {
  const prefix = key.split(':')[0];
  createClient()
    .then(supabase => supabase.rpc('increment_technical_usage', { p_metric: `rate_limited:${prefix}` }))
    .catch(() => {});
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Cheap deterrent against a script calling the API route directly from
// outside the app — plain Route Handlers (unlike Next.js Server Actions)
// get no automatic same-origin check, so this fills that gap. Not a strict
// CSRF defense (Origin can be spoofed outside a browser), just raises the
// bar for casual abuse.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin requests from some clients omit Origin
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
