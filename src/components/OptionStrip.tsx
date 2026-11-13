import { useState } from 'react'
import { deleteOption, openOption, renameOption, saveAsNewOption, useDesigns } from '../editor/designs'
import { useEditor } from '../editor/store'
import { Plus, X } from './icons'

/** The open design's saved color options, side by side, for comparing schemes */
export function OptionStrip({ confirmDiscard }: { confirmDiscard: (then: () => void) => void }) {
  const options = useDesigns((s) => s.options)
  const optionId = useDesigns((s) => s.optionId)
  const busy = useDesigns((s) => s.busy)
  const dirty = useEditor((s) => s.dirty)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <div className="strip-row">
      <div className="strip-label"
        title={options.length ? 'Click one to switch, double-click to rename' : 'Save the colors you have now, swap inks, then save another to compare'}>
        Color<br />options
      </div>
      <div className="strip">
        {options.map((o) => (
          <div
            key={o.id}
            role="button"
            tabIndex={0}
            className={`card option-card ${o.id === optionId ? 'active' : ''}`}
            onClick={() => o.id !== optionId && !busy && confirmDiscard(() => openOption(o.id))}
            onDoubleClick={() => setRenaming(o.id)}
            onKeyDown={(e) => e.key === 'Enter' && o.id !== optionId && confirmDiscard(() => openOption(o.id))}
          >
            <div className="thumb checker" style={o.shirt ? { background: o.shirt } : undefined}><img src={o.thumb} alt="" /></div>
            <div className="meta">
              {renaming === o.id ? (
                <input
                  className="field"
                  style={{ height: 22, width: '100%' }}
                  autoFocus
                  defaultValue={o.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== o.name) renameOption(o.id, v)
                    setRenaming(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <div className="nm" title={o.name}>{o.name}{o.id === optionId && dirty ? ' •' : ''}</div>
              )}
              <div className="dots">{o.swatches.slice(0, 6).map((c) => <span key={c} style={{ background: c }} />)}</div>
            </div>
            {deleting === o.id ? (
              <button
                className="btn small red x"
                style={{ display: 'inline-flex' }}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleting(null)
                  deleteOption(o.id)
                }}
                onBlur={() => setDeleting(null)}
                autoFocus
              >
                Delete
              </button>
            ) : (
              <button
                className="btn small icon x"
                title="Delete this option"
                aria-label={`Delete ${o.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleting(o.id)
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        ))}
        <button className="card option-card add" disabled={busy} onClick={() => saveAsNewOption()}
          title="Save the colors you have now as another option to compare">
          <Plus size={16} />
          {options.length ? 'Save as new option' : 'Save first option'}
        </button>
      </div>
    </div>
  )
}
