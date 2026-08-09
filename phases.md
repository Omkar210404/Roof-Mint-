# PHASES.md — Execution Roadmap

## Phase 0: Foundation (Week 1)
- Repo setup (Next.js 14, Tailwind, shadcn/ui), Supabase project init
- Auth setup: Google OAuth (users) + Admin login
- Database schema migration (all tables from architecture.md)
- RLS policies written and tested (especially agent confidentiality)
- Design system: color tokens, typography, dark mode variables

**Deliverable:** Empty but auth-working skeleton, schema live, design tokens locked.

## Phase 1: Admin Panel — Core (Week 2–3)
- Property CRUD form (all fields: location, area, price, amenities, nearby places, demand tag)
- Media upload (images + video URL embed handling for YouTube/Instagram)
- Agent management module (confidential, admin-only route + RLS verified)
- Property status toggle (Available/Sold/On Hold/Coming Soon)
- Admin property list view with search/filter

**Deliverable:** Admin can fully create and manage a listing end-to-end.

## Phase 2: Lead/Enquiry System (Week 3–4)
- Public enquiry form component (reusable) → writes to `enquiries`
- Admin lead inbox: realtime new-lead feed, property + enquirer + agent joined view
- Lead status pipeline (New → Contacted → ... → Closed)
- CSV export / basic email digest to broker
- Spam protection (rate limit + honeypot)

**Deliverable:** Full lead loop working: public enquiry → admin sees it instantly with agent context.

## Phase 3: Client Website Shell (Week 4–5)
- Mobile-first layout system, navigation, dark mode toggle
- Property listing (grid) + detail page (gallery, video embed, map, amenities, nearby places)
- Manual filter/search browse mode (fallback to chatbot)
- SEO basics: slugs, meta tags, schema.org markup

**Deliverable:** A fully browsable, good-looking property site (pre-AI).

## Phase 4: AI Chatbot Discovery (Week 5–7)
- `/api/chat` route with Claude API + tool-use filter extraction
- Chat UI: conversational cards for budget/location/type input (chips, sliders)
- Filter → query → ranked results → rendered as in-chat property cards
- Clarifying-question loop for incomplete input
- Optional: log chat sessions for demand analytics

**Deliverable:** AI-first landing experience live and matching correctly.

## Phase 5: User Accounts & Engagement (Week 7–8)
- Profile page, starred/wishlist properties
- Saved searches
- Notifications (status change, price drop, new match) — in-app first, then push/email
- Notification bell + realtime updates

**Deliverable:** Returning users have a reason to come back.

## Phase 6: Analytics, Polish, Hardening (Week 8–9)
- Admin dashboard: views/enquiry ratio, top properties, source breakdown
- Admin activity log
- Performance pass (image optimization, lazy loading, Lighthouse audit)
- Accessibility pass (contrast in dark mode, keyboard nav)
- Cross-device QA (mobile-first priority)

**Deliverable:** Production-ready, measurable, fast.

## Phase 7: Launch & Iterate (Week 9–10)
- Deploy to production (Vercel + Supabase)
- Seed real listings, onboard first broker/builder for lead handoff
- Set up WhatsApp Business API for instant lead alerts (stretch)
- Collect first-cohort feedback, iterate on chatbot matching accuracy

**Deliverable:** Live product generating real leads.

---
### Suggested sequencing logic
Admin panel and lead system come **before** the AI chatbot — you need real inventory and a working lead pipeline before the flashy discovery layer matters. Don't let the chatbot become the critical path for launch; it should be built once Phase 1–3 are stable, so you always have a fallback (manual browse) if AI matching underdelivers early on.
