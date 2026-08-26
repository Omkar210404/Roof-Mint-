'use server'

import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { isRateLimited } from '@/lib/rate-limit'
import { formatPrice, derivePriceLabel } from '@/lib/format-price'
import { resolveAreaLabel } from '@/lib/resolve-area-label'

export async function getPublicProperties(limit?: number) {
  const supabase = await createClient()
  
  let query = supabase
    .from('properties')
    .select(`
      id,
      title,
      slug,
      description,
      property_type,
      listing_type,
      ownership,
      bhk,
      price,
      price_type,
      price_all_inclusive,
      price_taxes_extra,
      carpet_area,
      built_up_area,
      floor,
      possession,
      location_address,
      city,
      locality,
      status,
      highlights,
      amenities,
      rera_number,
      demand_tag,
      created_at,
      pinned_at,
      featured,
      media:property_media(url, is_cover, sort_order),
      nearby:nearby_places(name, distance, category)
    `)
    .eq('status', 'available')
    // Admin-pinned properties float to the top here too, not just in the
    // admin list — most-recently-pinned first, same as there. Whether the
    // public "Featured" badge shows is a separate flag (paid placements
    // only) — see home-cards.tsx.
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.warn('getPublicProperties error:', error.message)
    return []
  }

  return (data || []).map((p: any) => {
    const coverImg = p.media?.find((m: any) => m.is_cover)?.url || p.media?.[0]?.url || '/images/property1.png'
    const images = p.media?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((m: any) => m.url) || ['/images/property1.png']
    return {
      ...p,
      coverImage: coverImg,
      images,
      photos: p.media?.length || 0,
      formattedPrice: formatPrice(p.price),
      priceLabel: derivePriceLabel(p),
      bhkLabel: p.bhk ? `${p.bhk} BHK` : '',
      areaLabel: resolveAreaLabel(p),
      listingTypeLabel: p.listing_type === 'Rent' ? 'For Rent' : p.listing_type === 'Resale' ? 'Resale' : 'For Sale',
      ownershipLabel: p.ownership || '1st Owner',
    }
  })
}

export async function getPropertyBySlug(slug: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      media:property_media(url, is_cover, sort_order, media_type, caption),
      nearby:nearby_places(name, distance, category)
    `)
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return null
  }

  const images = data.media
    ?.filter((m: any) => m.media_type === 'image' || !m.media_type)
    ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    ?.map((m: any) => ({ url: m.url, caption: m.caption || '' })) || [{ url: '/images/property1.png', caption: '' }]

  const videos = data.media
    ?.filter((m: any) => m.media_type === 'video' || m.media_type === 'video_youtube')
    ?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
    ?.map((m: any) => ({ url: m.url, type: m.media_type })) || []

  return {
    ...data,
    images,
    videos,
    photos: data.media?.length || 0,
    formattedPrice: formatPrice(data.price),
    priceLabel: derivePriceLabel(data),
    bhkLabel: data.bhk ? `${data.bhk} BHK` : '',
    areaLabel: resolveAreaLabel(data),
    listingTypeLabel: data.listing_type === 'Rent' ? 'For Rent' : data.listing_type === 'Resale' ? 'Resale' : 'For Sale',
    ownershipLabel: data.ownership || '1st Owner',
  }
}

export async function submitEnquiry(formData: FormData) {
  const supabase = await createClient()

  const property_id = formData.get('property_id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const budget_hint = formData.get('budget_hint') as string
  const message = formData.get('message') as string

  // Goes through a SECURITY DEFINER RPC rather than a raw table insert —
  // a direct insert with `with check (true)` would let any caller (logged
  // in or not) set assigned_agent_id/status/source/visible_to_agent
  // directly, e.g. to flood a specific agent's lead cap with junk. The RPC
  // only accepts what a real visitor should control and computes the rest
  // server-side.
  const { error } = await supabase.rpc('submit_public_enquiry', {
    p_property_id: property_id || null,
    p_name: name,
    p_phone: phone,
    p_email: email,
    p_budget_hint: budget_hint,
    p_message: message,
    p_source: 'form',
  })

  if (error) {
    throw new Error(error.message)
  }
}

// Fired when someone clicks "WhatsApp Us" on a property. Logged-in users are
// handled below with their real profile identity. Anonymous visitors no
// longer need to log in at all — WhatsApp itself hands Roofmint their phone
// number the moment they hit send in that chat, so gating on login was pure
// friction with no data-capture upside. They're asked for a name (required)
// and phone (optional, for people who'd rather also get a direct callback
// instead of relying on the WhatsApp thread) in a small popup first — that's
// nameOverride/phoneOverride below for the anonymous branch. Because there's
// often no phone to key a per-visitor dedupe or the RPC's own anti-spam
// throttle on, this path is rate-limited by IP instead (see isRateLimited
// call below).
//
// phoneOverride serves a second purpose for a logged-in user whose profile
// had no usable phone on file (e.g. Google sign-in never collects one) and
// who was asked for it in a quick popup before being sent to WhatsApp — in
// that case we also save it to their profile so future visits already have
// it (see the logged-in branch further down).
export async function logWhatsAppLead(propertyId: string, phoneOverride?: string, nameOverride?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const name = nameOverride?.trim()
    if (!name) return { skipped: true }

    const hdrs = await headers()
    const forwarded = hdrs.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : hdrs.get('x-real-ip') || 'unknown'
    if (isRateLimited(`whatsapp-lead:${ip}`, 5, 10 * 60 * 1000)) {
      return { error: 'Too many requests — please try again in a few minutes.' }
    }

    const { error } = await supabase.rpc('submit_public_enquiry', {
      p_property_id: propertyId,
      p_name: name,
      p_phone: phoneOverride || '',
      p_email: '',
      p_budget_hint: null,
      p_message: 'Contacted via WhatsApp',
      p_source: 'whatsapp',
    })

    if (error) {
      console.warn('logWhatsAppLead (anonymous) error:', error.message)
      return { error: error.message }
    }
    // Supabase's query builder is a lazy thenable — a bare call with no
    // .then()/await never actually sends the request.
    await supabase.rpc('increment_technical_usage', { p_metric: 'whatsapp_lead_anonymous' })
    return { success: true }
  }

  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('enquiries')
    .select('id')
    .eq('user_id', user.id)
    .eq('property_id', propertyId)
    .eq('source', 'whatsapp')
    .gte('created_at', since)
    .limit(1)
  if (existing && existing.length > 0) return { skipped: true }

  const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()

  if (phoneOverride) {
    await supabase.from('profiles').update({ phone: phoneOverride }).eq('id', user.id)
  }

  // Same RPC as the enquiry form — computes assigned_agent_id server-side
  // and forces visible_to_agent to false for source='whatsapp' inside the
  // function itself, so this can't be tampered with via a direct API call.
  const { error } = await supabase.rpc('submit_public_enquiry', {
    p_property_id: propertyId,
    p_name: profile?.full_name || 'Roofmint User',
    p_phone: phoneOverride || profile?.phone || '',
    p_email: user.email || '',
    p_budget_hint: null,
    p_message: 'Contacted via WhatsApp',
    p_source: 'whatsapp',
  })

  if (error) {
    console.warn('logWhatsAppLead error:', error.message)
    return { error: error.message }
  }

  return { success: true }
}

export async function getUserEnquiries() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('enquiries')
    .select(`
      id,
      name,
      phone,
      email,
      message,
      budget_hint,
      status,
      created_at,
      property:properties(title, locality, city)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('getUserEnquiries error:', error.message)
    return []
  }

  return data || []
}

export async function searchProperties(query: string) {
  const supabase = await createClient()

  // Strip characters that carry meaning in PostgREST's .or() filter syntax
  // (comma separates conditions, parens can group them) before interpolating
  // raw visitor input into the filter string — same fix applied to the AI
  // chat's location search.
  const safeQuery = query.replace(/[,()]/g, '')

  const { data } = await supabase
    .from('properties')
    .select(`
      id, title, slug, price, bhk, built_up_area, locality, city, status, listing_type, ownership,
      media:property_media(url, is_cover)
    `)
    .eq('status', 'available')
    .or(`title.ilike.%${safeQuery}%,locality.ilike.%${safeQuery}%,city.ilike.%${safeQuery}%,location_address.ilike.%${safeQuery}%,listing_type.ilike.%${safeQuery}%,ownership.ilike.%${safeQuery}%`)
    .limit(20)

  return (data || []).map((p: any) => ({
    ...p,
    coverImage: p.media?.find((m: any) => m.is_cover)?.url || p.media?.[0]?.url || '/images/property1.png',
    formattedPrice: formatPrice(p.price),
    bhkLabel: p.bhk ? `${p.bhk} BHK` : '',
    areaLabel: resolveAreaLabel(p),
    listingTypeLabel: p.listing_type === 'Rent' ? 'For Rent' : p.listing_type === 'Resale' ? 'Resale' : 'For Sale',
    ownershipLabel: p.ownership || '1st Owner',
  }))
}
