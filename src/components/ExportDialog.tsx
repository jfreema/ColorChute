import { useEffect, useMemo, useState } from 'react'
import { worst } from '../editor/checks'
import { allOptions, getDesigns, renderOption, useDesigns } from '../editor/designs'
import { buildExport, download, encodePng, epicPackage, ExportResult, renderMockup } from '../editor/exporting'
import { editor, useEditor } from '../editor/store'
import { orderNote } from '../editor/checks'
import { DEFAULT_EXPORT, ExportSettings, ExportTarget, slug, TARGETS } from '../lib/printSpecs'
import { makeZip } from '../lib/zip'
import { ColorInput } from './ColorInput'
import { Dialog } from './Dialog'
import { CircleCheck, Clipboard, Download, OctagonX, Package, Shirt, TriangleAlert } from './icons'

const KEY = 'colorchute.export.v1'

function loadSettings(): ExportSettings {
  try {
    return { ...DEFAULT_EXPORT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULT_EXPORT
  }
}

const ICON = {
  pass: <CircleCheck size={16} color="#1c8f40" />,
  warn: <TriangleAlert size={16} color="#d97706" />,
  block: <OctagonX size={16} color="#e84040" />,
}

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<ExportSettings>(loadSettings)
  const preview = useEditor((st) => st.preview)
  const name = useEditor((st) => st.name)
  const dpi = useEditor((st) => st.dpi)
  const version = useEditor((st) => st.pixelsVersion)
  const designName = useDesigns((d) => d.designName)
  const optionId = useDesigns((d) => d.optionId)
  const options = useDesigns((d) => d.options)
  const optionName = options.find((o) => o.id === optionId)?.name
  const [result, setResult] = useState<ExportResult | null>(null)
  const [url, setUrl] = useState('')
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const baseName = [designName || name, optionName].filter(Boolean).join(' ')

  const update = (p: Partial<ExportSettings>) => {
    const next = { ...s, ...p }
    setS(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // Settings just won't stick
    }
  }

  useEffect(() => {
    let cancelled = false
    const id = setTimeout(async () => {
      const r = await buildExport(editor.composite(), s, preview, dpi, baseName)
      if (cancelled) return
      setResult(r)
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old)
        return URL.createObjectURL(new Blob([r.png as BlobPart], { type: 'image/png' }))
      })
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [s, preview, dpi, baseName, version])

  const status = result ? worst(result.checks) : 'pass'
  const blocked = s.target === 'shirt' && status === 'block'
  const note = useMemo(() => (result ? orderNote(result.canvas.width, result.canvas.height, result.inks) : ''), [result])
  const previewBg = s.target === 'custom' ? '#FFFFFF' : TARGETS[s.target].previewBg

  const run = async (fn: () => Promise<void>) => {
    setWorking(true)
    try {
      await fn()
    } catch (e) {
      editor.toast(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setWorking(false)
    }
  }

  const downloadPng = () => run(async () => {
    if (result) download(result.png, result.fileName, 'image/png')
  })

  const downloadPackage = () =>
    run(async () => {
      if (!result) return
      const project = new TextEncoder().encode(JSON.stringify(await editor.toProject()))
      const zip = await epicPackage(result, editor.composite(), preview, baseName, {
        mockup: s.includeMockup, colors: s.includeColors, project: s.includeProject ? project : null,
      })
      download(zip, `${slug(baseName)}-print-files.zip`)
    })

  const downloadMockup = () =>
    run(async () => {
      const m = await renderMockup(result?.canvas ?? editor.composite(), preview, result?.dpi ?? null)
      download(await encodePng(m, null), `${slug(baseName)}-mockup.png`, 'image/png')
    })

  const downloadAll = () =>
    run(async () => {
      const files: { name: string; data: Uint8Array }[] = []
      const design = getDesigns().designName || name
      for (const o of await allOptions()) {
        const art = await renderOption(o)
        const r = await buildExport(art, s, preview, o.dpi, `${design} ${o.name}`)
        files.push({ name: r.fileName, data: r.png })
        if (s.target === 'shirt' && s.includeColors) {
          files.push({
            name: `${slug(design, o.name)}-colors.txt`,
            data: new TextEncoder().encode(orderNote(r.canvas.width, r.canvas.height, r.inks)),
          })
        }
        if (s.target === 'shirt' && s.includeMockup) {
          files.push({ name: `${slug(design, o.name)}-mockup.png`, data: await encodePng(await renderMockup(r.canvas, preview, r.dpi), null) })
        }
      }
      download(makeZip(files), `${slug(design)}-all-colorways.zip`)
    })

  const targets: { id: ExportTarget; label: string }[] = [
    { id: 'shirt', label: 'Shirt print' },
    { id: 'logo', label: 'Primary logo' },
    { id: 'icon', label: 'Square icon' },
    { id: 'custom', label: 'Custom' },
  ]

  return (
    <Dialog
      title="Export"
      icon={<Download size={14} />}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="hint">{result ? `${result.fileName} · ${result.canvas.width} × ${result.canvas.height} px` : 'Preparing…'}</span>
          <span className="grow" />
          {options.length > 1 && (
            <button className="btn" disabled={working || blocked} onClick={downloadAll} title="Every saved color option of this design, zipped">
              <Package size={14} /> All {options.length} options
            </button>
          )}
          <button className="btn" disabled={working} onClick={downloadMockup} title="The art on the preview's shirt color">
            <Shirt size={14} /> Mockup
          </button>
          {s.target === 'shirt' && (
            <button className="btn" disabled={working || blocked || !result} onClick={downloadPackage}>
              <Package size={14} /> Epic package (.zip)
            </button>
          )}
          <button className="btn yellow" disabled={working || blocked || !result} onClick={downloadPng}>
            <Download size={14} /> {blocked ? 'Fix the red checks first' : 'Download PNG'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: 14 }}>
        <div>
          <div className="section-label">For</div>
          <div className="segmented">
            {targets.map((t) => (
              <button key={t.id} className={s.target === t.id ? 'active' : ''} onClick={() => update({ target: t.id })}>
                {t.label}
              </button>
            ))}
          </div>
          <p style={{ color: '#fff', margin: '8px 2px 0', opacity: 0.9 }}>
            {s.target === 'shirt' && 'Epic Sports upload: transparent PNG trimmed to the art, 300 DPI written in.'}
            {s.target === 'logo' && 'OTC Sports team page: 1600 px wide, 40 px clear all round, transparent.'}
            {s.target === 'icon' && '2D Sports and GameChanger: 600 × 600, art centered with 30 px clear.'}
            {s.target === 'custom' && 'Your own size and DPI.'}
          </p>

          <div className="section-label">Background</div>
          <div className="row">
            <div className="segmented">
              {(
                [
                  ['transparent', 'None'],
                  ['shirt', 'Shirt color'],
                  ['board', 'Square color'],
                  ['custom', 'Custom'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} className={s.background === id ? 'active' : ''} onClick={() => update({ background: id })}>
                  {label}
                </button>
              ))}
            </div>
            {s.background === 'custom' && (
              <ColorInput className="swatch" value={s.customBackground} onChange={(c) => update({ customBackground: c })}
                title="Background color" />
            )}
          </div>

          {s.target === 'custom' && (
            <>
              <div className="section-label">Size</div>
              <div className="card">
                <div className="card-row row">
                  <label className="row tight"><input type="radio" checked={s.sizeMode === 'document'}
                    onChange={() => update({ sizeMode: 'document' })} /> As is</label>
                  <label className="row tight"><input type="radio" checked={s.sizeMode === 'width'}
                    onChange={() => update({ sizeMode: 'width' })} /> Width</label>
                  <input className="field num" type="number" value={s.widthPx} disabled={s.sizeMode !== 'width'}
                    onChange={(e) => update({ widthPx: +e.target.value })} aria-label="Width in pixels" /> px
                </div>
                <div className="card-row row">
                  <input className="field num" type="number" value={s.dpi} onChange={(e) => update({ dpi: +e.target.value })}
                    aria-label="DPI" /> DPI
                  <button className={`btn small ${s.trim ? 'on' : ''}`} onClick={() => update({ trim: !s.trim })}>Trim empty edges</button>
                  <button className={`btn small ${s.resample === 'smooth' ? 'on' : ''}`}
                    onClick={() => update({ resample: s.resample === 'smooth' ? 'hard' : 'smooth' })}>Smooth</button>
                </div>
              </div>
            </>
          )}

          {s.target === 'shirt' && (
            <>
              <div className="section-label">Epic package also has</div>
              <div className="row">
                <button className={`btn small ${s.includeMockup ? 'on' : ''}`} onClick={() => update({ includeMockup: !s.includeMockup })}>
                  Mockup
                </button>
                <button className={`btn small ${s.includeColors ? 'on' : ''}`} onClick={() => update({ includeColors: !s.includeColors })}>
                  Order note with colors
                </button>
                <button className={`btn small ${s.includeProject ? 'on' : ''}`} onClick={() => update({ includeProject: !s.includeProject })}>
                  Layered project file
                </button>
              </div>
            </>
          )}

          {result && result.checks.length > 0 && (
            <>
              <div className="section-label">
                Checks <span className="grow" />
                <span className={`pill ${status}`}>{status === 'pass' ? 'Ready' : status === 'warn' ? 'Look these over' : 'Blocked'}</span>
              </div>
              <div className="card">
                {result.checks.map((c) => (
                  <div className="check-row" key={c.label}>
                    {ICON[c.status]}
                    <span className="lbl">{c.label}</span>
                    <span className="grow">{c.detail}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div>
          <div className="section-label">Preview{s.target !== 'custom' && <span className="hint" style={{ color: '#fff', textTransform: 'none', letterSpacing: 0 }}>on the site's background</span>}</div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className={`export-preview ${s.background === 'transparent' && s.target === 'custom' ? 'checker' : ''}`}
              style={{ background: s.target === 'shirt' && s.background === 'transparent' ? preview.shirtColor : previewBg }}>
              {url && <img src={url} alt="Export preview" />}
            </div>
            {result && result.inks.length > 0 && s.target !== 'shirt' && (
              <div className="card-row row">
                <b>Colors</b>
                {result.inks.map((k) => (
                  <span key={k.hex} className="row tight" style={{ fontSize: 12 }}>
                    <span className="swatch" style={{ width: 14, height: 14, borderRadius: 4, background: k.hex }} />
                    {k.name ?? k.hex}
                  </span>
                ))}
              </div>
            )}
            {result && result.inks.length > 0 && s.target === 'shirt' && (
              <div className="card-row">
                <div className="row" style={{ marginBottom: 6 }}>
                  <b className="grow">Order note</b>
                  <button className="btn small" onClick={() => {
                    navigator.clipboard?.writeText(note).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }, () => editor.toast('Select the note and copy it'))
                  }}>
                    <Clipboard size={13} /> {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="note">{note}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
