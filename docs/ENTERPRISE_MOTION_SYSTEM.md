# Frontier Voice CRM — Enterprise Motion System

Reusable components in `src/components/motion/`:

- `motion-tokens.ts` — durations/easing/spring curve shared across the app.
- `motion-route.tsx` — route-mounted transition inside the existing authenticated shell.
- `motion-enhancements.tsx` — progressive, once-per-element reveals on server-rendered pages and client tables, with IntersectionObserver + MutationObserver; never modifies data.
- `count-up.tsx` — actual dashboard KPI animation (non-numeric placeholders stay unchanged).
- `voice-waveform.tsx` — media-event-driven waveform ready for actual audio players; never presents synthetic audio as live.

The additive CSS in `src/app/globals.css` supports sidebars, nav selection, charts, campaign steppers, modal surfaces, table/filters, menu overlays, feedback, ambient lighting and accessible reduced motion.

## Contract
- Do not simulate voice audio, agent connection, campaign running, call stats or progress.
- No changes to Supabase, authentication, server actions, tenant RLS or call launching.
- The agent samples are currently intentionally disabled; do not turn them into working playback without verified recording/voice APIs.
- Existing server rendering and semantic controls remain intact.
- Aim for 150–300ms microinteractions. No perpetual high-cost filters or background animations.
- All nonessential animations stop when `prefers-reduced-motion: reduce` is enabled.

## Test matrix
- Desktop and mobile sidebar layout.
- Dashboard KPI real numbers, empty charts, nonnumeric placeholders.
- Navigation through every portal page; no offscreen content trapped by animations.
- Sorting/filtering and modal opening in Customers, Reports, Settings, Agents, Campaigns.
- Campaign wizard submission and approval rules remain unchanged.
- Keyboard focus and reduced-motion OS preference.
- Production sign-in, RLS scope and forms require authorized end-to-end verification separately.
