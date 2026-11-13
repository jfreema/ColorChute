import { useEffect, useState } from 'react'
import { deleteDesign, duplicateDesign, openDesign, refreshLibrary, renameDesign, useDesigns } from '../editor/designs'
import { Dialog } from './Dialog'
import { Copy, Library, Pencil, Trash2 } from './icons'

export function LibraryDialog({ onClose, confirmDiscard }: { onClose: () => void; confirmDiscard: (then: () => void) => void }) {
  const library = useDesigns((s) => s.library)
  const current = useDesigns((s) => s.designId)
  const [loaded, setLoaded] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  useEffect(() => {
    refreshLibrary().finally(() => setLoaded(true))
  }, [])
  return (
    <Dialog title="Saved designs" icon={<Library size={14} />} chip="var(--green)" wide onClose={onClose}>
      <p style={{ color: '#fff', margin: '6px 2px 10px', opacity: 0.9 }}>
        Saved in this browser on this computer. To move a design to another computer, use More, then Download project file, and open it there.
      </p>
      {loaded && !library.length && <div className="empty">No saved designs yet. Press Save and your design shows up here.</div>}
      <div className="library-grid">
        {library.map((d) => (
          <div
            key={d.id}
            className="card design-card"
            role="button"
            tabIndex={0}
            onClick={() => confirmDiscard(() => openDesign(d.id).then(onClose))}
            style={d.id === current ? { outline: '3px solid var(--yellow)', outlineOffset: 1 } : undefined}
          >
            <div className="thumb checker" style={d.shirt ? { background: d.shirt } : undefined}>
              {d.thumb && <img src={d.thumb} alt="" />}
            </div>
            <div className="meta">
              {renaming === d.id ? (
                <input
                  className="field"
                  style={{ width: '100%', height: 24 }}
                  autoFocus
                  defaultValue={d.name}
                  aria-label="Design name"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== d.name) renameDesign(d.id, v)
                    setRenaming(null)
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                />
              ) : (
                <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
              )}
              <div className="hint">
                {d.optionCount} color option{d.optionCount === 1 ? '' : 's'} · {new Date(d.updatedAt).toLocaleDateString()}
              </div>
              <div className="acts" onClick={(e) => e.stopPropagation()}>
                <button className="icon-btn" title="Rename" aria-label={`Rename ${d.name}`}
                  onClick={() => setRenaming(d.id)}><Pencil size={15} /></button>
                <button className="icon-btn" title="Duplicate" aria-label={`Duplicate ${d.name}`}
                  onClick={() => duplicateDesign(d.id)}><Copy size={15} /></button>
                <span className="grow" />
                {deleting === d.id ? (
                  <button className="btn small red" autoFocus onBlur={() => setDeleting(null)}
                    onClick={() => { setDeleting(null); deleteDesign(d.id) }}>
                    Delete for good
                  </button>
                ) : (
                  <button className="icon-btn" title="Delete" aria-label={`Delete ${d.name}`}
                    onClick={() => setDeleting(d.id)}><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
