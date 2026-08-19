import { google } from '@ai-sdk/google'
import { streamText, tool, convertToModelMessages, type UIMessage } from 'ai'
import { z } from 'zod'
import { createClient } from '@/utils/supabase/server'
import { isRateLimited, getClientIp, isSameOrigin } from '@/lib/rate-limit'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return new Response('Forbidden', { status: 403 })
  }
  if (isRateLimited(`chat:${getClientIp(req)}`, 20, 10 * 60 * 1000)) {
    return new Response('Too many requests — please try again in a few minutes.', { status: 429 })
  }

  const { messages: allMessages }: { messages: UIMessage[] } = await req.json()

  // A long-running chat tab (this one included, after a lot of testing)
  // resends its whole history on every turn — that grows the prompt, slows
  // the model down, and pushes it closer to the function's execution limit,
  // where a slow response just dies mid-stream with nothing shown. Recent
  // context is what actually matters for a property search anyway.
  const messages = allMessages.slice(-12)

  const result = streamText({
    model: google('gemini-flash-latest') as any,
    system: `You are the Roofmint AI real estate concierge. Your goal is to help users find their perfect property.
    Be extremely concise, polite, and professional.
    Do not hallucinate properties. ALWAYS use the 'extract_filters' tool to search the database when the user expresses an intent to find properties.
    If the user's request is too vague (e.g. "I want a house"), ask ONE clarifying question (e.g. "What is your budget or preferred location?").
    Once you call 'extract_filters', the tool will return a list of properties. You don't need to summarize the properties as they will be rendered as interactive cards in the UI by the tool result, but you can say a brief concluding sentence like "Here are some great options I found for you:" before or after the tool call.`,
    messages: await convertToModelMessages(messages),
    tools: {
      extract_filters: tool({
        description: 'Extract search filters from the user conversation and search the property database.',
        parameters: z.object({
          budget_min: z.number().optional().describe('Minimum budget in absolute numbers (e.g. 5000000 for 50 Lakhs, 20000000 for 2 Cr)'),
          budget_max: z.number().optional().describe('Maximum budget in absolute numbers'),
          location: z.string().optional().describe('Preferred neighborhood, area, or city'),
          bhk: z.number().optional().describe('Number of bedrooms (e.g. 2, 3, 4)'),
          property_type: z.enum(['Apartment', 'Villa', 'Plot', 'Commercial', 'Office']).optional().describe('Type of property'),
          listing_type: z.enum(['Sale', 'Rent', 'Resale']).optional().describe('Transaction purpose (Sale/Buy, Rent, or Resale)'),
          ownership: z.enum(['1st Owner', '2nd Owner', '3rd Owner', '4th+ Owner']).optional().describe('Ownership status of the property'),
        }),
        execute: async (args: any) => {
          const { budget_min, budget_max, location, bhk, property_type, listing_type, ownership } = args;
          const supabase = await createClient()
          
          let query = supabase
            .from('properties')
            .select(`
              id, title, slug, location_address, locality, city, price, property_type, listing_type, ownership, bhk, demand_tag, status,
              media:property_media(url, is_cover)
            `)
            .eq('status', 'available')
            .order('created_at', { ascending: false })

          if (budget_min) query = query.gte('price', budget_min)
          if (budget_max) query = query.lte('price', budget_max)
          if (location) {
            // PostgREST's .or() takes a filter string where "," separates
            // conditions and "()" groups them — strip those so the AI-
            // extracted location text can't break out of the intended
            // single ilike clause and smuggle in extra filter conditions.
            const loc = location.trim().replace(/[,()]/g, '')
            if (loc) query = query.or(`location_address.ilike.%${loc}%,locality.ilike.%${loc}%,city.ilike.%${loc}%`)
          }
          if (bhk) query = query.eq('bhk', bhk)
          if (property_type) query = query.eq('property_type', property_type)
          if (listing_type) query = query.eq('listing_type', listing_type)
          if (ownership) query = query.eq('ownership', ownership)

          const { data } = await query.limit(5)

          const properties = (data || []).map((p: any) => ({
            ...p,
            cover_image: p.media?.find((m: any) => m.is_cover)?.url || p.media?.[0]?.url || null,
            media: undefined,
          }))

          return {
            properties,
            summary: `Found ${properties.length} matching properties.`
          }
        },
      } as any),
    },
  })

  return result.toUIMessageStreamResponse()
}
