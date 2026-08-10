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

  return {
    ...data,
    images,
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
  const { data: { user } } = await supabase.auth.getUser()

  const property_id = formData.get('property_id') as string
  const name = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string
  const budget_hint = formData.get('budget_hint') as string
  const message = formData.get('message') as string

  let assigned_agent_id: string | null = null
  if (property_id) {
    const { data: property } = await supabase
      .from('properties')
      .select('primary_agent_id')
      .eq('id', property_id)
      .single()
    assigned_agent_id = property?.primary_agent_id || null
  }

  const { error } = await supabase.from('enquiries').insert({
    property_id: property_id || null,
    user_id: user?.id || null,
    assigned_agent_id,
    name,
    phone,
    email,
    budget_hint,
    message,
    status: 'new'
  })

  if (error) {
    throw new Error(error.message)
  }
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
