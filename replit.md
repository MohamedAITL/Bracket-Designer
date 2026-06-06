# World Cup Flag Placer

A simple drag-and-drop web tool for journalists to place national flags onto a World Cup bracket design and export the final graphic as a PNG image.

## Run & Operate

- `pnpm --filter @workspace/wc-flag-placer run dev` — run the Flag Placer app (port 23279)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18, Vite, Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (not used by the flag placer)
- Export: html2canvas

## Where things live

- `artifacts/wc-flag-placer/` — the flag placer web app
- `artifacts/wc-flag-placer/public/background.jpg` — the World Cup bracket background image
- `artifacts/wc-flag-placer/public/flags/` — all 48 national flag PNG assets
- `artifacts/wc-flag-placer/src/App.tsx` — main app component with all drag/resize/export logic
- `artifacts/api-server/` — shared Express API server (not used by this app)

## Product

The app displays the World Cup bracket background as a full canvas. Users drag flags from a horizontal picker strip onto the bracket, then reposition and resize each flag as needed. A one-click Export PNG button downloads the composed image. A Reset button clears all placed flags.

## User preferences

- No sidebar — only the background image and flags
- Desktop-focused
- Keep the interface extremely simple: top toolbar = Export + Reset only

## Gotchas

- Flag filenames contain spaces and special characters — always use `encodeURIComponent()` when building `/flags/` URLs
- html2canvas `scale: 2` is used for export so the output is 2× resolution
- The flag picker horizontal strip is a separate row (not a sidebar) to keep the bracket fully visible
