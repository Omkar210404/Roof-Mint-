# PRD.md — Real Estate Lead Generation Platform

## 1. Product Vision
A two-sided real estate marketing platform that helps **agencies/builders/brokers** list properties professionally and convert website traffic into **qualified leads**, while giving **property seekers** a fast, AI-guided, mobile-first way to discover properties that match their intent — without endless manual filtering.

The core value exchange:
- **Broker/Builder side:** get high-intent leads with full context (property + enquirer + confidential agent mapping) in one dashboard.
- **Buyer/Tenant side:** describe what you want in plain language to an AI concierge, get 3–5 accurately matched properties instead of scrolling 200 listings.

## 2. Target Users

| User | Role | Core Need |
|---|---|---|
| **Admin (You / Agency Ops)** | Manages all listings, agents, leads | Full control panel, confidentiality of agent data, clean lead pipeline |
| **Broker / Builder (Lead recipient)** | Indirect user — receives leads via admin | Wants qualified, ready-to-close leads, not spam |
| **Property Seeker (Buyer/Tenant/Investor)** | End consumer on public site | Wants fast, relevant, low-effort discovery + trust signals (photos, videos, RERA, verified) |

## 3. Problem Statement
Most local real estate sites are either (a) static brochures with no lead intelligence, or (b) generic portals (99acres/MagicBricks/Housing) where individual brokers/builders get buried and can't control branding or lead quality. There's no lightweight, brandable, AI-assisted listing + lead engine built for a single agency managing multiple builder/broker relationships.

## 4. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Convert visitors → enquiries | Enquiry conversion rate (target >4-5% of sessions) |
| Speed to lead handoff | Time from enquiry submitted → visible in admin lead panel (< 1 min, real-time) |
| Match quality | % of AI-suggested properties that get a "view details" click |
| Agent/lead confidentiality | Zero agent PII leakage to public/client-side |
| Mobile usability | >70% of traffic mobile, bounce rate < 40% on property detail pages |
| Repeat engagement | % of users who star a property or return within 7 days |

## 5. Feature Set

### 5.1 Admin Panel (internal, authenticated, role-based)
- **Property CRUD**
  - Images (multi-upload, reorder, cover image), videos (upload or YouTube/Instagram embed links)
  - Location (address + map pin/geocode), carpet area, built-up area, price, price type (fixed/negotiable/starting from)
  - Nearby places (schools, hospitals, metro, highway — tagged categories with distance)
  - Property demand tag (Hot / Moderate / Low) — manually set or auto-derived from enquiry volume
  - Amenities (checklist + custom add: gym, pool, parking, power backup, security, clubhouse, etc.)
  - Property type (Apartment/Villa/Plot/Commercial/Office), BHK config, furnishing status
  - RERA registration number (India-specific trust signal)
  - Status toggle: **Available / Sold / On Hold / Coming Soon**
- **Agent Management (confidential)**
  - Agent/broker/builder name, phone, email, company, commission notes
  - **Visible only to Admin role** — never exposed via public API/client bundle (enforced at DB row-level security, not just UI hiding)
  - Each property mapped to one primary agent (+ optional co-agent)
- **Enquiry / Lead Management**
  - Table view: Property details | Enquirer details (name, phone, email, message, budget) | Mapped agent details | Timestamp | Status
  - Lead status pipeline: **New → Contacted → Follow-up → Site Visit Scheduled → Closed-Won → Closed-Lost** (not just a flag — brokers need this for CRM hygiene)
  - Filter/search by property, agent, date range, status
  - Export to CSV / push to WhatsApp / email digest to broker
- **Dashboard/Analytics**
  - Views per property, enquiry-to-view ratio, top-performing properties, lead source breakdown
- **Admin activity log** (who changed what status, when — accountability if multiple admins)

### 5.2 Client-Facing Website (public, mobile-first)
- **AI Chatbot-first discovery (landing experience)**
  - Conversational intake: budget range, preferred location(s), BHK/type, must-have amenities, purpose (self-use/investment/rental)
  - Renders as interactive **cards** during conversation (quick-select chips for location, price slider, property type icons) — not just free text, to reduce typing friction on mobile
  - AI parses intent → applies structured filters → ranks/sorts inventory → returns top matches with a short "why this matches" explanation
  - Fallback: users can skip chat and go straight to manual filter/search browse mode
- **Property Listing & Detail Pages**
  - Grid/list view with cover image, price, location, BHK, status badge
  - Detail page: photo gallery (lightbox), embedded videos/YouTube, map with nearby places, amenities grid, price & area breakdown, similar properties carousel
  - "Enquire Now" → opens short form (name, phone, email, message) → on submit shows confirmation: *"Thanks! Our team will reach out within 24 hours."*
- **User Account Features**
  - OAuth login (Google, optionally Apple) via Supabase Auth
  - Profile page (saved searches, contact prefs)
  - **Starred/Wishlist properties**
  - **Notifications** — price drop on starred property, status change (e.g., "Sold" on a starred property), new property matching saved search
  - Dark mode (system-aware + manual toggle)
- **Trust & Conversion Elements**
  - RERA badge, verified listing badge, testimonials section, "X people enquired this week" (demand signal — only if real, never fabricated)

## 6. Key User Stories
- As a **property seeker**, I tell the chatbot my budget and area once, and I don't have to manually apply 6 filters.
- As a **property seeker**, I can star a property and get notified if its price drops or it's marked sold.
- As an **admin**, I can see exactly which agent a lead should go to without that agent's info ever being public.
- As an **admin**, I can mark a property "Sold" in two taps and it disappears from active search but stays in history.
- As a **broker**, I receive a clean lead packet (property + buyer intent + contact) instead of a raw phone number with no context.

## 7. Non-Functional Requirements
- Mobile-first responsive design (design at 375px width first)
- Page load < 2.5s on 4G for listing pages (image optimization, lazy load, CDN)
- Row-Level Security on Supabase for agent-confidential data and per-user starred/profile data
- Enquiry form spam protection (rate limiting + honeypot/captcha)
- SEO: server-rendered/ISR property detail pages, structured data (schema.org RealEstateListing), clean slugs
- Accessibility: WCAG AA color contrast, especially given dark mode

## 8. Out of Scope (v1)
- Payment/booking-token collection (leads only, not transactions)
- Full CRM (kept as a clean lead export/integration point instead)
- Multi-tenant white-label for other agencies (single-agency v1)
