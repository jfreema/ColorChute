import { useState } from 'react'
import { editor, useEditor } from '../editor/store'
import { EPIC } from '../lib/printSpecs'
import { Dialog } from './Dialog'
import { Scaling } from './icons'

export function ResizeDialog({ onClose }: { onClose: () => void }) {
  const W = useEditor((s) => s.width)
  const H = useEditor((s) => s.height)
  const D = useEditor((s) => s.dpi)
  const [mode, setMode] = useState<'scale' | 'canvas'>('scale')
  const [w, setW] = useState(W)
  const [h, setH] = useState(H)
  const [dpi, setDpi] = useState(D)
  const [lock, setLock] = useState(true)
  const [resample, setResample] = useState<'hard' | 'smooth'>('hard')
  const inch = (n: number) => +(n / dpi).toFixed(3)
  const setWidth = (v: number) => {
    setW(v)
    if (lock && mode === 'scale') setH(Math.max(1, Math.round((v * H) / W)))
  }
  const setHeight = (v: number) => {
    setH(v)
    if (lock && mode === 'scale') setW(Math.max(1, Math.round((v * W) / H)))
  }
  const apply = () => {
    if (w < 1 || h < 1) return
    if (mode === 'scale') editor.resize(w, h, resample, dpi)
    else {
      editor.canvasSize(w, h)
      if (dpi !== D) editor.setDpi(dpi)
    }
    onClose()
  }
  const big = w * h > 9000 * 9000
  return (
    <Dialog
      title="Resize"
      icon={<Scaling size={14} />}
      chip="var(--sky)"
      onClose={onClose}
      footer={
        <>
          <span className="hint">Now {W} × {H} px · {+(W / D).toFixed(2)} × {+(H / D).toFixed(2)} in</span>
          <span className="grow" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn yellow" disabled={big} onClick={apply}>Apply</button>
        </>
      }
    >
      <div className="segmented" style={{ marginTop: 8 }}>
        <button className={mode === 'scale' ? 'active' : ''} onClick={() => setMode('scale')}>Scale the art</button>
        <button className={mode === 'canvas' ? 'active' : ''} onClick={() => setMode('canvas')}>Change canvas size</button>
      </div>
      <div className="section-label">Size</div>
      <div className="card">
        <div className="card-row row">
          <b style={{ width: 50 }}>Width</b>
          <input className="field num" type="number" value={w} onChange={(e) => setWidth(+e.target.value)} aria-label="Width in pixels" />
          px
          <input className="field num" type="number" step={0.01} value={inch(w)} aria-label="Width in inches"
            onChange={(e) => setWidth(Math.round(+e.target.value * dpi))} />
          in
          {[2250, 2700, 3000, 3300].map((n) => (
            <button key={n} className="btn small" onClick={() => setWidth(n)} title={`${n / 300} in at 300 DPI`}>{n}</button>
          ))}
        </div>
        <div className="card-row row">
          <b style={{ width: 50 }}>Height</b>
          <input className="field num" type="number" value={h} onChange={(e) => setHeight(+e.target.value)} aria-label="Height in pixels" />
          px
          <input className="field num" type="number" step={0.01} value={inch(h)} aria-label="Height in inches"
            onChange={(e) => setHeight(Math.round(+e.target.value * dpi))} />
          in
        </div>
        <div className="card-row row tinted">
          <b style={{ width: 50 }}>DPI</b>
          <input className="field num" type="number" value={dpi} onChange={(e) => setDpi(Math.max(1, +e.target.value || 300))} aria-label="DPI" />
          {mode === 'scale' && (
            <button className={`btn small ${lock ? 'on' : ''}`} onClick={() => setLock(!lock)}>Keep proportions</button>
          )}
        </div>
      </div>
      {mode === 'scale' && (
        <>
          <div className="section-label">Edges</div>
          <div className="card">
            <label className="card-row row" style={{ cursor: 'pointer' }}>
              <input type="radio" checked={resample === 'hard'} onChange={() => setResample('hard')} />
              <div><b>Hard</b> <span className="hint">keeps flat inks exact, no new colors. Best for shirt art.</span></div>
            </label>
            <label className="card-row row" style={{ cursor: 'pointer' }}>
              <input type="radio" checked={resample === 'smooth'} onChange={() => setResample('smooth')} />
              <div><b>Smooth</b> <span className="hint">softer edges, adds in-between colors. Best for photos and screen logos.</span></div>
            </label>
          </div>
        </>
      )}
      {mode === 'canvas' && <p style={{ color: '#fff' }}>The art stays the same size, centered on the new canvas.</p>}
      {(w > EPIC.maxSide || h > EPIC.maxSide) && dpi === 300 && (
        <p style={{ color: '#fff', fontWeight: 700 }}>Over Epic's 3300 px (11 in) limit.</p>
      )}
      {big && <p style={{ color: '#fff', fontWeight: 700 }}>That's too big for a browser to edit.</p>}
    </Dialog>
  )
}
