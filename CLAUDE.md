# File.md — CareSync Project Memory

> This file is read by Claude Code at the start of every session.
> Always read this before writing any code.

---

## What Is CareSync?
CareSync is a UK-based residential care home management platform replacing all paper processes — MAR charts, stock checks, task boards, fire safety logs, visitor books, and monthly file uploads — with one unified digital system.

- **20 service users (clients)**
- **2 daily shifts:** AM (08:00–16:00) · PM (14:00–22:00)
- **Overlap window:** 14:00–16:00 (digital handover)
- **UK regulated:** CQC, GDPR, 8-year data retention

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS (Vite) |
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| PDF | react-pdf |
| Hosting | Vercel + Supabase |

---

## User Roles
| Role | What They Can Do |
|------|-----------------|
| `staff` | MAR, Tasks, Visitor Log, Fire Safety |
| `supervisor` | All staff + approve entries + alerts |
| `manager` | Everything + dashboard + reports + user mgmt |
| `readonly` | View only (CQC inspectors) |

---

## The 6 Modules
1. **Digital MAR** — medication administration record (CRITICAL — build first)
2. **Stock Manager** — auto-deduct + low stock alerts
3. **Task Board** — shift checklists + handover notes
4. **Fire Safety Log** — digital checks + CQC export
5. **Visitor Log** — digital sign-in/out
6. **Manager Dashboard** — live stats + monthly PDF reports

---

## Core Rules — Never Break These
- **Never hard delete clinical records** — always soft delete (is_active = false)
- **Every write includes user ID + timestamp** — full audit trail
- **Role check on every API endpoint** — never trust the frontend
- **MAR entries are append-only** — no editing past entries
- **Stock auto-deducts on every "given" MAR entry**
- **Supabase EU region only** — UK GDPR compliance

---

## UI Rules
- Mobile-first — designed for tablets
- Tap targets minimum 44px (staff may wear gloves)
- Color system: 🟢 given · 🔴 refused · 🟡 pending/alert · 🔵 info
- Maximum 3 taps to complete a medication entry
- High contrast — readable in bright or dim lighting

---

## Current Build Status
- [x] Supabase schema + migrations
- [x] Auth + role-based routing
- [x] Module 1 — Digital MAR
- [x] Module 2 — Stock Manager
- [x] Module 3 — Task Board
- [x] Module 4 — Fire Safety Log
- [x] Module 5 — Visitor Log
- [x] Module 6 — Manager Dashboard
- [x] Service Users (Clients) management
- [x] Staff management
- [x] PWA — vite-plugin-pwa, manifest, Workbox service worker, offline MAR cache
- [x] Playwright E2E test suite (11 spec files, all modules covered)

---

## Reference Files
- `careflow-visual.html` — full visual wireframe and workflow diagram
- `MASTER_PROMPT.md` — full database schema and module specs
- `supabase/migrations/` — all SQL migrations

---

## Key Decisions Already Made
- App name: **CareSync**
- No native mobile app — PWA (Progressive Web App) for offline MAR support
- No third-party pharmacy integration in v1 — manual stock management only
- Reports in PDF format using react-pdf
- PIN login supported alongside email for quick staff access on shared tablets
