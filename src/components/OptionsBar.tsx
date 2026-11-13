import { editor, useEditor } from '../editor/store'
import { Check, Crop, PaintBucket, Scissors } from './icons'

function Toggle({ on, label, onClick, title }: { on: boolean; label: string; onClick: () => void; title?: string }) {
  return (
    <button className={`btn small ${on ? 'on' : ''}`} onClick={onClick} title={title} aria-pressed={on}>
      {on ? <Check size={13} strokeWidth={3} /> : <span style={{ width: 13 }} />}
      {label}
    </button>
  )
}

function Tolerance() {
  const o = useEditor((s) => s.options)
  return (
    <>
      <div className="group" title="How close a color has to be to count as the same. 0 is exact.">
        <label className="lbl" htmlFor="tol">Tolerance</label>
        <input id="tol" type="range" min={0} max={100} value={o.tolerance} style={{ width: 76 }}
          onChange={(e) => editor.setOptions({ tolerance: +e.target.value })} />
        <span style={{ width: 34 }}>{o.tolerance}%</span>
      </div>
      <Toggle on={o.contiguous} label="Touching only" onClick={() => editor.setOptions({ contiguous: !o.contiguous })}
        title="On: only the connected area. Off: that color everywhere on the layer." />
      <Toggle on={o.sampleAll} label="All layers" onClick={() => editor.setOptions({ sampleAll: !o.sampleAll })}
        title="Look at every visible layer to find the area, but paint on the active one" />
    </>
  )
}

export function OptionsBar() {
  const tool = useEditor((s) => s.tool)
  const o = useEditor((s) => s.options)
  const hasSel = useEditor((s) => !!s.selection)
  const crop = useEditor((s) => s.cropRect)
  const dpi = useEditor((s) => s.dpi)
  const inch = (n: number) => (n / dpi).toFixed(2).replace(/\.?0+$/, '')

  return (
    <div className="card options">
      {(tool === 'bucket' || tool === 'wand') && <Tolerance />}
      {tool === 'bucket' && (
        <button className="btn small" onClick={() => editor.fillSelection()} title="Fill the selection, or the whole layer">
          <PaintBucket size={14} /> Fill {hasSel ? 'selection' : 'layer'}
        </button>
      )}
      {(tool === 'wand' || tool === 'select') && (
        <span className="hint">Shift adds, Alt takes away{tool === 'wand' ? ', Alt-click picks in fill' : ''}</span>
      )}
      {(tool === 'pencil' || tool === 'eraser') && (
        <div className="group">
          <label className="lbl" htmlFor="size">Size</label>
          <input id="size" type="range" min={1} max={300} value={o.brushSize}
            onChange={(e) => editor.setOptions({ brushSize: +e.target.value })} />
          <input className="field num" type="number" min={1} max={2000} value={o.brushSize}
            onChange={(e) => editor.setOptions({ brushSize: Math.max(1, +e.target.value || 1) })} />
          <span className="hint">px · hard edge, no blur</span>
        </div>
      )}
      {tool === 'picker' && <span className="hint">Click to pick the fill color. Alt-click picks the second color.</span>}
      {tool === 'move' && <span className="hint">Drag to move the active layer. Arrow keys nudge 1 px, Shift 10 px.</span>}
      {tool === 'hand' && <span className="hint">Drag to pan. Pinch or Ctrl-scroll to zoom.</span>}
      {tool === 'crop' && (
        <>
          {crop ? (
            <span style={{ fontWeight: 800 }}>
              {Math.round(crop.w)} × {Math.round(crop.h)} px · {inch(crop.w)} × {inch(crop.h)} in
            </span>
          ) : (
            <span className="hint">Drag a box to crop to.</span>
          )}
          <button className="btn small green" disabled={!crop} onClick={() => crop && editor.crop(crop)}>
            <Crop size={14} /> Crop <span className="kbd">Enter</span>
          </button>
          {crop && <button className="btn small" onClick={() => editor.setCropRect(null)}>Cancel</button>}
          <button className="btn small" onClick={() => editor.trim()} title="Crop away empty edges around the art">
            <Scissors size={14} /> Trim empty edges
          </button>
        </>
      )}
      <div className="grow" />
      <div className="group">
        <button className="btn small" onClick={() => editor.selectAll()} title="Select all (Ctrl+A)">All</button>
        <button className="btn small" onClick={() => editor.deselect()} disabled={!hasSel} title="Deselect (Ctrl+D)">None</button>
        <button className="btn small" onClick={() => editor.invertSelection()} title="Invert selection (Ctrl+Shift+I)">Invert</button>
        <span className="sep" />
        <button className="btn small" disabled={!hasSel} onClick={() => editor.growSelection()}
          title={`Grow the selection by ${o.growBy} px`}>Grow</button>
        <button className="btn small" disabled={!hasSel} onClick={() => editor.shrinkSelection()}
          title={`Shrink the selection by ${o.growBy} px`}>Shrink</button>
        <input className="field num" style={{ width: 46, height: 24 }} type="number" min={1} max={500} value={o.growBy}
          title="Pixels to grow or shrink by" aria-label="Pixels to grow or shrink by"
          onChange={(e) => editor.setOptions({ growBy: Math.max(1, +e.target.value || 1) })} />
        <span className="sep" />
        <button className="btn small" disabled={!hasSel} onClick={() => editor.cropToSelection()} title="Crop to selection">
          <Crop size={14} />
        </button>
      </div>
    </div>
  )
}
