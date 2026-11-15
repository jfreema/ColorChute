import { useEffect, useState } from 'react'
import { showPrompt, signIn, useAccount } from '../editor/account'
import {
  copyLocalDesigns, deleteDesign, duplicateDesign, openDesign, refreshLibrary, renameDesign, setPublic, useDesigns,
} from '../editor/designs'
import type { DesignSummary } from '../editor/storage'
import { shirtBackground } from '../lib/palettes'
import { Dialog } from './Dialog'
import { CloudUpload, Copy, Globe, Library, LogIn, Pencil, Trash2 } from './icons'

/** My designs: where they're kept, and older ones from this browser to copy in */
function MineNote() {
  const localOnly = useDesigns((s) => s.localOnly.length)
  const busy = useDesigns((s) => s.busy)
  const admin = useAccount((s) => !!s.user?.admin)
  return (
    <>
      <p className="dialog-text">
        Saved to your account, so they're here on any computer you sign in on.
        {admin && ' Click the globe on one to make it available to the public.'}
      </p>
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

/** Public designs: who can see them, and what someone who can't edit can do about it */
function PublicNote() {
  const user = useAccount((s) => s.user)
  const configured = useAccount((s) => s.configured)
  if (user?.status === 'approved') {
    return <p className="dialog-text">Anyone can look at these, signed in or not. Open one to start from it. Saving makes your own copy.</p>
  }
  if (user) {
    return (
      <div className="card card-row tinted row" style={{ margin: '6px 4px 10px', gap: 10 }}>
        <span className="grow">
          {user.status === 'pending'
            ? 'Your account is waiting for approval. Until then you can look at these designs.'
            : "Your account doesn't have access to edit. You can still look at these designs."}
        </span>
        <button className="btn small" onClick={() => showPrompt(user.status === 'pending' ? 'pending' : 'denied')}>Details</button>
      </div>
    )
  }
  return (
    <div className="card card-row tinted row" style={{ margin: '6px 4px 10px', gap: 10 }}>
      <span className="grow">
        Open any of these to see its color options on a shirt. To make and save your own designs, sign in
        {configured ? '.' : ' (not working on this site right now).'}
      </span>
      {configured && <button className="btn small green" onClick={signIn}><LogIn size={14} /> Sign in with Google</button>}
    </div>
  )
}

function DesignCard({ d, selected, onOpen, editable, admin }: {
  d: DesignSummary
  selected: boolean
  onOpen: () => void
  /** One of mine: rename, duplicate and delete */
  editable?: boolean
  /** Can make it public */
  admin?: boolean
}) {
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <div
      className="card design-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && onOpen()}
      style={selected ? { outline: '3px solid var(--yellow)', outlineOffset: 1 } : undefined}
    >
      <div className="thumb checker" style={d.shirt ? { background: shirtBackground(d.shirt, 160) } : undefined}>
        {d.thumb && <img src={d.thumb} alt="" />}
      </div>
      <div className="meta">
        {renaming ? (
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
              setRenaming(false)
            }}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setRenaming(false)
            }}
          />
        ) : (
          <div style={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</div>
        )}
        <div className="hint">
          {d.optionCount} color option{d.optionCount === 1 ? '' : 's'} · {new Date(d.updatedAt).toLocaleDateString()}
          {d.mine && ' · Yours'}
          {d.shared && ' · Shared by link'}
        </div>
        {editable && <div className="acts" onClick={(e) => e.stopPropagation()}>
          <button className="icon-btn" title="Rename" aria-label={`Rename ${d.name}`}
            onClick={() => setRenaming(true)}><Pencil size={15} /></button>
          <button className="icon-btn" title="Duplicate" aria-label={`Duplicate ${d.name}`}
            onClick={() => duplicateDesign(d.id)}><Copy size={15} /></button>
          {admin && (
            <button className={`icon-btn ${d.public ? 'on' : ''}`} aria-pressed={!!d.public}
              title={d.public ? 'Available to public. Click to make it private.' : 'Make available to public'}
              aria-label={d.public ? `Make ${d.name} private` : `Make ${d.name} available to public`}
              onClick={() => setPublic(d.id, !d.public)}><Globe size={15} /></button>
          )}
          <span className="grow" />
          {deleting ? (
            <button className="btn small red" autoFocus onBlur={() => setDeleting(false)}
              onClick={() => { setDeleting(false); deleteDesign(d.id) }}>
              Delete for good
            </button>
          ) : (
            <button className="icon-btn" title="Delete" aria-label={`Delete ${d.name}`}
              onClick={() => setDeleting(true)}><Trash2 size={15} /></button>
          )}
        </div>}
      </div>
    </div>
  )
}

export function LibraryDialog({ onClose, confirmDiscard }: { onClose: () => void; confirmDiscard: (then: () => void) => void }) {
  const library = useDesigns((s) => s.library)
  const publicLibrary = useDesigns((s) => s.publicLibrary)
  const current = useDesigns((s) => s.designId)
  const openFrom = useDesigns((s) => s.openFrom)
  const approved = useAccount((s) => s.user?.status === 'approved')
  const admin = useAccount((s) => !!s.user?.admin)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    refreshLibrary().finally(() => setLoaded(true))
  }, [])
  const open = (id: string, from: 'mine' | 'public') => confirmDiscard(() => openDesign(id, from).then(onClose))

  return (
    <Dialog title="Designs" icon={<Library size={14} />} chip="var(--green)" wide onClose={onClose}>
      {approved && (
        <>
          <div className="section-label">My designs</div>
          <MineNote />
          {loaded && !library.length && <div className="empty">No saved designs yet. Press Save and your design shows up here.</div>}
          <div className="library-grid">
            {library.map((d) => (
              <DesignCard key={d.id} d={d} editable admin={admin} selected={openFrom === 'mine' && d.id === current}
                onOpen={() => open(d.id, 'mine')} />
            ))}
          </div>
        </>
      )}
      <div className="section-label" style={approved ? { marginTop: 18 } : undefined}><Globe size={13} /> Public designs</div>
      <PublicNote />
      {loaded && !publicLibrary.length && (
        <div className="empty">
          No public designs yet.{admin && approved ? ' Click the globe on one of your designs to show it here.' : ''}
        </div>
      )}
      <div className="library-grid">
        {publicLibrary.map((d) => {
          // Your own public design opens as yours, so saving updates it
          const own = approved && d.mine && d.designId
          return (
            <DesignCard key={d.id} d={d}
              selected={own ? openFrom === 'mine' && d.designId === current : openFrom === 'public' && d.id === current}
              onOpen={() => (own ? open(d.designId!, 'mine') : open(d.id, 'public'))} />
          )
        })}
      </div>
    </Dialog>
  )
}
