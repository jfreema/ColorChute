import { useState } from 'react'
import { detachDesign } from '../editor/designs'
import { editor } from '../editor/store'
import { CANVAS_PRESETS, EPIC, SHIRT_CANVAS } from '../lib/printSpecs'
import { Dialog } from './Dialog'
import { FilePlus } from './icons'

export function NewDesignDialog({ onClose }: { onClose: () => void }) {
  const [preset, setPreset] = useState('shirt')
  const [w, setW] = useState(SHIRT_CANVAS.width)
  const [h, setH] = useState(SHIRT_CANVAS.height)
  const [dpi, setDpi] = useState(SHIRT_CANVAS.dpi)
  const [name, setName] = useState('')
  const pick = (id: string) => {
    const c = CANVAS_PRESETS.find((x) => x.id === id)!
    setPreset(id)
    setW(c.width)
    setH(c.height)
    setDpi(c.dpi)
  }
  const inch = (n: number) => (n / dpi).toFixed(2).replace(/\.?0+$/, '')
  const over = dpi === 300 && (w > EPIC.maxSide || h > EPIC.maxSide)
  const create = () => {
    detachDesign()
    editor.newDocument(w, h, dpi, name.trim() || 'Untitled')
    onClose()
  }
  return (
    <Dialog
      title="New design"
      icon={<FilePlus size={14} />}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn yellow" onClick={create}>Create</button>
        </>
      }
    >
      <div className="section-label">Name</div>
      <input className="field" style={{ width: '100%' }} placeholder="cyclone script" value={name} autoFocus
        onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
      <div className="section-label">Size</div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {CANVAS_PRESETS.map((c) => (
          <div key={c.id} className={`preset ${preset === c.id ? 'active' : ''}`} onClick={() => pick(c.id)}>
            <div>
              <div style={{ fontWeight: 800 }}>{c.name}</div>
              <div className="hint">{c.use}</div>
            </div>
            <div className="dims">
              {c.width} × {c.height} px
              <br />
              {c.dpi === 300 ? `${c.width / 300} × ${c.height / 300} in at 300 DPI` : 'for screens'}
            </div>
          </div>
        ))}
      </div>
      <div className="section-label">Custom</div>
      <div className="card card-row row">
        <input className="field num" type="number" value={w} aria-label="Width in pixels"
          onChange={(e) => { setW(+e.target.value); setPreset('') }} />
        ×
        <input className="field num" type="number" value={h} aria-label="Height in pixels"
          onChange={(e) => { setH(+e.target.value); setPreset('') }} />
        px at
        <input className="field num" type="number" value={dpi} style={{ width: 60 }} aria-label="DPI"
          onChange={(e) => setDpi(+e.target.value || 300)} />
        DPI
        <span className="hint">= {inch(w)} × {inch(h)} in</span>
      </div>
      {over && <p style={{ color: '#fff', fontWeight: 700 }}>Over Epic's 3300 px limit. Fine to work big, but trim or resize before export.</p>}
    </Dialog>
  )
}
