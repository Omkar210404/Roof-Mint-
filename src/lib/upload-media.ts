import { createClient } from '@/utils/supabase/client'

const BUCKET = 'property-media'
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // matches the bucket's fileSizeLimit

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}

export class UploadError extends Error {}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
}

// Uploads a single file to the public property-media bucket and returns its
// public URL. Runs entirely browser-side — the admin's own session needs
// storage write access via RLS (see 08_property_media_storage.sql), since a
// Next.js Server Action would hit Vercel's request-size ceiling long before
// a property video does.
//
// `expectedType` is checked against the file's actual MIME type (not just
// the input's accept= hint, which a browser dev tools edit or drag-drop
// from a renamed file can bypass) — the bucket itself also now enforces an
// allow-list of mime types server-side, so this is a fast client-side
// rejection with a clear message, not the only line of defense.
export async function uploadPropertyMedia(file: File, expectedType: 'image' | 'video' = 'image'): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB — max is 50MB.`)
  }

  if (!ALLOWED_TYPES[expectedType].includes(file.type)) {
    throw new UploadError(`"${file.name}" isn't a supported ${expectedType} file.`)
  }

  const supabase = createClient()
  const path = `${crypto.randomUUID()}-${safeFileName(file.name)}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) throw new UploadError(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
