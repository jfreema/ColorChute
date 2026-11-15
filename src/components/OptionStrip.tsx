import { useState } from 'react'
import { deleteOption, openOption, renameOption, useDesigns } from '../editor/designs'
import { useEditor } from '../editor/store'
import { shirtBackground } from '../lib/palettes'
import { Pencil, Plus, X } from './icons'

/** The open design's saved color options, side by side, for comparing schemes */
export function OptionStrip({ confirmDiscard, onSaveAsOption, readOnly }: {
  confirmDiscard: (then: () => void) => void
  /** Asks for a name, then saves the current colors as a new option */
  onSaveAsOption: () => void
  /** Looking only: options can be switched, not renamed, deleted or added */
  readOnly?: boolean
}) {
  const options = useDesigns((s) => s.options)
  // A public or shared design's options belong to its owner; saving makes your own copy, which you can then change
  const locked = useDesigns((s) => s.openFrom !== 'mine') || readOnly
  const optionId = useDesigns((s) => s.optionId)
  const busy = useDesigns((s) => s.busy)
  const dirty = useEditor((s) => s.dirty)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  return (
    <div className="strip-row">
      <div className="strip-label"
        title={options.length ? 'Click one to switch. Click the pencil, or the open one’s name, to rename it.' : 'Save the colors you have now, swap inks, then save another to compare'}>
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
            onDoubleClick={() => !locked && setRenaming(o.id)}
            onKeyDown={(e) => e.key === 'Enter' && o.id !== optionId && confirmDiscard(() => openOption(o.id))}
          >
            <div className="thumb checker" style={o.shirt ? { background: shirtBackground(o.shirt, 160) } : undefined}><img src={o.thumb} alt="" /></div>
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
                    e.stopPropagation()
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <div
                  className={`nm ${o.id === optionId && !locked ? 'editable' : ''}`}
                  title={o.id === optionId && !locked ? `${o.name} (click to rename)` : o.name}
                  onClick={(e) => {
                    if (o.id !== optionId || locked) return
                    e.stopPropagation()
                    setRenaming(o.id)
                  }}
                >
                  {o.name}{o.id === optionId && dirty ? ' •' : ''}
                </div>
              )}
              <div className="dots">{o.swatches.slice(0, 6).map((c) => <span key={c} style={{ background: c }} />)}</div>
            </div>
            {!locked && renaming !== o.id && (
              <button
                className="btn small icon ren"
                title="Rename this option"
                aria-label={`Rename ${o.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setRenaming(o.id)
                }}
              >
                <Pencil size={12} />
              </button>
            )}
            {locked ? null : deleting === o.id ? (
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
        {!readOnly && (
          <button className="card option-card add" disabled={busy} onClick={onSaveAsOption}
            title="Save the colors you have now as another option to compare">
            <Plus size={16} />
            {options.length ? 'Save as new option' : 'Save first option'}
          </button>
        )}
      </div>
    </div>
  )
}
