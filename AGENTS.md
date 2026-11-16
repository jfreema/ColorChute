# Agents

Notes for any coding agent working on ColorChute.

## What it is

A browser image editor for 2 and 3 color team shirt art: layers, fill bucket, magic wand, selections, crop, resize,
saved designs with color options, shirt previews and Epic Sports exports. TypeScript, React 18 and Vite.
It deploys as a Cloudflare Worker (free plan, `wrangler.toml`) that serves `dist/` as static assets and runs a small
API under `/api/` for Google sign-in, account approval and saved designs, kept in the D1 database `colorchute`. Live at
https://colorchute.netcrunchers.workers.dev; every push to main deploys through Workers Builds. [README.md](README.md) is a short, plain overview; keep
it that way. The detailed user guide (tools, shortcuts, export specs, hosting steps) is the "ColorChute Guide" doc in
Jared's Claude project, not a repo file.

## Build and test

```sh
npm run dev      # dev server; /api goes to the Worker on port 8787
npx wrangler dev # the Worker with a local D1, for sign-in and saving
npm test         # vitest, pure code only
npm run build    # typecheck, then dist/
```

Local sign-in needs a `.dev.vars` (git-ignored) with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `ADMIN_EMAILS`.
Fake values are fine: insert a user and a session (`token_hash` is the SHA-256 hex of the `cc_session` cookie) with
`npx wrangler d1 execute colorchute --local` to test without Google.

## Code

| Area | Files |
|---|---|
| Pure pixel code, unit tested | `src/editor/pixels.ts` (flood fill, paint, replace color, resize, colors), `selection.ts` (masks, grow, shrink, outline), `checks.ts` (Epic checks, order note), `src/lib/png.ts` (DPI chunk), `zip.ts` |
| Editor state | `src/editor/store.ts` (`Editor`: document, tools, actions; `useEditor` hook), `history.ts` (undo), `doc.ts` (layers) |
| Saved designs | `src/editor/designs.ts` (library, color options), `storage.ts` (the account on the server, public and shared designs, and old IndexedDB copies), `links.ts` (share link addresses), `src/lib/idb.ts` |
| Accounts | `src/editor/account.ts` (sign-in pop-up, who can edit), `worker/index.ts` (the API: Google OAuth, sessions, approvals, designs, public designs and share links in D1) |
| Export | `src/editor/exporting.ts` (presets, mockup, Epic package) |
| Specs and palettes | `src/lib/printSpecs.ts`, `src/lib/palettes.ts`, `src/lib/shirt.ts` (shirt SVGs) |
| Custom print colors | `src/editor/customColors.ts` (the account's list, add and remove), `src/lib/customColorList.ts` (rules shared with the Worker) |
| UI | `src/App.tsx` (shortcuts, files), `src/components/*`, `src/styles.css` |

## Things that bite

- **Editing needs an approved account** (Jared, 2026-11-14). Everyone else gets the view-only app (`viewOnly` in
  `App.tsx`): no tools, no ink or layer panels, only public designs, their color options and the preview settings.
  Every write in `designs.ts` goes through `requireSave`, which shows the sign-in or waiting-for-approval dialog and
  retries once the person can save. Admins come from the `ADMIN_EMAILS` secret, so nobody gets admin by signing in
  first. The editor runs in the browser, so view-only is a front door, not a lock; the server is what guards saving.
- **Public designs are separate from my designs.** An admin's globe toggle in the library adds the design to the
  `public_designs` table, under a random id so the owner's account id stays out of public addresses. Anyone can list
  them and load their images (`/api/public/...`). Opening one that isn't yours and saving makes your own copy with all
  its options (`mine()` in `designs.ts`). These replaced the old built-in samples that were copied into every library.
- **Share links open one design for anyone** (Jared, 2026-11-14). An approved account's Share button makes a
  `share_links` row with a long random token; `/s/<token>` opens that design view-only, public or not, until the
  owner turns the link off (sharing again makes a new token). Public designs pass along `/p/<id>`. The query keeps
  how the sender was looking: `option`, `bg`, `shirt`/`square`, `behind`, `print` and `view` (`src/editor/links.ts`).
  `view` is the part of the scene that was on screen, in document pixels, not a zoom percent, so it frames the same
  art on a phone or a big monitor. `/s/*` and `/p/*` run the Worker first only to add link-preview tags to
  index.html; the app reads the link itself. Opening your own share link opens it as yours.
- **Dashboard variables need `keep_vars`.** The Google values were once plain-text variables and a deploy deleted
  them, which turned sign-in off. Keep `keep_vars = true` in `wrangler.toml`, and add these as type Secret.
- **Sign-in runs in a pop-up** so unsaved canvases survive it. The callback page tells the editor over a
  `BroadcastChannel`, because Google's pages cut `window.opener`.
- **D1 values top out at 2 MB**, so layer PNGs are stored in 1 MB chunks. A save uploads only the images that changed,
  then the design's details; the Worker refuses details that point at images it doesn't have.
- **Layers are canvases; selections are masks.** A selection is a `Uint8Array` (0 or 255 per pixel) and is never
  changed in place, so the history can keep it by reference. Make a new one for every change.
- **Undo saves only what changed.** `History.begin` takes the layers an edit touches, `commit` trims each to the box
  that differs. Structural edits (crop, resize) pass `'all'`. A full-size layer at 300 DPI is 30 to 45 MB, so never
  save whole layers when a box will do.
- **Keep inks exact.** Shirt art is flat spot colors: fill and pencil have hard edges, resize defaults to nearest
  neighbor, and the inks panel downsamples with smoothing off. Anything that adds in-between colors breaks Epic's
  3-ink rule.
- **The stage places everything in screen pixels from document coordinates** (`left = pan + x * zoom`), not with a CSS
  transform, so the shirt SVGs and the canvas stay sharp at any zoom.
- **Shirt canvases are 11 × 11 in** (`SHIRT_CANVAS` in `printSpecs.ts`, 3300 × 3300 px), Jared's rule. The preview
  puts the canvas top at the top of the print area and exports trim to the art, so art sits at the top of the canvas.
- **Mockups show an adult M as worn** (`UNITS_PER_INCH` in `src/lib/shirt.ts`): about 16 in of chest faces forward,
  so 11 in art covers about two thirds of it, as in Jared's photos of real Epic prints. Don't scale it to the 20 in
  flat width; Jared found that too small.
- **A saved mockup is the stage as it is** (Jared, 2026-11-15). Save image on the stage (shirt backgrounds only) and
  the Export dialog's Mockup button both call `saveMockup` in `exporting.ts`: the whole document placed and sized as
  the stage has it, on the preview's shirt color, with hidden inks left out, never the export's background color.
  The Epic package's mockup is a print proof instead: the trimmed print art with every ink.
- **Custom print colors belong to each account** (Jared, 2026-11-16). The Custom group in the fill color palette
  starts with `CUSTOM_STARTERS` (colors read from two of Jared's photos). Once someone adds or removes one, their
  whole list is saved in the `custom_colors` table (`/api/me/colors`), and from then on that list is the group.
  Changing the starters only reaches accounts that never edited theirs.
- **Camo shirts are found by their hex.** A shirt swatch with `camo` (Sport-Tek Digi Camo) gets the digital camo
  from `src/lib/camo.ts` wherever the shirt shows: `shirtCamo(hex)` looks the color up, so saved options and share
  links still store a plain hex. A camo base hex must not match any solid shirt swatch; `camo.test.ts` checks it.
- **Epic's numbers live in `printSpecs.ts`** and come from the Shirt Image Spec and the Team Logo and Icon Spec in
  the Shirt Graphics project. Change them there.
- **Commits are authored as Jared** (`Jared Freeman <143004867+jfreema@users.noreply.github.com>`) with no
  Claude mentions or trailers.

## Style

The look is the "bubble pop" style of Jared's Cool Mac Utilities App: saturated blue, white cards with 2 px ink
outlines and hard offset shadows, chunky rounded type. Tokens are at the top of `styles.css`.
