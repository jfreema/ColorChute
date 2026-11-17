import { useEffect, useRef, useState } from 'react'
import { useAccount } from '../editor/account'
import { save, share, unshare, useDesigns } from '../editor/designs'
import { buildLink, stageView } from '../editor/links'
import { editor, useEditor } from '../editor/store'
import { shirtColorName } from '../lib/palettes'
import { GARMENT_LABEL, studioFor } from '../lib/shirt'
import { Dialog } from './Dialog'
import { Check, Copy, Link2, Link2Off, Save, Share2 } from './icons'

const BACKGROUNDS = { square: 'Square', realistic: 'Realistic shirt' }

/**
 * A link to the open design that anyone can open without signing in, set to open the way it looks now: same color
 * option, background, shirt color and zoom. My own designs get a share link I can turn off; public designs and
 * designs someone shared with me pass their own link along.
 */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const designId = useDesigns((s) => s.designId)
  const openFrom = useDesigns((s) => s.openFrom)
  const optionId = useDesigns((s) => s.optionId)
  const optionName = useDesigns((s) => s.options.find((o) => o.id === s.optionId)?.name)
  const designName = useDesigns((s) => s.designName)
  const mine = useDesigns((s) => (s.openFrom === 'mine' ? s.library.find((d) => d.id === s.designId) : undefined))
  const busy = useDesigns((s) => s.busy)
  const dirty = useEditor((s) => s.dirty)
  const preview = useEditor((s) => s.preview)
  const approved = useAccount((s) => s.user?.status === 'approved')
  // What the stage showed when the dialog opened; null when it was fitted to the whole scene
  const [frame] = useState(() => stageView.frame)
  const [withView, setWithView] = useState(true)
  const [copied, setCopied] = useState(false)
  const [stopping, setStopping] = useState(false)
  const field = useRef<HTMLInputElement>(null)

  const target: { kind: 's' | 'p'; id: string } | null = !designId ? null
    : openFrom === 'shared' ? { kind: 's', id: designId }
      : openFrom === 'public' ? { kind: 'p', id: designId }
        : mine?.shared ? { kind: 's', id: mine.shared } : null
  const linkFor = (t: { kind: 's' | 'p'; id: string }) =>
    buildLink(location.origin, t.kind, t.id, { option: optionId, preview, frame: withView ? frame : null })
  const link = target ? linkFor(target) : null
  useEffect(() => setCopied(false), [link])

  /** Copies the link. A browser can refuse when it wasn't a direct click; then the link is selected to copy by hand. */
  const copy = async (text: string, quiet = false) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      field.current?.focus()
      field.current?.select()
      if (!quiet) editor.toast(`Press ${/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘C' : 'Ctrl+C'} to copy the link`)
    }
  }
  const create = async () => {
    if (!designId) return
    const token = await share(designId)
    if (token) copy(linkFor({ kind: 's', id: token }), true)
  }
  const canSend = typeof navigator.share === 'function'
  const send = () => link && navigator.share({ title: designName, url: link }).catch(() => {})

  const shirt = shirtColorName(preview.shirtColor, preview.shirtCollection)
  const look = preview.mode === 'square'
    ? `${BACKGROUNDS.square} background`
    : `${preview.mode === 'realistic' && studioFor(preview.garment) ? BACKGROUNDS.realistic
      : GARMENT_LABEL[preview.garment ?? 'tee']}, ${shirt?.name ?? preview.shirtColor.toUpperCase()}`

  if (!designId) {
    return (
      <Dialog title="Share" icon={<Share2 size={14} />} chip="var(--sky)" onClose={onClose}
        footer={approved ? (
          <>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn yellow" disabled={busy} onClick={() => save()}><Save size={15} /> Save design</button>
          </>
        ) : undefined}>
        <p className="dialog-text">
          {approved
            ? 'Save this design first. A share link shows the design as you last saved it, with all its color options.'
            : 'Open a design to share it.'}
        </p>
      </Dialog>
    )
  }

  const about = openFrom === 'public'
    ? 'This design is public, so anyone with this link can open it. They don’t need to sign in.'
    : openFrom === 'shared'
      ? 'Anyone with this link can look at this design and its color options, for as long as its owner keeps sharing it.'
      : `${link ? 'Anyone with this link' : 'Make a link so anyone who has it'} can look at this design and flip through its color options without signing in. They can’t change it.${mine?.public ? '' : ' It stays off the public designs list.'}`

  return (
    <Dialog title={`Share ${designName}`} icon={<Share2 size={14} />} chip="var(--sky)" onClose={onClose}
      footer={
        <>
          {openFrom === 'mine' && link && (stopping ? (
            <button className="btn red" autoFocus onBlur={() => setStopping(false)} disabled={busy}
              onClick={() => { setStopping(false); unshare(designId) }}>
              Turn off for good
            </button>
          ) : (
            <button className="btn" onClick={() => setStopping(true)}
              title="Stop this link from working. Sharing again makes a new link.">
              <Link2Off size={15} /> Turn off link
            </button>
          ))}
          <span className="grow" />
          {link ? (
            <>
              {canSend && <button className="btn" onClick={send}><Share2 size={15} /> Send…</button>}
              <button className={`btn ${copied ? 'green' : 'yellow'}`} onClick={() => copy(link)}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </>
          ) : (
            <>
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn yellow" disabled={busy} onClick={create}><Link2 size={15} /> Make link</button>
            </>
          )}
        </>
      }>
      <p className="dialog-text">{about}</p>
      {link && (
        <input ref={field} className="field" readOnly value={link} aria-label="Share link"
          style={{ width: '100%', height: 34, fontSize: 13, marginBottom: 10 }}
          onFocus={(e) => e.target.select()} />
      )}
      <div className="card">
        <div className="check-row">
          <span className="lbl">Opens on</span>
          <span className="grow">{optionName ?? 'The first color option'}</span>
        </div>
        <div className="check-row">
          <span className="lbl">Shown on</span>
          <span className="grow">{look}</span>
        </div>
        <div className="check-row">
          <span className="lbl">Zoom</span>
          {frame ? (
            <label className="row tight grow">
              <input type="checkbox" checked={withView} onChange={(e) => setWithView(e.target.checked)} />
              Zoomed in the way you see it now
            </label>
          ) : (
            <span className="grow">Fits their screen</span>
          )}
        </div>
      </div>
      <p className="hint" style={{ color: '#fff', opacity: 0.85, margin: '8px 2px 0' }}>
        They can switch color options and backgrounds themselves once it’s open.
      </p>
      {dirty && (
        <div className="card card-row tinted row" style={{ marginTop: 10, gap: 10 }}>
          <span className="grow">
            {openFrom === 'mine'
              ? 'You have changes that aren’t saved. The link shows the last saved version.'
              : 'Your changes aren’t in this link. It shows the design as its owner saved it.'}
          </span>
          {openFrom === 'mine' && approved && (
            <button className="btn small yellow" disabled={busy} onClick={() => save()}><Save size={13} /> Save</button>
          )}
        </div>
      )}
    </Dialog>
  )
}
