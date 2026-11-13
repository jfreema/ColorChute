# Agents

Notes for any coding agent working on ColorChute.

## What it is

A browser image editor for 2 and 3 color team shirt art: layers, fill bucket, magic wand, selections, crop, resize,
saved designs with color options, shirt previews and Epic Sports exports. TypeScript, React 18 and Vite, no backend.
It deploys as static files to Cloudflare Pages (free plan). [README.md](README.md) is the user guide.

## Build and test

```sh
npm run dev      # dev server
npm test         # vitest, pure code only
npm run build    # typecheck, then dist/
```

## Code

| Area | Files |
|---|---|
| Pure pixel code, unit tested | `src/editor/pixels.ts` (flood fill, paint, replace color, resize, colors), `selection.ts` (masks, grow, shrink, outline), `checks.ts` (Epic checks, order note), `src/lib/png.ts` (DPI chunk), `zip.ts` |
| Editor state | `src/editor/store.ts` (`Editor`: document, tools, actions; `useEditor` hook), `history.ts` (undo), `doc.ts` (layers) |
| Saved designs | `src/editor/designs.ts` (IndexedDB library, color options), `src/lib/idb.ts` |
| Export | `src/editor/exporting.ts` (presets, mockup, Epic package) |
| Specs and palettes | `src/lib/printSpecs.ts`, `src/lib/palettes.ts`, `src/lib/shirt.ts` (shirt SVGs) |
| UI | `src/App.tsx` (shortcuts, files), `src/components/*`, `src/styles.css` |

## Things that bite

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
- **Epic's numbers live in `printSpecs.ts`** and come from the Shirt Image Spec and the Team Logo and Icon Spec in
  the Shirt Graphics project. Change them there.
- **Commits are authored as Jared** (`Jared Freeman <143004867+jfreema@users.noreply.github.com>`) with no
  Claude mentions or trailers.

## Style

The look is the "bubble pop" style of Jared's Cool Mac Utilities App: saturated blue, white cards with 2 px ink
outlines and hard offset shadows, chunky rounded type. Tokens are at the top of `styles.css`.
