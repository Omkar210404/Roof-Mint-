# ARCHITECTURE.md — Real Estate Lead Generation Platform

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | Client site + Admin panel as separate route groups or separate app |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent design tokens; dark mode via `class` strategy |
| Animation | Framer Motion | Chat card transitions, page transitions |
| Backend/DB | Supabase (Postgres + Auth + Storage + Row Level Security) | Single source of truth, avoids a separate FastAPI unless AI logic gets heavy |
| Auth | Supabase Auth — Google OAuth for users, email/password (or magic link) for Admin | Roles enforced via `profiles.role` + RLS |
| Media storage | Supabase Storage (images/video thumbnails) + YouTube/Instagram embeds by URL (no re-hosting large video) | Keep raw video hosting off your infra cost |
| AI Chatbot | Claude API (Anthropic) via server route, tool-use/function-calling to emit structured filter JSON | Server-side only — never expose API key client-side |
| Notifications | Supabase Realtime / Edge Functions + Web Push (or simple in-app + email via Resend) | WhatsApp via WhatsApp Business Cloud API (Phase 2+) |
| Hosting | Vercel (Next.js) + Supabase Cloud | Matches your existing stack pattern (Qubitern, EkaFlow) |
| Maps | Mapbox or Google Maps Embed API | For location pin + nearby places |

> Note: A separate FastAPI service is optional. Recommend starting with Next.js API routes + Supabase directly — add FastAPI only if you need heavier server-side AI orchestration later (e.g. batch demand scoring, scraping comps).

## 2. High-Level System Flow

```
                          ┌────────────────────┐
                          │   Admin Panel (Next)│
                          │  /admin/*  (RBAC)   │
                          └─────────┬───────────┘
                                    │ CRUD (RLS: admin only)
                                    ▼
        ┌──────────────────────────────────────────────┐
        │                Supabase (Postgres)             │
        │  properties · agents · media · enquiries        │
        │  users/profiles · starred · notifications        │
        └───────────────┬─────────────────┬──────────────┘
                         │                 │
        Public read (RLS: no agent data)   │ Realtime insert
                         ▼                 ▼
        ┌───────────────────────┐  ┌──────────────────────┐
        │  Client Website (Next) │  │  Admin Lead Inbox      │
        │  AI Chat → Filters →   │  │  (realtime new leads)  │
        │  Listings → Detail →   │  └──────────────────────┘
        │  Enquiry Form          │
        └───────────┬────────────┘
                     │ tool-call (server route)
                     ▼
        ┌───────────────────────┐
        │  Claude API (chatbot)  │
        │  extracts structured   │
        │  filters from chat     │
        └───────────────────────┘
```

## 3. Database Schema (Supabase / Postgres)

```sql
-- USERS / PROFILES
profiles (
  id uuid pk references auth.users,
  full_name text,
  avatar_url text,
  role text check (role in ('admin','user')) default 'user',
  phone text,
  created_at timestamptz default now()
)

-- AGENTS (CONFIDENTIAL — admin-only RLS)
agents (
  id uuid pk default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  company text,
  commission_notes text,
  created_at timestamptz default now()
)

-- PROPERTIES
properties (
  id uuid pk default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  description text,
  property_type text, -- Apartment/Villa/Plot/Commercial/Office
  bhk int,
  furnishing text, -- Unfurnished/Semi/Full
  carpet_area numeric,
  built_up_area numeric,
  price numeric not null,
  price_type text, -- fixed/negotiable/starting_from
  location_address text,
  latitude numeric,
  longitude numeric,
  rera_number text,
  demand_tag text default 'moderate', -- hot/moderate/low
  status text default 'available', -- available/sold/on_hold/coming_soon
  primary_agent_id uuid references agents(id),
  co_agent_id uuid references agents(id),
  views_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)

-- MEDIA
property_media (
  id uuid pk default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  media_type text, -- image/video_youtube/video_instagram/video_upload
  url text not null,
  is_cover boolean default false,
  sort_order int default 0
)

-- AMENITIES (many-to-many)
amenities (id uuid pk, name text unique)
property_amenities (property_id uuid references properties(id), amenity_id uuid references amenities(id))

-- NEARBY PLACES
nearby_places (
  id uuid pk default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  category text, -- school/hospital/metro/highway/mall
  name text,
  distance_km numeric
)

-- ENQUIRIES / LEADS
enquiries (
  id uuid pk default gen_random_uuid(),
  property_id uuid references properties(id),
  user_id uuid references profiles(id), -- nullable if guest enquiry
  name text not null,
  phone text not null,
  email text,
  message text,
  budget_hint text,
  status text default 'new', -- new/contacted/follow_up/site_visit/closed_won/closed_lost
  created_at timestamptz default now()
)

-- STARRED / WISHLIST
starred_properties (
  user_id uuid references profiles(id),
  property_id uuid references properties(id),
  created_at timestamptz default now(),
  primary key (user_id, property_id)
)

-- NOTIFICATIONS
notifications (
  id uuid pk default gen_random_uuid(),
  user_id uuid references profiles(id),
  type text, -- price_drop/status_change/new_match
  property_id uuid references properties(id),
  message text,
  is_read boolean default false,
  created_at timestamptz default now()
)

-- SAVED SEARCHES (for "new match" notifications)
saved_searches (
  id uuid pk default gen_random_uuid(),
  user_id uuid references profiles(id),
  filters jsonb, -- {budget_min, budget_max, location, bhk, type...}
  created_at timestamptz default now()
)

-- ADMIN ACTIVITY LOG
activity_log (
  id uuid pk default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz default now()
)
```

### Row-Level Security (critical)
- `agents` table: **no public SELECT policy at all** — only accessible via service-role in admin server routes. Client bundle never queries this table directly.
- `properties`, `property_media`, `amenities`, `nearby_places`: public SELECT allowed, but any join to `agents` happens server-side only, stripped before response.
- `enquiries`: INSERT allowed for anyone (rate-limited); SELECT restricted to `role = 'admin'`.
- `starred_properties`, `notifications`, `saved_searches`: user can only access rows where `user_id = auth.uid()`.

## 4. AI Chatbot Architecture
1. User chats → message sent to a Next.js server route (`/api/chat`).
2. Server route calls Claude API with a system prompt defining a **tool** like `extract_filters(budget_min, budget_max, location, bhk, property_type, must_have_amenities, purpose)`.
3. Claude either asks a clarifying question (returned as text + suggested quick-reply chips) or calls the tool once it has enough signal.
4. On tool call, server runs a Postgres query against `properties` using the extracted filters, ranks by relevance + demand_tag + recency, returns top 5–8.
5. Frontend renders results as property cards inside the chat thread, plus a "See all matches" link to full filtered listing view.
6. Conversation state kept client-side (or in a `chat_sessions` table if you want persistence/analytics on what people are searching for — recommended, since it's valuable demand data for the admin dashboard).

## 5. Notifications Flow
- Property status/price change → Postgres trigger or Edge Function checks `starred_properties` and `saved_searches` → inserts row into `notifications` → Supabase Realtime pushes to subscribed client → in-app toast + notification bell badge.
- Optional: nightly Edge Function cron matches `saved_searches` against newly added properties.

## 6. Deployment
- Vercel for Next.js (client + admin, can be same repo with `/admin` route group protected by middleware checking `role=admin`, or split into two Vercel projects for stricter separation).
- Supabase Cloud project (single project, schema separated by RLS, not by DB).
- Environment secrets (Claude API key, Supabase service role key) — server-side only, never in client bundle.
