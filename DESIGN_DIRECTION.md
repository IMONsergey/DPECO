# 01 / Corporate editorial

**Branch:** `design/alternative-01-tresmares-editorial`

**Status:** implemented, first responsive pass and production build verified. Not approved for production.

## Design decisions

- Light editorial hero, generous typographic hierarchy, deep-teal technical transaction diagram.
- Simplified single-row desktop navigation for the homepage, with existing mobile menu preserved.
- Separate visual story for two practical paths: seller (portfolio/receivables) and buyer (lots/trading).
- Partner names/logos reused from the existing repository. No new or unverified partner claims.
- Auction lots, real route handlers, signup/login, formats, process, FAQ, ecosystem and form logic reused from the existing application.
- Homepage marketing copy avoids unverified superlatives, numerical performance claims and promises about unconnected APIs.
- TikTok Sans is retained; accent is teal; background surfaces are white, warm gray and pale mint.
- The hero includes no heavy WebGL or third-party runtime.

## Checks performed (2026-11-07)

- `npm run build`: pass (Vite + TypeScript).
- `git diff --check`: pass.
- Visual screenshots inspected: 320x2200, 390x940, 768x1100, 1440x1000 and 1440x2700.
- Fixed navigation position after screenshot review.
- Removed deferred heading animation from hero to prevent partially invisible initial text.
- Source branch retained; default branch and production left untouched.

## Known dependencies / second review

- Lot cards are backed by a dated local snapshot (29 Oct 2026); real API status must be integrated separately.
- Form submission uses a mail client flow, not a CRM API.
- Technical/accessibility and Safari interaction sweeps should be repeated before selection and release.
- Confirm final legal and partnership claims with the customer before production use.
