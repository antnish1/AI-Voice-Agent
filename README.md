# Frontier AI Voice CRM

## Current development status

**Next.js + Supabase authentication foundation is being built on a feature branch.** The root `src/` app uses real Supabase email/password authentication, dealership memberships, real database reads, campaign drafts and server-validated manager decisions. Review [docs/PRODUCTION_FOUNDATION.md](docs/PRODUCTION_FOUNDATION.md) for setup and limitations.

This app is **not live**: a new dedicated Supabase project is not connected, a package lockfile has not been generated, no CI/build has run, and Sarvam launching is disabled. The prior static prototype remains under [web/](web/).

### Local Next.js setup

1. Copy `.env.example` to `.env.local` and supply only dedicated Supabase project URL and publishable key.
2. Review and apply `db/production-foundation.sql` to a **new dedicated database**, not the old prototype schema and not InsureIT.
3. Provision Supabase Auth users and dealership membership records using admin-only tooling.
4. Install dependencies and generate/commit a lockfile: `npm install`; then `npm run lint && npm test && npm run build`.
5. Start locally with `npm run dev` and verify tenant authorization with separate dealership accounts.

Never use real customer records until RLS and security tests are verified. Do not enable live calls until immutable cohorts and Sarvam integration are implemented.

---

# Frontier AI Voice CRM

Standalone multi-dealership AI calling CRM for **Frontier Group dealerships**. Sarvam Samvaad powers calls; this portal handles imports, campaign preparation, manager approval, follow-up work and reporting.

## Current status

**Development prototype only. NO production authentication, Sarvam campaign launch, deployment or live calls.** The browser preview stores synthetic/test data locally and uses simulated roles/approvals. Do not upload real customer information.

## Preview

Open `web/index.html`, or run:

```bash
cd web
python -m http.server 8080
```

Navigate to http://localhost:8080.

## Project references

- [AGENTS.md](AGENTS.md): engineering handoff + Kajal CRM voice agent behavior, training rules, regression tests and agent configuration boundaries.
- [Frontend blueprint](docs/FRONTEND_DEVELOPMENT_PLAN.md): full approved scope, roles, database, security, workflows, integrations and phased roadmap.
- [Supabase schema](db/schema.sql): **development proposal only**; not deployed.
- [.env.example](.env.example): environment variable placeholders, with live calling disabled.
- [Original prototype archive](https://github.com/antnish1/AI-Voice-Agent): the current web preview is an editable reconstruction of the foundation's core modules; compare with the previously supplied starter ZIP before promotion.

## Demo features

Dealership selection, simulated role views, dashboard, customer CSV imports (Excel handling requires production importer), customer search, campaign drafts, manager approval/rejection, agent directory, and empty-state pages for call logs, appointments, callbacks, pickup/drop, complaints and reports.

## Production implementation requirements

Next.js + TypeScript + Supabase Auth/Postgres/RLS + server-only Sarvam adapter. Enforce authorization and campaign approval in backend/database; never trust the prototype role dropdown. Protect recordings, customer PII and webhook secrets. Verify Sarvam workspace, agent and API capabilities against the actual account before integrating. Live dialing must require an explicit server flag, production authorization and approved campaign snapshot.

No example customer contact records or credentials belong in this public repository.
