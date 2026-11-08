# DPECO / 05 — Data-led credit experience

Reference (observed 08.11.2026): https://9fin.com/ — current public 9fin homepage.
Project branch: design/alternative-05-ninefin-data.
Current worktree: /home/sergey/Projects/DPECO-variants/05-ninefin-data.

## What is adapted
- The reference's information-first positioning: large statement, real product-interface proof and a strong hierarchy between context and task.
- Restrained white/light-gray surfaces, editorial pauses, high-density table, fine borders, left-column sticky narrative and structured audience pathways.
- Product-led pacing: hero + data preview, advantages, roles, real listing, format explanation, process, contact.
- Motion only for responsive feedback, and always respecting reduced-motion. No decorative film/radial hero from directions 01–04.

## What is independently built
Original CSS and layout; TikTok Sans loaded by existing DPECO stylesheet. No third-party image, logo, font, copied website wording or source code. The overview table is generated from existing local `src/data/lots.ts` and is explicitly an archive dated 29.10.2026. No metrics are presented as live market or DEBTPRICE performance. Every visible interactive item is an actual DPECO in-page anchor, hash route or account URL, not a dead control. The request form remains the existing mailto draft; no CRM capability is claimed.

## Information architecture
1. Editorial left/right hero with a genuine data table preview of four historical records.
2. Sticky decision framework: asset type, format, documents.
3. Two linear buyer/seller routes, each linked to existing detailed sections.
4. Public archive with existing real catalog filtering.
5. Native trading format tabs and deal-process steps.
6. Focused contact request, real ecosystem services, journal; existing functional secondary pages preserved.

## Acceptance gate
Must pass npm ci; npm run build; Chromium 320/390/768/1440; WebKit390; buyer/seller route smoke; screenshots and independent visual review. Only then can /v/05/ become READY. Public lab might be reachable but candidate is not published until this gate. Primary production debtprice.market and main remain unchanged.
