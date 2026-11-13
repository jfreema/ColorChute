import { useEffect, useRef, useState } from 'react'
import { inkColors } from '../editor/checks'
import { ctx2d, makeCanvas, readPixels } from '../editor/doc'
import { ColorCount } from '../editor/pixels'
import { editor, useEditor } from '../editor/store'
import { isHex, normalizeHex } from '../lib/color'
import { BOARD_COLORS, colorName, SHIRT_COLLECTIONS, shirtCollection, shirtColorName, TEAM_COLORS } from '../lib/palettes'
import { EPIC } from '../lib/printSpecs'
import { ColorInput } from './ColorInput'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Merge, Plus, Trash2 } from './icons'

export function Sidebar({ onPlaceImage }: { onPlaceImage: () => void }) {
  return (
    <aside className="sidebar">
      <ColorsPanel />
      <InksPanel />
      <LayersPanel onPlaceImage={onPlaceImage} />
      <PreviewPanel />
    </aside>
  )
}

// MARK: Colors

function ColorsPanel() {
  const primary = useEditor((s) => s.primary)
  const recent = useEditor((s) => s.recent)
  const [text, setText] = useState(primary)
  useEffect(() => setText(primary), [primary])
  return (
    <>
      <div className="section-label">Fill color</div>
      <div className="card">
        <div className="card-row row">
          <ColorInput className="swatch big-swatch" value={primary} onChange={(c) => editor.setPrimary(c)} title="Pick any color" />
          <div className="grow">
            <div style={{ fontWeight: 900, fontSize: 15 }}>{colorName(primary) ?? 'Custom'}</div>
            <input
              className="field"
              style={{ width: 100, marginTop: 4 }}
              value={text}
              aria-label="Hex color"
              onChange={(e) => {
                setText(e.target.value)
                if (isHex(e.target.value)) editor.setPrimary(e.target.value)
              }}
              onBlur={() => setText(primary)}
            />
          </div>
        </div>
        <div className="card-row">
          <div className="row" style={{ marginBottom: 8 }}>
            <b>Team colors</b>
            <span className="hint" title="Epic Sports' 40-color wheel goes in src/lib/palettes.ts when it arrives">
              Epic wheel coming
            </span>
          </div>
          <div className="swatch-grid">
            {TEAM_COLORS.map((c) => (
              <button key={c.hex} className={`swatch ${c.hex === primary ? 'selected' : ''}`} style={{ background: c.hex }}
                title={`${c.name} ${c.hex}`} aria-label={c.name} onClick={() => editor.setPrimary(c.hex)} />
            ))}
          </div>
        </div>
        {recent.length > 0 && (
          <div className="card-row tinted">
            <div style={{ marginBottom: 7 }}><b>Recent</b></div>
            <div className="swatch-grid">
              {recent.map((c) => (
                <button key={c} className={`swatch ${c === primary ? 'selected' : ''}`} style={{ background: c }}
                  title={c} aria-label={c} onClick={() => editor.setPrimary(c)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// MARK: Inks in the design

function InksPanel() {
  const version = useEditor((s) => s.pixelsVersion)
  const primary = useEditor((s) => s.primary)
  const [inks, setInks] = useState<ColorCount[]>([])
  useEffect(() => {
    const id = setTimeout(() => {
      const src = editor.composite()
      // Downsample without smoothing, so no in-between colors appear
      const k = Math.min(1, 500 / Math.max(src.width, src.height))
      const c = makeCanvas(Math.max(1, Math.round(src.width * k)), Math.max(1, Math.round(src.height * k)))
      const g = ctx2d(c)
      g.imageSmoothingEnabled = false
      g.drawImage(src, 0, 0, c.width, c.height)
      setInks(inkColors(readPixels(c)))
    }, 250)
    return () => clearTimeout(id)
  }, [version])

  const status = inks.length <= EPIC.maxInks ? 'pass' : inks.length === EPIC.maxInks + 1 ? 'warn' : 'block'
  return (
    <>
      <div className="section-label">
        Inks in this design
        <span className="grow" />
        <span className={`pill ${status}`} title={`Epic's spec: ${EPIC.maxInks} flat inks or fewer`}>
          {inks.length} of {EPIC.maxInks}
        </span>
      </div>
      <div className="card">
        {inks.length === 0 && <div className="card-row hint">Paint or drop in an image to see its colors here.</div>}
        {inks.map((ink) => (
          <div className="ink-row" key={ink.hex}>
            <button className={`swatch ${ink.hex === primary ? 'selected' : ''}`} style={{ background: ink.hex }}
              title="Use this color" aria-label={`Use ${ink.hex}`} onClick={() => editor.setPrimary(ink.hex)} />
            <div className="grow">
              <div className="hex">{colorName(ink.hex) ?? ink.hex}</div>
              <div className="share">{Math.round(ink.share * 100)}% of the art</div>
            </div>
            <button
              className="btn small"
              disabled={ink.hex === primary}
              title={`Change every ${ink.hex} on every layer to the fill color`}
              onClick={() => editor.replaceEverywhere(ink.hex, primary)}
            >
              Swap to <span className="swatch" style={{ width: 14, height: 14, borderRadius: 4, background: primary }} />
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

// MARK: Layers

function LayerThumb({ canvas, version }: { canvas: HTMLCanvasElement; version: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const id = setTimeout(() => {
      const c = ref.current
      if (!c) return
      const g = c.getContext('2d')!
      g.clearRect(0, 0, c.width, c.height)
      const k = Math.min(c.width / canvas.width, c.height / canvas.height)
      const w = canvas.width * k, h = canvas.height * k
      g.drawImage(canvas, (c.width - w) / 2, (c.height - h) / 2, w, h)
    }, 120)
    return () => clearTimeout(id)
  }, [canvas, version])
  return <canvas ref={ref} width={76} height={76} className="thumb checker" />
}

function LayersPanel({ onPlaceImage }: { onPlaceImage: () => void }) {
  const layers = useEditor((s) => s.layers)
  const activeId = useEditor((s) => s.activeId)
  const version = useEditor((s) => s.pixelsVersion)
  const [renaming, setRenaming] = useState<string | null>(null)
  const active = layers.find((l) => l.id === activeId)
  const activeIndex = layers.findIndex((l) => l.id === activeId)
  const [dragId, setDragId] = useState<string | null>(null)

  return (
    <>
      <div className="section-label">
        Layers
        <span className="grow" />
        <button className="btn small icon" title="New layer" aria-label="New layer" onClick={() => editor.addLayer()}>
          <Plus size={14} />
        </button>
        <button className="btn small icon" title="Add an image as a layer" aria-label="Add image" onClick={onPlaceImage}>
          <ImagePlus size={14} />
        </button>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="layers">
          {[...layers].reverse().map((l) => (
            <div
              key={l.id}
              className={`layer ${l.id === activeId ? 'active' : ''} ${l.visible ? '' : 'hidden'}`}
              onClick={() => editor.setActive(l.id)}
              draggable={renaming !== l.id}
              onDragStart={() => setDragId(l.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (dragId && dragId !== l.id) editor.reorderLayer(dragId, layers.findIndex((x) => x.id === l.id))
                setDragId(null)
              }}
            >
              <button
                className="icon-btn"
                title={l.visible ? 'Hide (Alt-click to show only this one)' : 'Show'}
                aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (e.altKey) editor.soloLayer(l.id)
                  else editor.updateLayer(l.id, { visible: !l.visible })
                }}
              >
                {l.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <LayerThumb canvas={l.canvas} version={version} />
              <div className="nm" onDoubleClick={() => setRenaming(l.id)} title="Double-click to rename">
                {renaming === l.id ? (
                  <input
                    className="field"
                    autoFocus
                    defaultValue={l.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      editor.updateLayer(l.id, { name: e.target.value.trim() || l.name })
                      setRenaming(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                      if (e.key === 'Escape') setRenaming(null)
                    }}
                  />
                ) : (
                  l.name
                )}
              </div>
            </div>
          ))}
        </div>
        {active && (
          <div className="card-row tinted row tight">
            <span className="hint">Opacity</span>
            <input type="range" min={0} max={100} value={Math.round(active.opacity * 100)} style={{ width: 56 }}
              aria-label="Layer opacity" title={`Opacity ${Math.round(active.opacity * 100)}%`}
              onChange={(e) => editor.updateLayer(active.id, { opacity: +e.target.value / 100 })} />
            <span className="grow" />
            <button className="icon-btn" title="Move up" aria-label="Move layer up" disabled={activeIndex >= layers.length - 1}
              onClick={() => editor.moveLayer(active.id, 1)}><ArrowUp size={15} /></button>
            <button className="icon-btn" title="Move down" aria-label="Move layer down" disabled={activeIndex <= 0}
              onClick={() => editor.moveLayer(active.id, -1)}><ArrowDown size={15} /></button>
            <button className="icon-btn" title="Duplicate" aria-label="Duplicate layer"
              onClick={() => editor.duplicateLayer()}><Copy size={15} /></button>
            <button className="icon-btn" title="Merge down" aria-label="Merge down" disabled={activeIndex <= 0}
              onClick={() => editor.mergeDown()}><Merge size={15} /></button>
            <button className="icon-btn" title="Delete layer" aria-label="Delete layer" disabled={layers.length <= 1}
              onClick={() => editor.deleteLayer()}><Trash2 size={15} /></button>
          </div>
        )}
      </div>
    </>
  )
}

// MARK: Preview

function PreviewPanel() {
  const p = useEditor((s) => s.preview)
  const collection = shirtCollection(p.shirtCollection)
  const shirtName = shirtColorName(p.shirtColor, collection.id)
  const custom = (value: string, on: (hex: string) => void, title: string) => (
    <ColorInput className="swatch" value={value} onChange={(c) => on(normalizeHex(c))} title={title} />
  )
  return (
    <>
      <div className="section-label">
        Preview
        <span className="sub">{p.mode === 'square' ? 'Square' : p.mode === 'shirt' ? 'T-shirt' : 'Realistic shirt'}</span>
      </div>
      <div className="card">
        {p.mode === 'square' ? (
          <div className="card-row">
            <div style={{ marginBottom: 6 }}><b>Square color</b></div>
            <div className="swatch-grid">
              <button className={`swatch checker ${p.boardColor === 'transparent' ? 'selected' : ''}`} title="Transparent"
                aria-label="Transparent" onClick={() => editor.setPreview({ boardColor: 'transparent' })} />
              {BOARD_COLORS.map((c) => (
                <button key={c.hex} className={`swatch ${p.boardColor === c.hex ? 'selected' : ''}`} style={{ background: c.hex }}
                  title={c.name} aria-label={`${c.name} square`} onClick={() => editor.setPreview({ boardColor: c.hex })} />
              ))}
              {custom(p.boardColor === 'transparent' ? '#FFFFFF' : p.boardColor, (c) => editor.setPreview({ boardColor: c }),
                'Any color')}
            </div>
          </div>
        ) : (
          <>
            <div className="card-row">
              <div className="row tight" style={{ marginBottom: 6 }}>
                <b className="grow">Shirt color</b>
                <select className="field small" value={collection.id} title={collection.shirt} aria-label="Shirt colors from"
                  onChange={(e) => editor.setPreview({ shirtCollection: e.target.value })}>
                  {SHIRT_COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="swatch-grid shirts">
                {collection.colors.map((c) => (
                  <button key={c.name} className={`swatch ${p.shirtColor.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                    style={{ background: c.hex }} title={c.name} aria-label={`${c.name} shirt`}
                    onClick={() => editor.setPreview({ shirtColor: c.hex })} />
                ))}
                {custom(p.shirtColor, (c) => editor.setPreview({ shirtColor: c }), 'Any shirt color')}
              </div>
              <div className="hint shirt-name">
                {shirtName
                  ? `${shirtName.name}${shirtName.collection !== collection ? ` (${shirtName.collection.name})` : ''}`
                  : `Custom ${p.shirtColor.toUpperCase()}`}
              </div>
            </div>
            <div className="card-row row">
              <b className="grow">Print size</b>
              <div className="segmented">
                <button className={p.sizeMode === 'actual' ? 'active' : ''} onClick={() => editor.setPreview({ sizeMode: 'actual' })}
                  title="As it will print, from the design's DPI">Actual</button>
                <button className={p.sizeMode === 'fit' ? 'active' : ''} onClick={() => editor.setPreview({ sizeMode: 'fit' })}
                  title="Fill the 11 in chest area">Fill chest</button>
              </div>
            </div>
          </>
        )}
        <div className="card-row tinted row">
          <b className="grow">Behind</b>
          {['#DCE6FF', '#FFFFFF', '#E8E8E8', '#3A3F4F'].map((c) => (
            <button key={c} className={`swatch ${p.stageColor === c ? 'selected' : ''}`} style={{ background: c }}
              aria-label={`Background ${c}`} onClick={() => editor.setPreview({ stageColor: c })} />
          ))}
          {custom(p.stageColor, (c) => editor.setPreview({ stageColor: c }), 'Any color behind')}
        </div>
      </div>
    </>
  )
}
