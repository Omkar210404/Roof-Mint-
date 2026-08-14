-- ============================================================================
-- ROOFMINT — Storage RLS for direct property image/video uploads
-- Run this in your Supabase SQL Editor, THEN run:  NOTIFY pgrst, 'reload schema';
--
-- The `property-media` bucket was already created (public read, 50MB/file
-- limit — this project's plan caps individual storage objects at 50MB).
-- Uploads happen directly from the admin's browser to Supabase Storage
-- (not through a Next.js server action — Vercel's serverless functions cap
-- request bodies well under what a property video needs), so the browser's
-- own session needs write permission here, gated to admins only.
-- ============================================================================

drop policy if exists "property_media_admin_insert" on storage.objects;
create policy "property_media_admin_insert" on storage.objects for insert
  with check (bucket_id = 'property-media' and is_admin());

drop policy if exists "property_media_admin_update" on storage.objects;
create policy "property_media_admin_update" on storage.objects for update
  using (bucket_id = 'property-media' and is_admin());

drop policy if exists "property_media_admin_delete" on storage.objects;
create policy "property_media_admin_delete" on storage.objects for delete
  using (bucket_id = 'property-media' and is_admin());
