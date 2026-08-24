import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { isRateLimited, getClientIp, isSameOrigin } from '@/lib/rate-limit';
import { createClient } from '@/utils/supabase/server';
import { buildAppreciationPrompt, fallbackAppreciationResult } from '@/lib/appreciation-prompt';
import { withTimeout } from '@/lib/with-timeout';

export const maxDuration = 30;

// Vercel kills a function that runs past maxDuration and returns its own
// plain-text error page ("An error occurred with your deployment /
// FUNCTION_INVOCATION_TIMEOUT") instead of JSON — which is what actually
// broke the frontend (res.json() choked trying to parse it), not a bug in
// the JSON handling itself. Racing against a shorter internal timeout means
// a slow/stuck Gemini call hits our own catch block and returns the normal
// fallback response well before the platform ever kills the function.
const AI_TIMEOUT_MS = 20000;

// This route is now the *fallback* path — properties normally show a
// pre-generated forecast an admin already cached (see
// admin/properties/actions.ts's generatePriceForecast), so most visitors
// never hit Gemini live at all. This still exists for properties nobody's
// generated one for yet. When it succeeds and the caller passes a
// propertyId, the result is written back so the NEXT visitor to that
// property also gets the instant cached version instead of calling this
// live again.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (isRateLimited(`predict:${getClientIp(req)}`, 10, 10 * 60 * 1000)) {
    // isRateLimited itself tracks this hit (metric "rate_limited:predict")
    // for the admin Technical Usage panel — no separate call needed here.
    return NextResponse.json({ error: 'Too many requests — please try again in a few minutes.' }, { status: 429 });
  }

  const supabase = await createClient();
  // Self-tracked since Google doesn't expose free-tier quota consumption via
  // API — same pattern as /api/chat's ai_chat_calls/ai_chat_errors.
  await supabase.rpc('increment_technical_usage', { p_metric: 'predict_calls' });

  const { title, location_address, locality, city, price, property_type, bhk, propertyId } = await req.json();

  try {
    if (!price || (!locality && !city && !location_address)) {
      return NextResponse.json({ error: 'Missing required property parameters' }, { status: 400 });
    }

    const prompt = buildAppreciationPrompt({ title, location_address, locality, city, price, property_type, bhk });

    const { text } = await withTimeout(generateText({
      model: google('gemini-flash-latest') as any,
      prompt,
    }), AI_TIMEOUT_MS, 'AI request timed out');

    // Clean JSON text response
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    if (propertyId) {
      supabase
        .from('properties')
        .update({ ai_prediction: data, ai_prediction_generated_at: new Date().toISOString() })
        .eq('id', propertyId)
        .then(() => {}, () => {});
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Appreciation prediction error:', error);
    // Signal that the model itself failed (vs. just our own rate limiter) —
    // same "not awaited, fire-and-forget" reasoning as /api/chat's
    // ai_chat_errors, since Supabase's query builder is a lazy thenable and
    // a bare unfired call would silently never send.
    supabase.rpc('increment_technical_usage', { p_metric: 'predict_errors' }).then(() => {}, () => {});
    return NextResponse.json(fallbackAppreciationResult(price));
  }
}
