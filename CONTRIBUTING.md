# Contributing to CareSync

Thanks for being here. CareSync is an attempt to build the open-source care management system that UK residential care doesn't have yet, and it genuinely needs more hands than mine. Whether you write code, work in care, or just got the dev environment running and found the instructions confusing — there's a way to help.

## Ways to contribute (no code required)

- **Report bugs** — use the bug report template. "This felt awkward on a tablet" counts.
- **Share care expertise** — if you work in care and something in the app doesn't match how a real shift works, that's exactly the feedback code can't provide. Open an issue.
- **Improve docs** — if you got stuck setting up, a PR that fixes the instructions is the best first contribution there is.
- **Test on real hardware** — the target device is a shared tablet, often used with gloves. Reports from actual tablets are gold.

## Getting set up

Follow the [Getting started](README.md#getting-started) section of the README. The short version: Node 18+, a free Supabase project in an **EU region**, run the migrations in order, copy the `.env.example` files to `.env` with your own keys.

If any step doesn't work as written, that's a bug in the docs — please say so.

## Making changes

1. **For anything bigger than a small fix, open an issue first** so we can talk it through before you invest time.
2. Fork the repo and branch from `main`: `git checkout -b fix/short-description`
3. Make your change. Try to match the style of the surrounding code rather than introducing new patterns.
4. Check it passes:
   ```bash
   cd frontend
   npm run lint
   npm test        # Playwright E2E suite
   ```
5. Open a PR — the template will ask what changed and how you tested it.

I try to respond to PRs within a few days. Small, focused PRs get reviewed much faster than big ones — if your change grew, consider splitting it.

## The rules that can't be broken

CareSync handles clinical records, so these are hard constraints, not preferences. PRs that break them won't be merged regardless of quality:

1. **Never hard-delete clinical records.** Soft delete only (`is_active = false`). UK care records must be kept for 8 years.
2. **MAR entries are append-only.** Corrections are new entries, never edits.
3. **Every write carries a user ID and timestamp.** The audit trail is the point.
4. **Role checks happen on the API.** The frontend check is UX; the backend check is security. Every new endpoint needs one.
5. **Stock deducts automatically when a med is recorded as given.** These two actions must stay atomic.
6. **Supabase stays in the EU region.** UK GDPR is not optional.

## UI conventions

- Mobile-first — design for a tablet, verify on a narrow viewport
- Tap targets **at least 44px** (staff may be wearing gloves)
- Colours have fixed meanings: 🟢 given · 🔴 refused · 🟡 pending/alert · 🔵 info — don't repurpose them
- A medication entry must never take more than 3 taps
- High contrast — the app is used in bright lounges and dim corridors

## Domain glossary

You don't need a care background to contribute, but these come up a lot:

| Term | Meaning |
|------|---------|
| MAR | Medication Administration Record — the legal record of every dose given, refused or missed |
| eMAR | Electronic MAR (what our Module 1 is) |
| PRN | "As needed" medication (from Latin *pro re nata*) |
| CQC | Care Quality Commission — the English care regulator that inspects homes |
| CD | Controlled Drug — medications with stricter legal handling (double signatures, separate register) |
| Service user / client | The person living in the home |
| Handover | The AM→PM shift overlap (14:00–16:00) where outgoing staff brief incoming staff |
| DSCR | Digital Social Care Record — NHS England's term for systems like this |

If a term in the code confuses you, ask in an issue — explaining it usually improves the code anyway.

## Security issues

Never report vulnerabilities in public issues. See [SECURITY.md](SECURITY.md).

## A note on test data

Never put real resident or staff information in issues, PRs, screenshots, seed files or tests. The seed script's fictional users (Alice Nurse and friends) exist for exactly this reason.
