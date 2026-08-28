# Lead Desk

Internal tool for turning surplus leads into pay-per-lead revenue. Replaces the
`leads@` email step: your team enters a lead once, it's automatically matched
against your contractor list by niche + zip, and each contractor gets their
own independent "claim" on that lead — so the same lead can be sold to
several contractors, not just one.

## How the workflow maps to what you do today

| Today | In this app |
|---|---|
| Call comes in, team writes it up, emails leads@ | Team fills out the "New lead" form |
| Team pulls a list of ~20 contractors for that area/niche | App auto-matches up to 5 active contractors by niche + zip |
| CallRail texts them "want this lead?" | Still CallRail — nothing changes here in v1 |
| Contractor replies "yes" | Team clicks **Mark interested** on that contractor's row |
| First 2 leads are free to build trust | App tracks this automatically per contractor — free trial unlocks instantly and texts the full info right away |
| After that, you set up a flat monthly deal | After the free leads, marking interested generates a **Square payment link** to send them |
| Someone eventually notices payment and sends the info | **The moment Square confirms payment, a webhook fires and texts the contractor the full lead info automatically** — no one on your team has to notice or act |


Two contractors can independently be marked interested, pay, and get the
same lead's full info — that's the point. The lead itself never changes;
what changes is each contractor's own claim on it.

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma** — ships configured for SQLite (zero setup for local dev/testing).
  Swap `DATABASE_URL` to a Postgres connection string (Supabase, Neon, Railway)
  for production — Prisma's schema doesn't need to change, just the provider
  in `prisma/schema.prisma` from `sqlite` to `postgresql`.
- **Square Payment Links** for payment, **Square webhooks** to detect payment
  and auto-unlock the lead
- **Tailwind** for styling
- Auth is a single shared team password (see below) — enough for a small
  internal team to start; swap for real per-user accounts later using the
  `User` table already in the schema.

## Local setup

```bash
npm install
cp .env.example .env   # then fill in real values
npx prisma migrate dev --name init
npm run seed            # optional: adds 3 example contractors + 1 lead
npm run dev
```

Open http://localhost:3000 — log in with the `TEAM_PASSWORD` you set in `.env`.

### Environment variables (`.env`)

- `DATABASE_URL` — `file:./dev.db` for local SQLite, or a `postgresql://...`
  URL for production
- `TEAM_PASSWORD` — the shared password your team uses to log in
- `SESSION_SECRET` — any long random string, used to sign the login cookie
- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` / `SQUARE_WEBHOOK_SIGNATURE_KEY` —
  from your Square Developer dashboard
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` — from your Twilio console
- `TWILIO_FROM_NUMBER` — last-resort fallback number, only used if the
  `/numbers` pool is empty or has no default set (see below)
- `APP_URL` — your deployed URL (Square's webhook signature check needs this
  to match exactly)

## Square webhook setup — this is the core automatic-delivery trigger

Square needs to reach `/api/square/webhook` to tell the app a payment
cleared. This is what makes delivery instant: the webhook fires, the app
immediately texts the contractor the full lead (name, phone, email,
address, job details) via Twilio, and marks the claim "delivered" — no
one on your team has to notice a payment came in. The exact same
automatic text fires when a contractor uses one of their free trial
leads (see `lib/deliver.ts`), so free and paid leads both arrive
instantly.

In the Square Developer dashboard, under your app's **Webhooks**
section, add a subscription pointing at
`https://yourdomain.com/api/square/webhook`, subscribed to the
`payment.updated` event. Square gives you a **Signature Key** when you
create it — copy that into `SQUARE_WEBHOOK_SIGNATURE_KEY`.

Square doesn't have a local forwarding CLI as smooth as Stripe's — the
easiest way to test locally is to deploy to Vercel first (even before
things are fully polished) and point the webhook at that URL, or use a
tunneling tool like `ngrok` to expose `localhost:3000` temporarily.

**If the automatic text fails** (bad number, Twilio outage, etc.) — the
payment is never lost; the claim is marked "paid" with the error visible
on the lead page, and your team gets a "Retry" button to resend it once
the issue's fixed.

## Territories

Manage territories at `/territories`. A territory is a niche + set of
zip codes with one phone number assigned to it — e.g. "South Florida
Roofing" covers zips 33101/33130/33133 for roofing and sends from a
305 number. Every lead that falls in a territory's niche and zips gets
delivered from that same number, so contractors in that territory
learn to recognize it. Add territories as you need them — nothing is
pre-filled. If a lead doesn't match any territory, delivery falls back
to whichever territory is marked "default," and if there's no default
either, to `TWILIO_FROM_NUMBER` so delivery never just breaks — but
you'll want at least a default territory set before going live with
real contractors.

## Deploying

The fastest path: **Vercel** (hosting) + **Supabase or Neon** (Postgres).

1. Push this repo to GitHub, import it into Vercel.
2. Create a free Postgres database on Supabase/Neon, copy the connection
   string into `DATABASE_URL` in Vercel's project settings.
3. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
4. Add the rest of the env vars from `.env.example` in Vercel's dashboard.
5. Run `npx prisma migrate deploy` once against the production database
   (or let Vercel's build do it — add `prisma migrate deploy &&` to the
   `build` script if you want migrations to run automatically on deploy).
6. Point the Square webhook at your live domain.
7. Vercel picks up `vercel.json`'s cron config automatically (weekly, Monday
   1pm UTC by default — change the schedule string there if you want a
   different cadence). Set `CRON_SECRET` in Vercel's env vars; Vercel sends
   it automatically as the `Authorization: Bearer` header on scheduled runs.

## Discovering contractors (Google Places)

At `/territories`, each territory has a **Run discovery** button. It runs a
Places API text search ("roofing contractors in 33101") for every niche +
zip in that territory, skips anything that's already a real contractor or
already in the review queue, and adds new candidates to `/discovered` for
your team to approve or reject. Approving one creates a real Contractor
with that territory's niches and zips already filled in.

The cron job (`/api/cron/discover`) re-runs this for every active
territory on a schedule so the list stays current without anyone
remembering to click the button — see the Vercel cron note above.

Note: this uses the official **Google Places API**, not scraping the Maps
website directly — scraping Google's site violates their terms of service
and risks getting blocked. The Places API is the supported way to get the
same data (business name, phone, address) and has its own pricing — check
Google's current rates before running it across many territories on a
tight schedule.

## What's intentionally left for v2

- **Auto-parsing the leads@ inbox** instead of manual entry — straightforward
  to add once the manual flow is proven (an email-to-webhook service like
  Postmark/SendGrid inbound parse would post straight into `/api/leads`).
- **Native SMS for the opt-in text too** ("want this lead?"), if you ever
  want to drop CallRail entirely — e.g. moving to Go High Level, which can
  run that outbound blast and call a webhook back into this app instead of
  requiring the "Mark interested" click. The automatic-delivery half of
  that pipeline (payment → instant text) is already built; this would
  just replace the manual first step with another automated one.
- **Per-user logins** instead of one shared password, using the `User` table
  already in the schema.
- **Declined-lead re-offer** — if you want the 4th/5th contractor to only
  hear about a lead after someone earlier declines, that's a small change to
  `matchContractors`.

## Project structure

```
app/
  page.tsx                 Leads dashboard
  leads/new/page.tsx        New lead form
  leads/[id]/page.tsx        Lead detail: teaser/full text + contractor claims
  contractors/               Contractor list, add, detail + history
  territories/                Manage niche+zip -> phone number assignments
  discovered/                  Review queue for Places-discovered contractors
  api/
    leads/                    Create + fetch leads, auto-matches contractors
    contractors/               Create + fetch contractors
    territories/[id]/discover/  Manually trigger a Places search for a territory
    discovered/[id]/approve/     Turn a candidate into a real contractor
    discovered/[id]/reject/       Dismiss a candidate
    cron/discover/                 Scheduled re-run across all active territories
    claims/[id]/interest/       Mark interested -> free unlock or Square link
    claims/[id]/decline/         Mark declined
    claims/[id]/redeliver/        Retry an automatic text that failed to send
    square/webhook/              Confirms payment, unlocks the claim
    auth/                        Shared-password login/logout
prisma/schema.prisma        Lead, Contractor, Territory, Claim, DiscoveredContractor, User models
lib/                         db, auth, square, deliver, territories, googlePlaces, discovery, contractor-matching
```

