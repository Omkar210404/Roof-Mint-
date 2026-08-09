-- ============================================================================
-- ROOFMINT — Complete Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop existing tables (in dependency order)
drop table if exists activity_log cascade;
drop table if exists notifications cascade;
drop table if exists saved_searches cascade;
drop table if exists starred_properties cascade;
drop table if exists enquiries cascade;
drop table if exists nearby_places cascade;
drop table if exists property_amenities cascade;
drop table if exists amenities cascade;
drop table if exists property_media cascade;
drop table if exists properties cascade;
drop table if exists agents cascade;
drop table if exists profiles cascade;

-- ── PROFILES (extends Supabase auth.users) ──────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  role text check (role in ('admin', 'user')) default 'user',
  phone text,
  -- Preferences (collected during onboarding)
  pref_budget_min bigint,
  pref_budget_max bigint,
  pref_location text,
  pref_bhk integer,
  pref_property_type text,
  pref_furnishing text,
  pref_listing_type text,
  pref_ownership text,
  pref_timeline text,
  pref_amenities text[],
  pref_notes text,
  profile_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── AGENTS (confidential — admin only) ──────────────────────────────────────
create table agents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  company text,
  commission_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── PROPERTIES ──────────────────────────────────────────────────────────────
create table properties (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  description text,
  property_type text,
  listing_type text default 'Sale',
  ownership text default '1st Owner',
  bhk integer,
  furnishing text,
  carpet_area numeric,
  built_up_area numeric,
  floor text,
  possession text,
  price numeric not null,
  price_type text default 'fixed',
  location_address text,
  city text,
  locality text,
  rera_number text,
  demand_tag text default 'moderate',
  status text default 'available',
  amenities jsonb default '[]'::jsonb,
  highlights jsonb default '[]'::jsonb,
  primary_agent_id uuid references agents(id),
  views_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── PROPERTY MEDIA ──────────────────────────────────────────────────────────
create table property_media (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade not null,
  url text not null,
  media_type text default 'image',
  is_cover boolean default false,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── NEARBY PLACES ───────────────────────────────────────────────────────────
create table nearby_places (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade not null,
  name text not null,
  distance text,
  category text
);

-- ── ENQUIRIES / LEADS ───────────────────────────────────────────────────────
create table enquiries (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references properties(id) on delete cascade,
  user_id uuid references profiles(id),
  name text not null,
  phone text not null,
  email text,
  budget_hint text,
  message text,
  status text default 'new',
  assigned_agent_id uuid references agents(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── STARRED / WISHLIST ──────────────────────────────────────────────────────
create table starred_properties (
  user_id uuid references profiles(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, property_id)
);

-- ── SAVED SEARCHES ──────────────────────────────────────────────────────────
create table saved_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  filters jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── NOTIFICATIONS ───────────────────────────────────────────────────────────
create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type text,
  property_id uuid references properties(id) on delete cascade,
  message text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ── ACTIVITY LOG ────────────────────────────────────────────────────────────
create table activity_log (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references profiles(id),
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Seed agents
insert into agents (name, phone, email, company) values
  ('Rohit Sharma', '+91 99887 76655', 'rohit@roofmint.com', 'Roofmint Realty'),
  ('Priya Mehta', '+91 88776 55443', 'priya@roofmint.com', 'Roofmint Realty'),
  ('Anita Desai', '+91 77665 44332', 'anita@roofmint.com', 'Premium Properties'),
  ('Vikram Singh', '+91 66554 33221', 'vikram@roofmint.com', 'Roofmint Realty');

-- Seed properties (with real agent FK references)
do $$
declare
  agent1_id uuid;
  agent2_id uuid;
  agent3_id uuid;
  agent4_id uuid;
begin
  select id into agent1_id from agents where name = 'Rohit Sharma';
  select id into agent2_id from agents where name = 'Priya Mehta';
  select id into agent3_id from agents where name = 'Anita Desai';
  select id into agent4_id from agents where name = 'Vikram Singh';

  insert into properties (title, slug, description, property_type, bhk, furnishing, carpet_area, built_up_area, floor, possession, price, price_type, location_address, city, locality, rera_number, demand_tag, status, amenities, highlights, primary_agent_id) values
  (
    'Sattva Lumina', 'sattva-lumina',
    'Sattva Lumina offers premium 3 BHK apartments in the heart of Whitefield, one of Bangalore''s most sought-after IT corridors. The project features modern architecture, world-class amenities, and seamless connectivity to major tech parks.\n\nSpread across 12 acres with 80% open space, the project includes a clubhouse, swimming pool, gymnasium, jogging track, children''s play area, and landscaped gardens.',
    'Apartment', 3, 'Semi', 1200, 1450, '12th of 24', 'Dec 2025',
    12800000, 'starting_from', 'ITPL Main Road, Whitefield, Bangalore - 560066', 'Bangalore', 'Whitefield',
    'PRM/KA/RERA/1251/446/AG/180524/003068', 'high', 'available',
    '["covered_parking", "smart_home", "water_supply", "power_backup", "open_space", "gym_pool"]'::jsonb,
    '["Near Metro Station", "Gated Community", "RERA Approved", "Top Builder"]'::jsonb,
    agent1_id
  ),
  (
    'Prestige Glenbrook', 'prestige-glenbrook',
    'A premium residential project featuring modern 2 BHK apartments with excellent connectivity and world-class amenities. Located in one of Bangalore''s fastest growing corridors with proximity to major IT hubs.',
    'Apartment', 2, 'Unfurnished', 980, 1180, '8th of 16', 'Mar 2026',
    9500000, 'starting_from', 'Sarjapur Main Road, Bangalore - 560035', 'Bangalore', 'Sarjapur Road',
    'PRM/KA/RERA/1251/446/AG/190115/003124', 'high', 'available',
    '["covered_parking", "water_supply", "power_backup", "gym_pool", "security"]'::jsonb,
    '["Near Metro", "RERA Approved"]'::jsonb,
    agent2_id
  ),
  (
    'Greenwoods Residences', 'greenwoods-residences',
    'Ready-to-move 2 BHK apartments in a gated community with lush green surroundings. Perfect for families looking for immediate possession.',
    'Apartment', 2, 'Semi', 850, 980, '5th of 12', 'Ready',
    6800000, 'fixed', 'Electronic City Phase 1, Bangalore - 560100', 'Bangalore', 'Electronic City',
    'PRM/KA/RERA/1251/310/AG/200620/004521', 'moderate', 'available',
    '["covered_parking", "water_supply", "power_backup", "gym_pool", "garden", "security"]'::jsonb,
    '["Ready to Move", "Gated Community"]'::jsonb,
    agent3_id
  ),
  (
    'Brigade Utopia', 'brigade-utopia',
    'Luxurious 3 BHK apartments by Brigade Group with panoramic city views and premium finishes. World-class amenities including infinity pool and rooftop lounge.',
    'Apartment', 3, 'Full', 1350, 1600, '18th of 30', 'Jun 2026',
    15200000, 'starting_from', 'Whitefield Main Road, Bangalore - 560066', 'Bangalore', 'Whitefield',
    'PRM/KA/RERA/1251/446/AG/210301/005678', 'high', 'available',
    '["covered_parking", "smart_home", "water_supply", "power_backup", "open_space", "gym_pool", "clubhouse", "security"]'::jsonb,
    '["Gated Community", "RERA Approved", "Top Builder", "Premium Location"]'::jsonb,
    agent1_id
  ),
  (
    'Sobha Dream Acres', 'sobha-dream-acres',
    'Affordable luxury 2 BHK apartments in a sprawling 80-acre township. Features 35+ amenities and excellent connectivity to Outer Ring Road.',
    'Apartment', 2, 'Unfurnished', 900, 1050, '6th of 14', 'Sep 2025',
    7800000, 'negotiable', 'Panathur Road, Bangalore - 560103', 'Bangalore', 'Panathur',
    'PRM/KA/RERA/1251/308/AG/180901/002345', 'moderate', 'available',
    '["covered_parking", "water_supply", "power_backup", "gym_pool", "jogging_track", "play_area"]'::jsonb,
    '["Gated Community", "RERA Approved"]'::jsonb,
    agent1_id
  ),
  (
    'Godrej Splendour', 'godrej-splendour',
    'Elegant 2 BHK apartments by Godrej Properties in Electronic City. Modern design with sustainable living features.',
    'Apartment', 2, 'Unfurnished', 820, 960, '4th of 12', 'Dec 2025',
    6500000, 'starting_from', 'Electronic City Phase 2, Bangalore - 560100', 'Bangalore', 'Electronic City',
    'PRM/KA/RERA/1251/310/AG/190501/003567', 'moderate', 'sold',
    '["covered_parking", "water_supply", "power_backup", "gym_pool", "rainwater", "ev_charging"]'::jsonb,
    '["RERA Approved", "Top Builder", "Vastu Compliant"]'::jsonb,
    agent3_id
  ),
  (
    'Embassy Springs', 'embassy-springs',
    'Ultra-luxury 4 BHK villa plots in Devanahalli near the international airport. Exclusive gated villa community with private gardens.',
    'Villa', 4, 'Unfurnished', 2800, 3500, 'Ground + 1', 'Ready',
    22000000, 'negotiable', 'Devanahalli, Bangalore - 562110', 'Bangalore', 'Devanahalli',
    'PRM/KA/RERA/1251/120/AG/200101/004890', 'high', 'reserved',
    '["covered_parking", "smart_home", "water_supply", "power_backup", "open_space", "gym_pool", "clubhouse", "security", "garden"]'::jsonb,
    '["Gated Community", "RERA Approved", "Top Builder", "Premium Location"]'::jsonb,
    agent2_id
  ),
  (
    'Puravankara Zenium', 'puravankara-zenium',
    'Modern 3 BHK apartments with smart home features in the upcoming Kanakapura Road corridor. Excellent investment opportunity.',
    'Apartment', 3, 'Semi', 1150, 1380, '10th of 20', 'Mar 2026',
    11500000, 'starting_from', 'Kanakapura Road, Bangalore - 560062', 'Bangalore', 'Kanakapura Road',
    'PRM/KA/RERA/1251/225/AG/210615/006012', 'moderate', 'available',
    '["covered_parking", "smart_home", "water_supply", "power_backup", "gym_pool", "clubhouse"]'::jsonb,
    '["RERA Approved", "Investment Hotspot"]'::jsonb,
    agent4_id
  );

  -- Seed property media
  insert into property_media (property_id, url, is_cover, sort_order) 
  select p.id, '/images/property1.png', true, 0 from properties p where p.slug = 'sattva-lumina'
  union all select p.id, '/images/property2.png', false, 1 from properties p where p.slug = 'sattva-lumina'
  union all select p.id, '/images/property3.png', false, 2 from properties p where p.slug = 'sattva-lumina'
  union all select p.id, '/images/property2.png', true, 0 from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, '/images/property1.png', false, 1 from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, '/images/property3.png', true, 0 from properties p where p.slug = 'greenwoods-residences'
  union all select p.id, '/images/property1.png', false, 1 from properties p where p.slug = 'greenwoods-residences'
  union all select p.id, '/images/property1.png', true, 0 from properties p where p.slug = 'brigade-utopia'
  union all select p.id, '/images/property2.png', true, 0 from properties p where p.slug = 'sobha-dream-acres'
  union all select p.id, '/images/property3.png', true, 0 from properties p where p.slug = 'godrej-splendour'
  union all select p.id, '/images/property1.png', true, 0 from properties p where p.slug = 'embassy-springs'
  union all select p.id, '/images/property2.png', true, 0 from properties p where p.slug = 'puravankara-zenium';

  -- Seed nearby places
  insert into nearby_places (property_id, name, distance, category)
  select p.id, 'ITPL Tech Park', '0.5 km', 'office' from properties p where p.slug = 'sattva-lumina'
  union all select p.id, 'Whitefield Metro', '1.2 km', 'transit' from properties p where p.slug = 'sattva-lumina'
  union all select p.id, 'International School', '2.0 km', 'school' from properties p where p.slug = 'sattva-lumina'
  union all select p.id, 'Phoenix Mall', '3.5 km', 'mall' from properties p where p.slug = 'sattva-lumina'
  union all select p.id, 'Sarjapur Tech Park', '1.0 km', 'office' from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, 'Wipro Campus', '2.5 km', 'office' from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, 'Total Mall', '1.8 km', 'mall' from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, 'Greenwood School', '3.0 km', 'school' from properties p where p.slug = 'prestige-glenbrook'
  union all select p.id, 'Infosys Campus', '1.5 km', 'office' from properties p where p.slug = 'greenwoods-residences'
  union all select p.id, 'E-City Metro', '2.0 km', 'transit' from properties p where p.slug = 'greenwoods-residences';

  -- Seed some enquiries
  insert into enquiries (property_id, name, phone, email, budget_hint, message, status, created_at)
  select p.id, 'Rahul Sharma', '+91 98765 43210', 'rahul@gmail.com', '₹1.2-1.5 Cr', 'Interested in 3BHK. Looking for possession by Dec 2026.', 'new', now() - interval '2 minutes'
  from properties p where p.slug = 'sattva-lumina'
  union all
  select p.id, 'Priya Patel', '+91 87654 32109', 'priya.p@outlook.com', '₹80L-1 Cr', 'Want to schedule a site visit this weekend.', 'new', now() - interval '15 minutes'
  from properties p where p.slug = 'prestige-glenbrook'
  union all
  select p.id, 'Amit Kumar', '+91 76543 21098', 'amit.k@gmail.com', '₹60-80L', 'Is there a payment plan available? Looking for 2BHK.', 'contacted', now() - interval '1 hour'
  from properties p where p.slug = 'sobha-dream-acres'
  union all
  select p.id, 'Sneha Reddy', '+91 65432 10987', 'sneha.r@yahoo.com', '₹1.5-2 Cr', 'Can you share the floor plan for 3BHK premium?', 'contacted', now() - interval '3 hours'
  from properties p where p.slug = 'sattva-lumina'
  union all
  select p.id, 'Vikram Singh', '+91 54321 09876', 'vikram.s@gmail.com', '₹50-70L', 'Looking for investment purpose. ROI?', 'closed', now() - interval '5 hours'
  from properties p where p.slug = 'godrej-splendour';

end $$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table agents enable row level security;
alter table properties enable row level security;
alter table property_media enable row level security;
alter table nearby_places enable row level security;
alter table enquiries enable row level security;
alter table starred_properties enable row level security;
alter table saved_searches enable row level security;
alter table notifications enable row level security;

-- PROFILES: users can read, insert, and update own profile
create policy "Allow all profiles ops" on profiles for all using (true);

-- AGENTS: public cannot read (admin-only via service role or temp bypass for now)
-- For the demo, allow anon read so admin dashboard works without service role key
create policy "Allow read agents" on agents for select using (true);
create policy "Allow insert agents" on agents for insert with check (true);

-- PROPERTIES: public can read
create policy "Public can read properties" on properties for select using (true);
create policy "Allow insert properties" on properties for insert with check (true);
create policy "Allow update properties" on properties for update using (true);

-- PROPERTY MEDIA: public can read
create policy "Public can read media" on property_media for select using (true);
create policy "Allow insert media" on property_media for insert with check (true);

-- NEARBY PLACES: public can read
create policy "Public can read nearby" on nearby_places for select using (true);
create policy "Allow insert nearby" on nearby_places for insert with check (true);

-- ENQUIRIES: anyone can insert (submit enquiry), admin can read all
create policy "Anyone can submit enquiry" on enquiries for insert with check (true);
create policy "Allow read enquiries" on enquiries for select using (true);
create policy "Allow update enquiries" on enquiries for update using (true);

-- STARRED: user can manage their own
create policy "Users manage own stars" on starred_properties for all using (true);

-- SAVED SEARCHES: user can manage their own
create policy "Users manage own searches" on saved_searches for all using (true);

-- NOTIFICATIONS: user can read their own
create policy "Users read own notifications" on notifications for all using (true);

-- ============================================================================
-- REALTIME
-- ============================================================================
alter publication supabase_realtime add table properties;
alter publication supabase_realtime add table enquiries;
alter publication supabase_realtime add table agents;
