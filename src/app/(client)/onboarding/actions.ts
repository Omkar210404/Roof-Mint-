'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatPrice } from '@/lib/format-price'

export async function checkProfileComplete() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { loggedIn: false, complete: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('profile_completed, full_name, phone')
    .eq('id', user.id)
    .single()

  return {
    loggedIn: true,
    complete: profile?.profile_completed === true,
    hasProfile: !!profile,
    name: profile?.full_name || user.user_metadata?.full_name || '',
    phone: profile?.phone || '',
  }
}

// Powers the live "N matching properties" counter shown partway through the
// questionnaire — a fast COUNT-only query against whatever filters have
// been answered so far, no row data returned. Public/available listings
// only, same as the real results page. Location and amenities are left out
// here (fuzzy keyword/array matching, not worth it for a debounced live
// count) — this is meant as an engaging signal, not the final match set.
export async function getLiveMatchCount(filters: {
  budgetMin?: number | null
  budgetMax?: number | null
  bhk?: number | null
  propertyType?: string | null
  listingType?: string | null
  ownership?: string | null
  furnishing?: string | null
}) {
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'available')

  if (filters.budgetMin) query = query.gte('price', filters.budgetMin)
  if (filters.budgetMax) query = query.lte('price', filters.budgetMax)
  if (filters.bhk) query = query.eq('bhk', filters.bhk)
  if (filters.propertyType) query = query.eq('property_type', filters.propertyType)
  if (filters.listingType && filters.listingType !== 'Any') query = query.eq('listing_type', filters.listingType)
  if (filters.ownership && filters.ownership !== 'No Preference') query = query.eq('ownership', filters.ownership)
  if (filters.furnishing && filters.furnishing !== 'No Preference') query = query.eq('furnishing', filters.furnishing)

  const { count, error } = await query
  if (error) {
    console.warn('getLiveMatchCount error:', error.message)
    return 0
  }
  return count || 0
}

export async function saveOnboardingPreferences(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not logged in' }

  const full_name = formData.get('full_name') as string
  const phone = formData.get('phone') as string
  const pref_location = formData.get('pref_location') as string
  const pref_bhk = parseInt(formData.get('pref_bhk') as string) || null
  const pref_property_type = formData.get('pref_property_type') as string
  const pref_listing_type = formData.get('pref_listing_type') as string
  const pref_ownership = formData.get('pref_ownership') as string
  const pref_furnishing = formData.get('pref_furnishing') as string
  const pref_timeline = formData.get('pref_timeline') as string
  const pref_notes = formData.get('pref_notes') as string

  // Budget now comes straight off the slider/manual-entry inputs as raw
  // rupee amounts, rather than a preset bucket key.
  const pref_budget_min = parseInt(formData.get('pref_budget_min') as string) || null
  const pref_budget_max = parseInt(formData.get('pref_budget_max') as string) || null

  // Parse amenities
  const amenitiesStr = formData.get('pref_amenities') as string
  const pref_amenities = amenitiesStr ? JSON.parse(amenitiesStr) : null

  // Build upsert payload safely
  const upsertData: Record<string, any> = {
    id: user.id,
    pref_budget_min,
    pref_budget_max,
    pref_location,
    pref_bhk,
    pref_property_type,
    pref_listing_type,
    pref_ownership,
    pref_furnishing,
    pref_timeline,
    pref_amenities,
    pref_notes,
    profile_completed: true,
  }

  if (full_name && full_name.trim()) upsertData.full_name = full_name.trim()
  if (phone && phone.trim()) upsertData.phone = phone.trim()

  // Upsert profile
  const { error } = await supabase.from('profiles').upsert(upsertData)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

type AIPreferenceFilters = {
  pref_budget_min: number | null
  pref_budget_max: number | null
  pref_location: string | null
  pref_bhk: number | null
  pref_property_type: string | null
  pref_listing_type: string | null
  pref_ownership: string | null
  pref_furnishing: string | null
}

// guestFilters lets a signed-out visitor see AI results computed straight
// from their in-memory questionnaire answers, with nothing saved to a
// profile — they only need an account once they actually want to save
// preferences or contact an agent, not just to see what matches. When
// omitted, falls back to the signed-in user's saved profile as before.
export async function getAIFilteredProperties(guestFilters?: AIPreferenceFilters) {
  const supabase = await createClient()

  let profile: AIPreferenceFilters | null = guestFilters || null

  if (!profile) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { properties: [], filters: null }

    const { data } = await supabase
      .from('profiles')
      .select('pref_budget_min, pref_budget_max, pref_location, pref_bhk, pref_property_type, pref_listing_type, pref_ownership, pref_furnishing')
      .eq('id', user.id)
      .single()

    profile = data
  }

  if (!profile) return { properties: [], filters: null }

  // Build query with filters
  let query = supabase
    .from('properties')
    .select(`
      id, title, slug, description, property_type, listing_type, ownership, bhk, price, price_type,
      carpet_area, built_up_area, floor, possession, furnishing,
      location_address, city, locality, status, highlights, amenities,
      demand_tag, created_at,
      media:property_media(url, is_cover, sort_order),
      nearby:nearby_places(name, distance)
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  // Apply filters from preferences
  if (profile.pref_budget_min) {
    query = query.gte('price', profile.pref_budget_min)
  }
  if (profile.pref_budget_max) {
    query = query.lte('price', profile.pref_budget_max)
  }
  if (profile.pref_bhk) {
    query = query.eq('bhk', profile.pref_bhk)
  }
  if (profile.pref_property_type) {
    query = query.eq('property_type', profile.pref_property_type)
  }
  if (profile.pref_listing_type && profile.pref_listing_type !== 'Any') {
    query = query.eq('listing_type', profile.pref_listing_type)
  }
  if (profile.pref_ownership && profile.pref_ownership !== 'No Preference') {
    query = query.eq('ownership', profile.pref_ownership)
  }
  if (profile.pref_furnishing && profile.pref_furnishing !== 'No Preference') {
    query = query.eq('furnishing', profile.pref_furnishing)
  }

  const { data } = await query.limit(20)

  let properties = data || []

  // If location preference set, do client-side keyword matching for broader results
  if (profile.pref_location && properties.length > 0) {
    const locLower = profile.pref_location.toLowerCase()
    const keywords = locLower.split(/[,\s]+/).filter((k: string) => k.length > 2)

    // Score properties by location match
    properties = properties.map((p: any) => {
      const address = `${p.locality || ''} ${p.city || ''} ${p.location_address || ''}`.toLowerCase()
      const matchScore = keywords.reduce((score: number, kw: string) => {
        return address.includes(kw) ? score + 1 : score
      }, 0)
      return { ...p, _matchScore: matchScore }
    })

    // Sort: matched properties first, then rest
    properties.sort((a: any, b: any) => b._matchScore - a._matchScore)
  }

  // Format properties
  const formatted = properties.map((p: any) => {
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

  return { properties: formatted, filters: profile }
}
