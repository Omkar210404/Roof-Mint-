'use server'

import { createClient } from '@/utils/supabase/server'

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
      media:property_media(url, is_cover, sort_order),
      nearby:nearby_places(name, distance, category)
    `)
    .eq('status', 'available')
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
      priceLabel: p.price_type === 'starting_from' ? 'Onwards' : p.price_type === 'negotiable' ? 'Negotiable' : '',
      bhkLabel: p.bhk ? `${p.bhk} BHK` : '',
      areaLabel: p.built_up_area ? `${Number(p.built_up_area).toLocaleString()} sq.ft.` : '',
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
      media:property_media(url, is_cover, sort_order, media_type),
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
    ?.map((m: any) => m.url) || ['/images/property1.png']

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
    priceLabel: data.price_type === 'starting_from' ? 'Onwards' : data.price_type === 'negotiable' ? 'Negotiable' : '',
    bhkLabel: data.bhk ? `${data.bhk} BHK` : '',
    areaLabel: data.built_up_area ? `${Number(data.built_up_area).toLocaleString()} sq.ft.` : '',
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

// Fired when a logged-in user clicks "WhatsApp Us" on a property — WhatsApp
// clicks are gated behind login already, so we always know who it was, and
// can log it as a real lead the same way the enquiry form does. Deduped
// against only the last couple of minutes — just enough to absorb an
// accidental double-click/double-tap on the button itself. A 24-hour dedupe
// used to sit here, which meant a genuine second visit later the same day —
// exactly the "they're interested again" signal admin wants to see — got
// silently swallowed with no new lead and no indication anything happened.
// The RPC's own phone-based throttle (max 3 enquiries in 10 minutes, across
// all sources) is the real anti-spam backstop; this is only about not
// double-logging one physical click.
//
// phoneOverride is passed when the profile had no usable phone on file (e.g.
// Google sign-in never collects one) and the visitor was asked for it in a
// quick popup before being sent to WhatsApp — in that case we also save it
// to their profile so future visits already have it.
export async function logWhatsAppLead(propertyId: string, phoneOverride?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { skipped: true }

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
  
  const { data } = await supabase
    .from('properties')
    .select(`
      id, title, slug, price, bhk, built_up_area, locality, city, status, listing_type, ownership,
      media:property_media(url, is_cover)
    `)
    .eq('status', 'available')
    .or(`title.ilike.%${query}%,locality.ilike.%${query}%,city.ilike.%${query}%,location_address.ilike.%${query}%,listing_type.ilike.%${query}%,ownership.ilike.%${query}%`)
    .limit(20)

  return (data || []).map((p: any) => ({
    ...p,
    coverImage: p.media?.find((m: any) => m.is_cover)?.url || p.media?.[0]?.url || '/images/property1.png',
    formattedPrice: formatPrice(p.price),
    bhkLabel: p.bhk ? `${p.bhk} BHK` : '',
    areaLabel: p.built_up_area ? `${Number(p.built_up_area).toLocaleString()} sq.ft.` : '',
    listingTypeLabel: p.listing_type === 'Rent' ? 'For Rent' : p.listing_type === 'Resale' ? 'Resale' : 'For Sale',
    ownershipLabel: p.ownership || '1st Owner',
  }))
}

function formatPrice(price: number): string {
  if (!price) return '₹0'
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`
  if (price >= 100000) return `₹${(price / 100000).toFixed(0)} L`
  return `₹${price.toLocaleString()}`
}
