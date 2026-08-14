'use server'

import { requireAdmin } from '@/utils/supabase/admin-guard'
import { logActivity } from '@/utils/supabase/activity-log'
import { revalidatePath } from 'next/cache'

export async function getProperties() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      primary_agent:agents!properties_primary_agent_id_fkey(name),
      media:property_media(url, is_cover)
    `)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.warn('getProperties error:', error.message)
    return []
  }

  return data || []
}

export async function getPropertyById(id: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return null

  const { data, error } = await supabase
    .from('properties')
    .select('*, property_media(*), nearby_places(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.warn('getPropertyById error:', error.message)
    return null
  }

  return data
}

export async function getAgentsForSelect() {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return []
  const { data } = await supabase
    .from('agents')
    .select('id, name, company')
    .order('name')
  
  return data || []
}

export async function createProperty(formData: FormData) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const title = formData.get('title') as string
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now()
  const description = formData.get('description') as string
  const property_type = formData.get('property_type') as string
  const listing_type = (formData.get('listing_type') as string) || 'Sale'
  const ownership = (formData.get('ownership') as string) || '1st Owner'
  const bhk = parseInt(formData.get('bhk') as string) || null
  const furnishing = formData.get('furnishing') as string
  const carpet_area = parseFloat(formData.get('carpet_area') as string) || null
  const built_up_area = parseFloat(formData.get('built_up_area') as string) || null
  const floor = formData.get('floor') as string
  const possession = formData.get('possession') as string
  const price = parseFloat(formData.get('price') as string)
  const price_type = formData.get('price_type') as string
  const location_address = formData.get('location_address') as string
  const city = formData.get('city') as string
  const locality = formData.get('locality') as string
  const rera_number = formData.get('rera_number') as string
  const demand_tag = formData.get('demand_tag') as string || 'moderate'
  const status = formData.get('status') as string || 'available'
  const primary_agent_id = formData.get('primary_agent_id') as string || null

  // Parse JSON fields from form
  const amenities = JSON.parse(formData.get('amenities') as string || '[]')
  const highlights = JSON.parse(formData.get('highlights') as string || '[]')
  const image_urls = JSON.parse(formData.get('image_urls') as string || '[]')
  const nearby_places = JSON.parse(formData.get('nearby_places') as string || '[]')
  const video_urls = JSON.parse(formData.get('video_urls') as string || '[]')
  const youtube_url = formData.get('youtube_url') as string

  // Insert property
  const { data: property, error } = await supabase.from('properties').insert({
    title,
    slug,
    description,
    property_type,
    listing_type,
    ownership,
    bhk,
    furnishing,
    carpet_area,
    built_up_area,
    floor,
    possession,
    price,
    price_type,
    location_address,
    city,
    locality,
    rera_number,
    demand_tag,
    status,
    amenities,
    highlights,
    primary_agent_id: primary_agent_id || null
  }).select('id').single()

  if (error) {
    console.error('createProperty error:', error.message)
    return { error: error.message }
  }

  const propertyId = property.id

  // Insert images into property_media
  if (image_urls.length > 0) {
    const mediaRows = image_urls.map((url: string, i: number) => ({
      property_id: propertyId,
      url,
      media_type: 'image',
      is_cover: i === 0,
      sort_order: i
    }))
    await supabase.from('property_media').insert(mediaRows)
  }

  // Insert video URLs if provided (bulk-uploaded or pasted)
  if (video_urls.length > 0) {
    const videoRows = video_urls.map((url: string, i: number) => ({
      property_id: propertyId,
      url,
      media_type: 'video',
      is_cover: false,
      sort_order: 100 + i
    }))
    await supabase.from('property_media').insert(videoRows)
  }

  // Insert YouTube URL if provided
  if (youtube_url) {
    await supabase.from('property_media').insert({
      property_id: propertyId,
      url: youtube_url,
      media_type: 'video_youtube',
      is_cover: false,
      sort_order: 101
    })
  }

  // Insert nearby places
  if (nearby_places.length > 0) {
    const nearbyRows = nearby_places.map((p: any) => ({
      property_id: propertyId,
      name: p.name,
      distance: p.distance
    }))
    await supabase.from('nearby_places').insert(nearbyRows)
  }

  revalidatePath('/admin/properties')
  return { success: true }
}

export async function updateProperty(id: string, formData: FormData) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const property_type = formData.get('property_type') as string
  const listing_type = (formData.get('listing_type') as string) || 'Sale'
  const ownership = (formData.get('ownership') as string) || '1st Owner'
  const bhk = parseInt(formData.get('bhk') as string) || null
  const furnishing = formData.get('furnishing') as string
  const carpet_area = parseFloat(formData.get('carpet_area') as string) || null
  const built_up_area = parseFloat(formData.get('built_up_area') as string) || null
  const floor = formData.get('floor') as string
  const possession = formData.get('possession') as string
  const price = parseFloat(formData.get('price') as string)
  const price_type = formData.get('price_type') as string
  const location_address = formData.get('location_address') as string
  const city = formData.get('city') as string
  const locality = formData.get('locality') as string
  const rera_number = formData.get('rera_number') as string
  const demand_tag = formData.get('demand_tag') as string || 'moderate'
  const status = formData.get('status') as string || 'available'
  const primary_agent_id = formData.get('primary_agent_id') as string || null

  const amenities = JSON.parse(formData.get('amenities') as string || '[]')
  const highlights = JSON.parse(formData.get('highlights') as string || '[]')
  const image_urls = JSON.parse(formData.get('image_urls') as string || '[]')
  const nearby_places = JSON.parse(formData.get('nearby_places') as string || '[]')
  const video_urls = JSON.parse(formData.get('video_urls') as string || '[]')
  const youtube_url = formData.get('youtube_url') as string

  // Slug is intentionally left untouched on edit — changing it would break
  // any links already shared to this listing.
  const { error } = await supabase.from('properties').update({
    title,
    description,
    property_type,
    listing_type,
    ownership,
    bhk,
    furnishing,
    carpet_area,
    built_up_area,
    floor,
    possession,
    price,
    price_type,
    location_address,
    city,
    locality,
    rera_number,
    demand_tag,
    status,
    amenities,
    highlights,
    primary_agent_id: primary_agent_id || null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  if (error) {
    console.error('updateProperty error:', error.message)
    return { error: error.message }
  }

  // Media and nearby places don't have stable client-side identities in the
  // form (just plain arrays), so the simplest correct update is replace-all
  // rather than diffing against what's already in the DB.
  await supabase.from('property_media').delete().eq('property_id', id)
  if (image_urls.length > 0) {
    const mediaRows = image_urls.map((url: string, i: number) => ({
      property_id: id,
      url,
      media_type: 'image',
      is_cover: i === 0,
      sort_order: i
    }))
    await supabase.from('property_media').insert(mediaRows)
  }
  if (video_urls.length > 0) {
    const videoRows = video_urls.map((url: string, i: number) => ({
      property_id: id,
      url,
      media_type: 'video',
      is_cover: false,
      sort_order: 100 + i
    }))
    await supabase.from('property_media').insert(videoRows)
  }
  if (youtube_url) {
    await supabase.from('property_media').insert({
      property_id: id,
      url: youtube_url,
      media_type: 'video_youtube',
      is_cover: false,
      sort_order: 101
    })
  }

  await supabase.from('nearby_places').delete().eq('property_id', id)
  if (nearby_places.length > 0) {
    const nearbyRows = nearby_places.map((p: any) => ({
      property_id: id,
      name: p.name,
      distance: p.distance
    }))
    await supabase.from('nearby_places').insert(nearbyRows)
  }

  revalidatePath('/admin/properties')
  return { success: true }
}

export async function deleteProperty(id: string) {
  const { authorized, supabase, user } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { data: property } = await supabase.from('properties').select('title').eq('id', id).single()

  // Foreign key constraints with cascade will delete property_media, nearby_places, etc.
  const { error } = await supabase.from('properties').delete().eq('id', id)

  if (error) {
    console.error('deleteProperty error:', error.message)
    return { error: error.message }
  }

  await logActivity(supabase, user!.id, 'delete_property', 'property', id, { title: property?.title })

  revalidatePath('/admin/properties')
  return { success: true }
}

export async function updatePropertyStatus(id: string, status: string) {
  const { authorized, supabase } = await requireAdmin()
  if (!authorized) return { error: 'Unauthorized' }

  const { error } = await supabase.from('properties').update({ status }).eq('id', id)

  if (error) {
    console.error('updatePropertyStatus error:', error.message)
    return { error: error.message }
  }

  revalidatePath('/admin/properties')
  return { success: true }
}
