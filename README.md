<p align="center"><img src="public/icon-192.png" width="96" alt="ColorChute icon"></p>

<h1 align="center">ColorChute</h1>

<p align="center">A simple layer editor for getting team shirt art to the printer.</p>

ColorChute is for 2 and 3 color baseball team and fan shirts. Bucket-fill or swap colors across layers to try color
schemes, save each scheme as a color option, see it on a shirt, and export a print-ready PNG that meets Epic Sports'
specs. It runs in the browser, works offline once loaded, and can be installed as an app.

## What it does

- **Layers:** add, duplicate, merge, reorder by dragging, hide (Alt-click the eye to show only one), opacity, rename.
- **Tools:** fill bucket, magic wand, box select, color picker, pencil, eraser, move, crop, hand.
  Fill and wand have a tolerance, a Touching only switch (off means that color everywhere) and All layers.
- **Selections:** select all, none, invert, grow and shrink by any number of pixels, crop to selection.
  Fill, pencil and eraser stay inside the selection.
- **Image:** resize with hard edges (keeps flat inks exact) or smooth, change canvas size, trim empty edges.
  Sizes show in pixels and inches.
- **Inks in this design:** the main colors in the art, with a count against Epic's 3-ink limit. Pick a team color and
  press **Swap to** to change that ink on every layer at once.
- **Saved designs and color options:** **Save** keeps the design in this browser. **Save as new option** adds another
  colorway of the same design. Click an option to switch and compare. **Designs** opens the library.
- **Preview:** a plain square, a basic t-shirt or a realistic t-shirt, in any color, at actual print size or filling
  the chest. Keys 1, 2 and 3 switch between them.
- **Export:** presets for the Epic Sports shirt print, the OTC Sports primary logo (1600 px wide) and the 2D Sports
  square icon (600 × 600), or a custom size. Transparent, or on the shirt color or any color. Pre-export checks follow
  the Shirt Image Spec (size limits, 300 DPI tag, ink count, background box, see-through areas). The Epic package zip
  has the print PNG, a mockup, the order note with the ink hex codes, and the layered project file. A design with
  several color options can export all of them at once.

Specs live in [`src/lib/printSpecs.ts`](src/lib/printSpecs.ts). The team palette is in
[`src/lib/palettes.ts`](src/lib/palettes.ts); Epic Sports' 40-color wheel goes there when it arrives.

## Keyboard

| Key | Does |
|---|---|
| V M W G I B E C H | Move, select, wand, fill, picker, pencil, eraser, crop, hand |
| Space (hold) | Pan |
| X | Swap fill and second color |
| [ and ] | Smaller and bigger brush |
| 1 2 3 | Square, t-shirt, realistic preview |
| ⌘/Ctrl Z, ⌘/Ctrl Shift Z | Undo, redo |
| ⌘/Ctrl S, ⌘/Ctrl Shift S | Save option, save as new option |
| ⌘/Ctrl A, D, Shift I | Select all, deselect, invert |
| ⌘/Ctrl E | Export |
| ⌘/Ctrl 0, +, − | Fit, zoom in, zoom out (or pinch, or Ctrl-scroll) |
| Delete | Clear the selection on the active layer |
| Enter, Esc | Apply or cancel a crop |
| Arrows (move tool) | Nudge the layer 1 px, 10 with Shift |

Drop or paste an image to add it as a layer.

## Run it

Needs Node 22.

```sh
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests
npm run build     # static site in dist/
```

## Host it on Cloudflare (free)

The site is static files, so Cloudflare Pages' free plan covers it.

1. In the Cloudflare dashboard, open **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick **jfreema/ColorChute**.
3. Set **Build command** to `npm run build` and **Build output directory** to `dist`. Leave the rest.
4. Save and deploy. Every push to `main` publishes the site at `colorchute.pages.dev` (or the name you chose), and
   every other branch gets its own preview link.

Or from a terminal, after `npm run build`: `npx wrangler pages deploy` (it reads [`wrangler.toml`](wrangler.toml)).

Saved designs live in each browser's own storage, so they don't sync between computers. Move one with
**More → Download project file** and open the `.colorchute` file on the other computer.
