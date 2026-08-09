# BRAIN.md — Persistent Context for the Build Agent

> This file is the single source of truth the coding AI (Claude / Antigravity) should re-read before starting any task in this project. It captures **what has been built**, **how things work**, and **conventions** — so there's no need to re-analyze every file.

---

## 1. Project Identity
- **Product:** Roofmint — AI-first real estate listing & discovery platform
- **Tagline:** "AI finds. You decide. Perfect Home."
- **Primary users:** Property seekers (public mobile-first app), Admin (agency ops — `/admin` route)
- **Non-negotiable rule:** Agent/broker identity and contact details are CONFIDENTIAL. They must never appear in any public API response, client-side bundle, or unauthenticated query.

## 2. Tech Stack
- **Framework:** Next.js 16.3 (App Router, Turbopack)
- **Styling:** Tailwind CSS v3.4 + shadcn/ui components + `tailwindcss-animate`
- **Fonts:** Poppins (primary) + Inter (secondary) via Google Fonts CDN
- **Backend:** Supabase (Postgres, Auth, Storage, RLS)
- **AI:** Claude API via Vercel AI SDK (`@ai-sdk/anthropic`, `@ai-sdk/google`, `ai` package)
- **Language:** TypeScript (strict mode)

## 3. Color System & Theme
The app uses a custom teal/navy color palette defined in `globals.css` CSS variables:
- **Primary:** `#0D9488` (teal-600) — buttons, badges, active states
- **Foreground:** `#0F172A` (navy-900) — headings, dark text
- **Background:** `#F8FAFC` (slate-50) — page background
- **Cards:** `#FFFFFF` with `shadow-card` elevation
- **Accent:** `#F0FDFA` (teal-50) — highlight backgrounds
- **Muted text:** `#64748B` (slate-500)

Custom Tailwind colors `teal.*` and `navy.*` are defined in `tailwind.config.ts`.

## 4. Design Screens Reference
All 8 design screens are in `roofmint-ui-screens/`. They define the target mobile-first UI:

| Screen | File | Implemented Page |
|--------|------|-----------------|
| Screen 1 — Login | `page-0001.jpg` | `src/app/login/page.tsx` ✅ |
| Screen 2 — Sign Up | `page-0002.jpg` | `src/app/signup/page.tsx` ✅ |
| Screen 3 — Onboarding Choice | `page-0003.jpg` | `src/app/(client)/onboarding/page.tsx` ✅ |
| Screen 4 — AI Questionnaire | `page-0004.jpg` | `src/app/(client)/onboarding/ai/page.tsx` ✅ |
| Screen 5 — AI Results | `page-0005.jpg` | `src/app/(client)/ai-results/page.tsx` ✅ |
| Screen 6 — Property Detail | `page-0006.jpg` | `src/app/(client)/properties/[slug]/page.tsx` ✅ |
| Screen 7 — Home/Feed | `page-0007.jpg` | `src/app/(client)/page.tsx` ✅ |
| Screen 8 — Profile | `page-0008.jpg` | `src/app/(client)/profile/page.tsx` ✅ |

## 5. Assets
All illustration assets are in `assests/` (note: folder has a typo, keep as-is):
- `assests/logo.png` — Roofmint logo (navy "roof" + teal "mint" with house icon)
- `assests/illustrations/home1.png` — City skyline with house (used on Login)
- `assests/illustrations/home2.png` — House with AI magnifying glass (used on Onboarding)
- `assests/illustrations/home3.png` — House with sparkle magnifying glass
- `assests/illustrations/roofmintai.png` — AI robot mascot (teal, cute, 3D style)

Copies are served from `public/images/` for Next.js Image optimization:
- `public/images/logo.png`, `home1.png`, `home2.png`, `home3.png`, `roofmintai.png`
- `public/images/property1.png`, `property2.png`, `property3.png` — Generated demo property photos

## 6. File Structure (Key Files)

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Poppins font, SEO metadata)
│   ├── globals.css             # Theme variables, custom animations, utilities
│   ├── login/page.tsx          # Login page (client component, no auth wired yet)
│   ├── signup/page.tsx         # Sign up page (client component, no auth wired yet)
│   ├── api/chat/route.ts       # AI chat API endpoint
│   ├── admin/                  # Admin panel routes
│   └── (client)/
│       ├── layout.tsx          # Mobile shell — top bar (location) + bottom nav (5 tabs)
│       ├── page.tsx            # Home/Property Feed with demo cards
│       ├── search/page.tsx     # Search page with trending areas
│       ├── saved/page.tsx      # Saved properties (local state)
│       ├── enquiries/page.tsx  # Enquiries history
│       ├── profile/page.tsx    # Profile with stats, menu, preferences
│       ├── onboarding/
│       │   ├── page.tsx        # AI vs Browse mode choice
│       │   └── ai/page.tsx     # 8-step AI questionnaire
│       ├── ai-results/page.tsx # AI-matched property results
│       └── properties/
│           └── [slug]/page.tsx # Property detail (demo data fallback)
├── components/
│   ├── chat-interface.tsx      # AI chat widget (uses @ai-sdk/react)
│   ├── enquiry-form.tsx        # Property enquiry form
│   └── ui/                    # shadcn/ui components (button, card, badge, etc.)
├── lib/utils.ts               # cn() utility
└── utils/supabase/
    ├── server.ts              # Server-side Supabase client
    ├── client.ts              # Browser-side Supabase client
    └── middleware.ts          # Auth session middleware
```

## 7. Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://xdkuomnaxflviwbryadz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wlZ1Xxck_fjWzUs6kIkIUQ_yMkF141y
```
**Important:** The variable must be `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not `PUBLISHABLE_KEY`). The Supabase client library throws a runtime error if this is wrong.

## 8. Implementation Status

### ✅ Completed
- **Theme & Foundation:** globals.css, tailwind.config.ts, root layout with Poppins font
- **Client Layout:** Mobile-first shell with top bar (location selector, map/filter buttons) and 5-tab bottom navigation (Home, Search, Saved, Enquiries, Profile)
- **Login Page (Screen 1):** Logo, skyline illustration, email/password with icons, social login (Google/Facebook), trust badges
- **Sign Up Page (Screen 2):** 5-field form, terms checkbox, social login, trust badges
- **Onboarding Choice (Screen 3):** AI Mode (recommended) vs Browse radio cards, continue button
- **AI Questionnaire (Screen 4):** 8-step wizard with progress bar, AI chat bubble, grid option selection, text input, navigation
- **AI Results (Screen 5):** Filter chips, info banner, property cards ranked by AI match %, refine/map buttons
- **Property Detail (Screen 6):** Image gallery + thumbnails, AI match badge, specs grid, highlight tags, about section, top highlights grid, location advantage, sticky Enquire Now + WhatsApp bottom bar
- **Home/Feed (Screen 7):** Filter chips, verified properties info bar, property cards (image left + details right), AI search banner
- **Profile (Screen 8):** Avatar, stats grid, settings menu, current preferences, logout
- **Search Page:** Search bar, recent/popular searches, trending areas grid, AI search banner
- **Saved Page:** Property cards with remove button, empty state
- **Enquiries Page:** Enquiry cards with status badges
- **Supabase env fix:** Corrected variable names across all files
- **Asset pipeline:** All illustrations copied to public/images, 3 generated property photos

### 🔲 Not Yet Implemented
- **Supabase Auth integration:** Login/signup forms are client-side only; actual Supabase `signInWithPassword` / `signUp` not wired
- **Social Login:** Google/Facebook OAuth not configured
- **Real property data:** Pages use hardcoded demo data; Supabase query integration exists in old code but needs reconnection
- **Admin panel:** Exists at `/admin` but not updated to new design
- **AI Chat:** `chat-interface.tsx` and `api/chat/route.ts` exist from previous work, not integrated into new UI flow
- **Image uploads / Supabase Storage:** Not implemented
- **Dark mode:** Theme variables exist but all current pages use light-mode-only classes
- **Property media gallery:** Detail page uses static images, no real gallery/swipe

## 9. Working Conventions
- **Mobile-first, always.** Max-width `480px` container centered on desktop. Every component designed for 375px+ viewport.
- **No fabricated data.** Demo data is clearly labeled; once Supabase has real listings, swap in.
- **Confidentiality:** Agent/broker details never exposed publicly.
- **Component reuse:** Property card pattern is repeated across home/saved/ai-results — extract to shared component when refactoring.
- **Animations:** `stagger-children` class on parent, `animate-fadeInUp` for entrance. Custom keyframes in globals.css.

## 10. Known Issues & Decisions
- `assests/` folder has a typo (should be "assets") — keep as-is to avoid breaking references
- Next.js 16 deprecated `middleware` in favor of `proxy` — migration not done yet
- `tw-animate-css` package is installed but its `@import` was removed from globals.css to fix a CSS parse error
- `searchParams` in login page should use `Promise<{}>` pattern for Next.js 16 compatibility
- Container max-width is `480px` for mobile-first; desktop scaling needs design decision
