import { useEffect, useRef, useState } from 'react'
import { renameOption, useDesigns } from '../editor/designs'
import { editor, useEditor } from '../editor/store'
import { ChevronDown, Download, FilePlus, FolderOpen, Library, Redo2, Save, Scaling, Undo2 } from './icons'
import { Logo } from './Logo'

export interface HeaderActions {
  library: () => void
  newDesign: () => void
  open: () => void
  save: () => void
  saveAsOption: () => void
  saveFile: () => void
  placeImage: () => void
  exportFile: () => void
  resize: () => void
}

function Menu({ items }: { items: { label: string; hint?: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className={`btn ${open ? 'pressed' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        More <ChevronDown size={14} />
      </button>
      {open && (
        <div className="card" role="menu" style={{ position: 'absolute', right: 0, top: 36, zIndex: 40, minWidth: 250, overflow: 'hidden' }}>
          {items.map((it) => (
            <div key={it.label} role="menuitem" className="preset" onClick={() => { setOpen(false); it.onClick() }}>
              <b>{it.label}</b>
              {it.hint && <span className="dims">{it.hint}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function Header({ actions }: { actions: HeaderActions }) {
  const name = useEditor((s) => s.name)
  const dirty = useEditor((s) => s.dirty)
  const canUndo = useEditor((s) => s.canUndo)
  const canRedo = useEditor((s) => s.canRedo)
  const undoLabel = useEditor((s) => s.undoLabel)
  const redoLabel = useEditor((s) => s.redoLabel)
  const busy = useDesigns((s) => s.busy)
  const w = useEditor((s) => s.width)
  const h = useEditor((s) => s.height)
  const dpi = useEditor((s) => s.dpi)
  const inch = (n: number) => (n / dpi).toFixed(2).replace(/\.?0+$/, '')
  const optionId = useDesigns((s) => s.optionId)
  const optionName = useDesigns((s) => s.options.find((o) => o.id === s.optionId)?.name)
  const [renaming, setRenaming] = useState(false)
  const mac = /Mac|iPhone|iPad/.test(navigator.platform)
  const mod = mac ? '⌘' : 'Ctrl+'

  return (
    <header className="header">
      <span className="icon-chip" style={{ background: '#fff', width: 30, height: 30, borderRadius: 8 }}>
        <Logo size={23} />
      </span>
      <span className="title">ColorChute</span>
      <input className="name" value={name} aria-label="Design name" title="Design name"
        onChange={(e) => editor.setName(e.target.value)} />
      {optionName && optionId && (renaming ? (
        <input className="field option-name" autoFocus defaultValue={optionName} aria-label="Color option name"
          onFocus={(e) => e.target.select()}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== optionName) renameOption(optionId, v)
            setRenaming(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            if (e.key === 'Escape') setRenaming(false)
          }} />
      ) : (
        <button className="pill pill-btn" style={{ background: 'var(--sky)' }} onClick={() => setRenaming(true)}
          title="Color option name. Click to rename it.">
          {optionName}
        </button>
      ))}
      {dirty && <span className="dirty-dot" title="Unsaved changes" />}
      <button className="btn small" onClick={actions.resize} title={`Resize or change canvas size: ${w} × ${h} px, ${inch(w)} × ${inch(h)} in at ${dpi} DPI`}>
        <Scaling size={14} /> {w} × {h}
      </button>
      <span className="grow" />
      <button className="btn icon" disabled={!canUndo} onClick={() => editor.undo()} title={`Undo ${undoLabel ?? ''} (${mod}Z)`} aria-label="Undo">
        <Undo2 size={15} />
      </button>
      <button className="btn icon" disabled={!canRedo} onClick={() => editor.redo()} title={`Redo ${redoLabel ?? ''} (${mod}Shift+Z)`} aria-label="Redo">
        <Redo2 size={15} />
      </button>
      <button className="btn green" onClick={actions.library} title="Your saved designs">
        <Library size={15} /> Designs
      </button>
      <button className="btn" onClick={actions.newDesign} title="New design">
        <FilePlus size={15} /> New
      </button>
      <button className="btn" onClick={actions.open} title={`Open an image or project file (${mod}O)`}>
        <FolderOpen size={15} /> Open
      </button>
      <button className="btn" onClick={actions.save} disabled={busy} title={`Save this color option (${mod}S)`}>
        <Save size={15} /> Save
      </button>
      <Menu
        items={[
          { label: 'Save as new color option', hint: `${mod}Shift+S`, onClick: actions.saveAsOption },
          { label: 'Add image as a layer', hint: 'or drop / paste', onClick: actions.placeImage },
          { label: 'Resize or canvas size…', onClick: actions.resize },
          { label: 'Download project file', hint: '.colorchute', onClick: actions.saveFile },
        ]}
      />
      <button className="btn yellow" onClick={actions.exportFile} title={`Export (${mod}E)`}>
        <Download size={15} /> Export
      </button>
    </header>
  )
}
