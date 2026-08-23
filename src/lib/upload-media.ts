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

// iPhones shoot photos as HEIC by default. No mainstream browser other than
// Safari can actually display a HEIC <img> — Chrome, Firefox, and Edge all
// just show a broken image — so this isn't a missing entry to add to
// ALLOWED_TYPES, the file has to become a JPEG before it's stored. iOS often
// reports an empty file.type for HEIC picked via the Photos picker, so the
// extension is checked too.
const HEIC_EXTENSION = /\.(heic|heif)$/i
const HEIC_TYPES = ['image/heic', 'image/heif']

async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!HEIC_TYPES.includes(file.type) && !HEIC_EXTENSION.test(file.name)) return file

  let heic2any: (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>
  try {
    heic2any = (await import('heic2any')).default
  } catch {
    throw new UploadError(`"${file.name}" is a HEIC photo and couldn't be converted — try exporting it as JPEG first.`)
  }

  try {
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const converted = Array.isArray(result) ? result[0] : result
    const newName = file.name.replace(HEIC_EXTENSION, '.jpg')
    return new File([converted], newName, { type: 'image/jpeg' })
  } catch {
    throw new UploadError(`"${file.name}" is a HEIC photo that couldn't be converted (it may be corrupted) — try exporting it as JPEG first.`)
  }
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
  if (expectedType === 'image') {
    file = await convertHeicIfNeeded(file)
  }

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
