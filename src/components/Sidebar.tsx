import { useEffect, useRef, useState } from 'react'
import { designInks } from '../editor/checks'
import { ColorCount } from '../editor/pixels'
import { editor, useEditor } from '../editor/store'
import { isHex, normalizeHex } from '../lib/color'
import {
  BOARD_COLORS, EPIC_MATCH, epicColorName, INK_COLLECTIONS, inkCollection, inkColorName, nearestEpicColor,
  shirtCollection, shirtCollectionGroups, shirtColorName, shirtSwatchBackground,
} from '../lib/palettes'
import { EPIC } from '../lib/printSpecs'
import { ColorInput } from './ColorInput'
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, ImagePlus, Merge, Plus, Trash2 } from './icons'

export function Sidebar({ onPlaceImage, viewOnly }: { onPlaceImage: () => void; viewOnly?: boolean }) {
  // Looking only: just the preview settings, which change nothing about the design
  return (
    <aside className="sidebar">
      {!viewOnly && <ColorsPanel />}
      {!viewOnly && <InksPanel />}
      {!viewOnly && <LayersPanel onPlaceImage={onPlaceImage} />}
      <PreviewPanel />
    </aside>
  )
}

// MARK: Colors

const INKS_KEY = 'colorchute.inkCollection'

/** The print color group picked in the palette, remembered in this browser */
function useInkCollection() {
  const [id, setId] = useState(() => {
    try {
      return localStorage.getItem(INKS_KEY) ?? 'epic'
    } catch {
      return 'epic'
    }
  })
  const choose = (next: string) => {
    setId(next)
    try {
      localStorage.setItem(INKS_KEY, next)
    } catch {
      // Private windows can refuse storage; the choice just won't stick
    }
  }
  return [inkCollection(id), choose] as const
}

function ColorsPanel() {
  const primary = useEditor((s) => s.primary)
  const recent = useEditor((s) => s.recent)
  const [text, setText] = useState(primary)
  const [collection, setCollection] = useInkCollection()
  useEffect(() => setText(primary), [primary])
  const named = inkColorName(primary, collection.id)
  const epicName = epicColorName(primary)
  const title = named
    ? `${named.name}${named.collection !== collection ? ` (${named.collection.name})` : ''}`
    : collection.id === 'epic' ? 'Custom, not an Epic color' : 'Custom color'
  return (
    <>
      <div className="section-label">Fill color</div>
      <div className="card">
        <div className="card-row row">
          <ColorInput className="swatch big-swatch" value={primary} onChange={(c) => editor.setPrimary(c)} title="Pick any color" />
          <div className="grow">
            <div style={{ fontWeight: 900, fontSize: 15 }}>{title}</div>
            <div className="row tight" style={{ marginTop: 4, flexWrap: 'nowrap' }}>
              <input
                className="field"
                style={{ width: 100, flex: 'none' }}
                value={text}
                aria-label="Hex color"
                onChange={(e) => {
                  setText(e.target.value)
                  if (isHex(e.target.value)) editor.setPrimary(e.target.value)
                }}
                onBlur={() => setText(primary)}
              />
              {/* Says whether Epic can print it, unless the name above already does */}
              {named?.collection.id !== 'epic' && (named || collection.id !== 'epic') && (
                <span className="hint" title="Epic Sports prints the shirts, so its colors are the safe choice">
                  {epicName ? `Epic: ${epicName}` : 'Not an Epic color'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="card-row">
          <div className="row tight" style={{ marginBottom: 8 }}>
            <b className="grow">Print colors</b>
            <select className="field small" value={collection.id} title={collection.about} aria-label="Print colors from"
              onChange={(e) => setCollection(e.target.value)}>
              {INK_COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="swatch-grid">
            {collection.colors.map((c) => (
              <button key={c.hex} className={`swatch ${c.hex === primary ? 'selected' : ''}`} style={{ background: c.hex }}
                title={`${c.name} ${c.hex}`} aria-label={c.name} onClick={() => editor.setPrimary(c.hex)} />
            ))}
          </div>
          <div className="hint" style={{ marginTop: 6 }}>{collection.about}</div>
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
  const hidden = useEditor((s) => s.hiddenInks)
  const [inks, setInks] = useState<ColorCount[]>([])
  useEffect(() => {
    const id = setTimeout(() => {
      const found = designInks(editor.composite())
      setInks(found)
      editor.keepHiddenInks(found.map((k) => k.hex))
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
        {inks.map((ink) => {
          const off = hidden.includes(ink.hex)
          const name = epicColorName(ink.hex) ?? ink.hex
          return (
            <div className={`ink-row ${off ? 'off' : ''}`} key={ink.hex}>
              <button
                className="icon-btn"
                title={off ? 'Show this ink again' : 'Hide this ink on screen so the shirt shows through. The art isn\'t changed.'}
                aria-label={off ? `Show ${name}` : `Hide ${name}`}
                aria-pressed={off}
                onClick={() => editor.toggleInk(ink.hex)}
              >
                {off ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button className={`swatch ${ink.hex === primary ? 'selected' : ''}`} style={{ background: ink.hex }}
                title="Use this color" aria-label={`Use ${ink.hex}`} onClick={() => editor.setPrimary(ink.hex)} />
              <div className="grow">
                <div className="hex">{name}</div>
                <div className="share">
                  {off ? 'Hidden' : `${Math.round(ink.share * 100)}% of the art`}
                  {(() => {
                    const near = nearestEpicColor(ink.hex)
                    if (near.distance < EPIC_MATCH) return null
                    return (
                      <>
                        {' · '}
                        <button className="link-btn" title={`Not one of Epic's colors. Change it to ${near.swatch.name} on every layer.`}
                          onClick={() => editor.replaceEverywhere(ink.hex, near.swatch.hex, inks.map((k) => k.hex))}>
                          Use {near.swatch.name}
                        </button>
                      </>
                    )
                  })()}
                </div>
              </div>
              <button
                className="btn small"
                disabled={ink.hex === primary}
                title={`Change this ink, and only this ink, to the fill color on every layer`}
                onClick={() => editor.replaceEverywhere(ink.hex, primary, inks.map((k) => k.hex))}
              >
                Swap to <span className="swatch" style={{ width: 14, height: 14, borderRadius: 4, background: primary }} />
              </button>
            </div>
          )
        })}
        {hidden.length > 0 && (
          <div className="card-row hint ink-hidden-note">
            Hidden on screen only. Saving and exporting still include every ink.{' '}
            <button className="link-btn" onClick={() => editor.showAllInks()}>Show all</button>
          </div>
        )}
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
                  {shirtCollectionGroups().map((g) => {
                    const options = g.collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)
                    return g.family ? <optgroup key={g.family} label={g.family}>{options}</optgroup> : options
                  })}
                </select>
              </div>
              <div className="swatch-grid shirts">
                {collection.colors.map((c) => (
                  <button key={c.name} className={`swatch ${p.shirtColor.toUpperCase() === c.hex.toUpperCase() ? 'selected' : ''}`}
                    style={{ background: shirtSwatchBackground(c.hex) }} title={c.name} aria-label={`${c.name} shirt`}
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
