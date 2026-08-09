-- Add listing_type and ownership columns to properties and profiles

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_type text DEFAULT 'Sale',
  ADD COLUMN IF NOT EXISTS ownership text DEFAULT '1st Owner';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pref_listing_type text,
  ADD COLUMN IF NOT EXISTS pref_ownership text;
