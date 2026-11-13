import { useEffect, useState } from 'react'
import { showPrompt, signIn, useAccount } from '../editor/account'
import { copyLocalDesigns, deleteDesign, duplicateDesign, openDesign, refreshLibrary, renameDesign, useDesigns } from '../editor/designs'
import { Dialog } from './Dialog'
import { CloudUpload, Copy, Library, LogIn, Pencil, Trash2 } from './icons'

/** What the library is and who can change it, above the designs */
function LibraryNote() {
  const source = useDesigns((s) => s.source)
  const localOnly = useDesigns((s) => s.localOnly.length)
  const busy = useDesigns((s) => s.busy)
  const user = useAccount((s) => s.user)
  const configured = useAccount((s) => s.configured)
  if (source === 'cloud') {
    return (
      <>
        <p className="dialog-text">Saved to your account, so they're here on any computer you sign in on.</p>
        {localOnly > 0 && (
          <div className="card card-row tinted row" style={{ margin: '0 4px 10px', gap: 10 }}>
            <CloudUpload size={18} />
            <span className="grow">
              {localOnly === 1 ? '1 design is' : `${localOnly} designs are`} saved only in this browser, from before sign-in.
            </span>
            <button className="btn small green" disabled={busy} onClick={() => copyLocalDesigns()}>Copy to my account</button>
          </div>
        )}
      </>
    )
  }
  if (user) {
    return (
      <div className="card card-row tinted row" style={{ margin: '6px 4px 10px', gap: 10 }}>
        <span className="grow">
          {user.status === 'pending'
            ? 'Your account is waiting for approval. You can open these and play with them, but saving starts once the admin approves you.'
            : "Your account doesn't have access to save. You can open these and play with them."}
        </span>
        <button className="btn small" onClick={() => showPrompt(user.status === 'pending' ? 'pending' : 'denied')}>Details</button>
      </div>
    )
  }
  return (
    <div className="card card-row tinted row" style={{ margin: '6px 4px 10px', gap: 10 }}>
      <span className="grow">
        Open any of these and play with it. To save designs, sign in{configured ? '' : ' (not set up on this site yet)'}.
      </span>
      {configured && <button className="btn small green" onClick={signIn}><LogIn size={14} /> Sign in with Google</button>}
    </div>
  )
}

export function LibraryDialog({ onClose, confirmDiscard }: { onClose: () => void; confirmDiscard: (then: () => void) => void }) {
  const library = useDesigns((s) => s.library)
  const current = useDesigns((s) => s.designId)
  const editable = useDesigns((s) => s.source === 'cloud')
  const [loaded, setLoaded] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  useEffect(() => {
    refreshLibrary().finally(() => setLoaded(true))
  }, [])
  return (
    <Dialog title="Saved designs" icon={<Library size={14} />} chip="var(--green)" wide onClose={onClose}>
      <LibraryNote />
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
              {editable && <div className="acts" onClick={(e) => e.stopPropagation()}>
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
              </div>}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  )
}
