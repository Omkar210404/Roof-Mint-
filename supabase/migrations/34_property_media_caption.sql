-- Photos had no way to say what room they show — an admin uploading
-- "MASTER BEDROOM.HEIC" had no way to carry that name through to what a
-- site visitor actually sees, since only the URL was ever stored.
alter table property_media add column if not exists caption text;
