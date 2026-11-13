import { colorName } from '../lib/palettes'
import { DEFAULT_DPI, ExportSettings, slug, TARGETS } from '../lib/printSpecs'
import { setPngDpi } from '../lib/png'
import {
  basicShirt, loadSvg, PRINT_CENTER_X, PRINT_TOP, printScale, realisticShirtBase, realisticShirtHighlights,
  realisticShirtShadows, SHIRT_H, SHIRT_W,
} from '../lib/shirt'
import { makeZip } from '../lib/zip'
import { ctx2d, makeCanvas, readPixels } from './doc'
import { Check, inkColors, orderNote, screenChecks, shirtChecks } from './checks'
import { contentBounds } from './pixels'
import { PreviewSettings, resizeCanvas } from './store'

export interface ExportResult {
  canvas: HTMLCanvasElement
  dpi: number | null
  png: Uint8Array
  checks: Check[]
  inks: { name?: string; hex: string }[]
  fileName: string
}

function trimmed(src: HTMLCanvasElement): HTMLCanvasElement {
  const box = contentBounds(readPixels(src))
  if (!box || (box.w === src.width && box.h === src.height)) return src
  const c = makeCanvas(box.w, box.h)
  ctx2d(c).drawImage(src, -box.x, -box.y)
  return c
}

function withBackground(src: HTMLCanvasElement, color: string | null): HTMLCanvasElement {
  if (!color) return src
  const c = makeCanvas(src.width, src.height)
  const g = ctx2d(c)
  g.fillStyle = color
  g.fillRect(0, 0, c.width, c.height)
  g.drawImage(src, 0, 0)
  return c
}

export async function encodePng(c: HTMLCanvasElement, dpi: number | null): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png'))
  const bytes = new Uint8Array(await blob.arrayBuffer())
  return dpi ? setPngDpi(bytes, dpi) : bytes
}

/** Sizes the art for the export target and draws it on the chosen background */
export async function buildExport(
  art: HTMLCanvasElement, s: ExportSettings, preview: PreviewSettings, docDpi: number, baseName: string,
): Promise<ExportResult> {
  let c = art
  let dpi: number | null
  const bg =
    s.background === 'transparent' ? null
      : s.background === 'shirt' ? preview.shirtColor
        : s.background === 'board' ? (preview.boardColor === 'transparent' ? null : preview.boardColor)
          : s.customBackground

  if (s.target === 'custom') {
    if (s.trim) c = trimmed(c)
    if (s.sizeMode === 'width' && s.widthPx > 0 && s.widthPx !== c.width) {
      c = resizeCanvas(c, s.widthPx, Math.round((c.height * s.widthPx) / c.width), s.resample)
    }
    dpi = s.dpi || docDpi
  } else {
    const t = TARGETS[s.target]
    dpi = t.dpi
    c = trimmed(c)
    if (t.sizing.kind === 'keep') {
      if (docDpi !== DEFAULT_DPI && docDpi > 0) {
        // Keep the printed size: a 150 DPI design is resampled to 300
        const k = DEFAULT_DPI / docDpi
        c = resizeCanvas(c, Math.round(c.width * k), Math.round(c.height * k), s.resample)
      }
    } else if (t.sizing.kind === 'width') {
      const inner = t.sizing.width - t.sizing.pad * 2
      const h = Math.max(1, Math.round((c.height * inner) / c.width))
      const out = makeCanvas(t.sizing.width, h + t.sizing.pad * 2)
      const g = ctx2d(out)
      const scaled = resizeCanvas(c, inner, h, 'smooth')
      g.drawImage(scaled, t.sizing.pad, t.sizing.pad)
      c = out
    } else {
      const inner = t.sizing.size - t.sizing.pad * 2
      const k = Math.min(inner / c.width, inner / c.height)
      const w = Math.max(1, Math.round(c.width * k)), h = Math.max(1, Math.round(c.height * k))
      const out = makeCanvas(t.sizing.size, t.sizing.size)
      ctx2d(out).drawImage(resizeCanvas(c, w, h, 'smooth'), Math.round((out.width - w) / 2), Math.round((out.height - h) / 2))
      c = out
    }
  }

  const px = readPixels(c)
  const inks = inkColors(px).map((k) => ({ name: colorName(k.hex), hex: k.hex }))
  const final = withBackground(c, bg)
  const png = await encodePng(final, dpi)
  let checks: Check[]
  if (s.target === 'shirt') {
    checks = shirtChecks(px, dpi ?? 0)
    if (bg) checks.push({ label: 'Background', status: 'warn', detail: 'A solid background is on. Epic wants transparent.' })
  } else if (s.target === 'logo') checks = screenChecks(px, png.length, 1024 * 1024)
  else if (s.target === 'icon') checks = screenChecks(px, png.length, 500 * 1024)
  else checks = []
  const suffix = s.target === 'custom' ? `${final.width}px` : TARGETS[s.target].suffix(final.width, final.height)
  return { canvas: final, dpi, png, checks: dedupe(checks), inks, fileName: `${slug(baseName)}-${suffix}.png` }
}

function dedupe(checks: Check[]): Check[] {
  // A background warning replaces the pass for the same check
  const out: Check[] = []
  for (const c of checks) {
    const i = out.findIndex((o) => o.label === c.label)
    if (i < 0) out.push(c)
    else if (c.status !== 'pass') out[i] = c
  }
  return out
}

/** The art on a shirt of the preview's color, as the proof check picture */
export async function renderMockup(art: HTMLCanvasElement, preview: PreviewSettings, dpi: number | null): Promise<HTMLCanvasElement> {
  const k = 1.6
  const c = makeCanvas(Math.round(SHIRT_W * k), Math.round(SHIRT_H * k))
  const g = ctx2d(c)
  g.fillStyle = preview.stageColor
  g.fillRect(0, 0, c.width, c.height)
  const realistic = preview.mode === 'realistic'
  g.drawImage(await loadSvg(realistic ? realisticShirtBase(preview.shirtColor) : basicShirt(preview.shirtColor)), 0, 0, c.width, c.height)
  const s = printScale(art.width, art.height, dpi ?? DEFAULT_DPI, dpi ? 'actual' : 'fit') * k
  const w = art.width * s, h = art.height * s
  g.imageSmoothingQuality = 'high'
  g.drawImage(art, PRINT_CENTER_X * k - w / 2, PRINT_TOP * k, w, h)
  if (realistic) {
    g.globalCompositeOperation = 'multiply'
    g.drawImage(await loadSvg(realisticShirtShadows(preview.shirtColor)), 0, 0, c.width, c.height)
    g.globalCompositeOperation = 'screen'
    g.drawImage(await loadSvg(realisticShirtHighlights(preview.shirtColor)), 0, 0, c.width, c.height)
    g.globalCompositeOperation = 'source-over'
  }
  return c
}

interface Downloads {
  save(r: { filename: string; data: Blob }): Promise<unknown>
}
type ClaudeHost = { use(name: 'downloads'): Promise<Downloads | null> }

/**
 * Saves a file. Inside a claude.ai artifact the page can't start downloads itself, so it asks the viewer through the
 * host's save prompt, which only takes some extensions; anywhere else it's an ordinary download link.
 */
export async function download(data: Blob | Uint8Array, name: string, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type })
  const host = (window as unknown as { claude?: ClaudeHost }).claude
  const saver = host ? await host.use('downloads').catch(() => null) : null
  if (saver) {
    const filename = /\.(png|zip|txt|json)$/i.test(name) ? name : `${name}.json`
    try {
      await saver.save({ filename, data: blob })
    } catch (e) {
      if ((e as { code?: string }).code !== 'declined') throw new Error("Couldn't save the file here")
    }
    return
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

/** The Epic package: print PNG, mockup, color list and the layered project, zipped */
export async function epicPackage(
  result: ExportResult, art: HTMLCanvasElement, preview: PreviewSettings, baseName: string,
  extras: { mockup: boolean; colors: boolean; project: Uint8Array | null },
): Promise<Blob> {
  const name = slug(baseName)
  const files: { name: string; data: Uint8Array }[] = [{ name: result.fileName, data: result.png }]
  if (extras.mockup) {
    const m = await renderMockup(trimmedOrSame(art), preview, result.dpi)
    files.push({ name: `${name}-mockup.png`, data: await encodePng(m, null) })
  }
  if (extras.colors) {
    files.push({
      name: `${name}-colors.txt`,
      data: new TextEncoder().encode(orderNote(result.canvas.width, result.canvas.height, result.inks)),
    })
  }
  if (extras.project) files.push({ name: `${name}.colorchute`, data: extras.project })
  return makeZip(files)
}

function trimmedOrSame(c: HTMLCanvasElement) {
  return trimmed(c)
}
