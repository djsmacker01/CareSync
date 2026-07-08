# Security Policy

CareSync manages clinical records for vulnerable people. If you find a vulnerability, thank you for looking — and please report it privately.

## Reporting a vulnerability

**Please do not open a public issue.** Instead, use GitHub's private vulnerability reporting:

**[Report a vulnerability →](https://github.com/djsmacker01/CareSync/security/advisories/new)**

Include what you found, how to reproduce it, and what data it exposes. You'll get a response as quickly as I can manage — this is a small project, but security reports jump the queue.

## What counts

Anything that lets someone:

- Read or change resident/clinical data without the right role
- Bypass the API's role checks (e.g. a `staff` user reaching `manager` endpoints)
- Edit or delete MAR entries or other append-only records
- Escalate privileges, hijack sessions, or bypass PIN/login
- Extract data from a self-hosted instance they shouldn't reach

## What doesn't need private reporting

Bugs without a security impact (wrong colours, layout issues, crashes that don't expose data) — those are normal [bug reports](https://github.com/djsmacker01/CareSync/issues/new/choose).

## For self-hosters

CareSync is self-hosted software: you are responsible for your own deployment's security. At minimum — keep your Supabase service role key out of the frontend and out of git, use a strong `JWT_SECRET`, keep your Supabase project in an EU region, and enable RLS (the migrations do this — don't disable it).
