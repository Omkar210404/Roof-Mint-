import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/supabase/admin-guard';
import { isRateLimited } from '@/lib/rate-limit';

export const maxDuration = 30;

// Rewrites, not generates from scratch — the admin's own words go in, a
// polished version comes out. Never asked to invent facts/amenities/numbers
// that aren't already in the text, since this runs on real listing content.
const PROMPTS: Record<string, (text: string) => string> = {
  title: (text) => `Rewrite this Indian real estate property listing title to sound more professional and appealing, in natural real-estate-listing style. Keep it concise (ideally under 60 characters). Do not invent facts, amenities, or numbers not present in the original. Return ONLY the rewritten title — no quotes, no explanation, no markdown.\n\nOriginal title: ${text}`,
  description: (text) => `You are polishing a real estate property description for a listing website. Rewrite the text below into a well-written, appealing, grammatically correct description (roughly 100-180 words). Do not invent specific facts, amenities, measurements, or numbers that aren't in the original — only improve phrasing, structure, and flow. Return ONLY the rewritten description — no preamble, no quotes, no markdown.\n\nOriginal description: ${text}`,
  notification: (text) => `Rewrite this push notification message to be punchier and more likely to get read, while staying factually accurate to the original. Keep it under 160 characters. Return ONLY the rewritten message — no quotes, no explanation.\n\nOriginal message: ${text}`,
};

export async function POST(req: Request) {
  const { authorized, supabase, user } = await requireAdmin();
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Keyed on the admin's own account, not IP — same reasoning as
  // account-delete: this only ever runs for an authenticated admin, so the
  // real threat is a runaway loop, not distributed abuse.
  if (isRateLimited(`enhance:${user!.id}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests — please wait a few minutes.' }, { status: 429 });
  }

  const { text, fieldType } = await req.json();
  if (!text || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: "Nothing to enhance yet — type something first." }, { status: 400 });
  }
  const buildPrompt = PROMPTS[fieldType];
  if (!buildPrompt) {
    return NextResponse.json({ error: 'Unknown field type.' }, { status: 400 });
  }

  // Self-tracked for the admin Technical Usage panel — same pattern as
  // ai_chat_calls/predict_calls.
  await supabase.rpc('increment_technical_usage', { p_metric: 'enhance_calls' });

  try {
    const { text: result } = await generateText({
      model: google('gemini-flash-latest') as any,
      prompt: buildPrompt(text.slice(0, 4000)),
    });
    return NextResponse.json({ enhanced: result.trim() });
  } catch (error: any) {
    console.error('enhance-text error:', error);
    supabase.rpc('increment_technical_usage', { p_metric: 'enhance_errors' }).then(() => {}, () => {});
    return NextResponse.json({ error: 'Could not reach the AI service — please try again in a moment.' }, { status: 502 });
  }
}
