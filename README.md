# CareSync

A digital management system for UK residential care homes. One app that replaces the paper MAR charts, stock sheets, task boards, fire safety logs and visitor books that care staff juggle every single shift.

I built this after seeing how much time care workers lose to paperwork — and how easy it is for a medication signature to get missed on a paper chart at 9pm when you're covering two floors. CareSync moves all of that onto a tablet, with a proper audit trail behind everything.

## What it does

- **Digital MAR** — medication administration records. Append-only, colour-coded (given / refused / pending), and designed so staff can record a med round in three taps or less.
- **Stock Manager** — medication stock auto-deducts every time a dose is recorded as given. Low stock triggers an alert before you actually run out.
- **Task Board** — shift checklists for AM and PM shifts, plus digital handover notes for the 2–4pm overlap.
- **Fire Safety Log** — weekly/monthly checks recorded digitally, exportable for CQC inspections.
- **Visitor Log** — sign-in/sign-out on the tablet by the door instead of the dog-eared visitor book.
- **Manager Dashboard** — live stats across the home and monthly PDF reports.

There's also client (service user) management, staff management, controlled drugs registers, support plans, capacity & consent records, and goal tracking.

It's a PWA rather than a native app, so it installs on the shared tablets and the MAR still works offline — important when the WiFi drops mid med round.

## Who it's for

Small residential care homes (this one runs a 20-bed home with two daily shifts). Four roles are built in:

| Role | Access |
|------|--------|
| Staff | MAR, tasks, visitor log, fire safety |
| Supervisor | Everything staff can do, plus approvals and alerts |
| Manager | Everything, plus dashboard, reports and user management |
| Read-only | View access for CQC inspectors |

Staff can log in with a PIN on shared tablets instead of typing an email every time.

## Tech stack

- **Frontend:** React 19 + Vite + Tailwind CSS, PWA via vite-plugin-pwa / Workbox
- **Backend:** Node.js + Express
- **Database & auth:** PostgreSQL and Supabase Auth (Supabase, EU region — this is a hard requirement for UK GDPR)
- **Testing:** Playwright end-to-end suite covering all modules
- **Hosting:** Vercel (frontend) + Railway (backend) + Supabase

## Getting started

You'll need Node 18+ and a free [Supabase](https://supabase.com) project (**pick an EU region**).

**1. Clone and install**

```bash
git clone https://github.com/<your-username>/caresync.git
cd caresync
cd frontend && npm install
cd ../backend && npm install
```

**2. Set up the database**

Run the SQL files in `supabase/migrations/` against your Supabase project, in numeric order (001 → 021). The Supabase dashboard SQL editor works fine for this. `009_seed.sql` gives you some demo data to play with.

**3. Configure environment variables**

Both apps have a `.env.example` — copy each to `.env` and fill in your own Supabase URL and keys:

```bash
cd frontend && cp .env.example .env
cd ../backend && cp .env.example .env
```

The Sentry variables are optional — leave them blank and error monitoring is just disabled.

**4. Run it**

```bash
# terminal 1 — backend on :3001
cd backend && npm run dev

# terminal 2 — frontend
cd frontend && npm run dev
```

**5. Tests**

```bash
cd frontend
npm test           # headless
npm run test:ui    # Playwright UI mode
```

## Contributing

I'd genuinely love help with this. I'm one person building something that care homes actually depend on, and more eyes on the code makes it safer for everyone.

Good places to start:

- **Bug reports** — if something looks wrong, open an issue. Even "this felt confusing on a tablet" is useful feedback.
- **Accessibility** — care staff use this in bright rooms, dim corridors, and sometimes wearing gloves. Anything that improves contrast, tap targets or readability is welcome.
- **Tests** — the Playwright suite covers all modules, but more edge cases are always good, especially around the offline MAR behaviour.
- **Docs** — if you got stuck setting the project up, a PR fixing the instructions is the best kind of contribution.

### How to contribute

1. Fork the repo and create a branch (`git checkout -b fix/whatever-you-are-fixing`)
2. Make your change
3. Run `npm run lint` and `npm test` in `frontend/`
4. Open a PR describing what you changed and why

If you're planning something bigger than a small fix, open an issue first so we can talk it through — saves you building something that can't be merged.

### The rules that can't be broken

This app handles clinical records, so a few things are non-negotiable no matter how neat the refactor:

- **Never hard-delete clinical records.** Everything is soft-deleted (`is_active = false`). We're legally required to keep records for 8 years.
- **MAR entries are append-only.** No editing past entries — corrections are new entries.
- **Every write carries a user ID and timestamp.** The audit trail is the whole point.
- **Role checks live on the API, not the frontend.** Never trust the client.
- **Stock deducts automatically when a med is recorded as given.** Don't decouple these.
- **Supabase stays in the EU region.** UK GDPR.

PRs that break any of these won't be merged, even if everything else about them is great.

### UI conventions

- Mobile-first — the target device is a shared tablet, not a laptop
- Tap targets at least 44px (gloves!)
- Colours mean things: 🟢 given · 🔴 refused · 🟡 pending/alert · 🔵 info
- A medication entry should never take more than 3 taps

## A note on the domain

You don't need to have worked in care to contribute, but a little context helps: **MAR** = Medication Administration Record, **CQC** = Care Quality Commission (the UK care regulator), **service user** = the person living in the home. If a term in the code doesn't make sense, ask in an issue — explaining it usually improves the code anyway.

## License

Not yet decided — if you want to use this for your own care home, get in touch first.
