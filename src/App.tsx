import { useCallback, useEffect, useRef, useState } from 'react'
import { AccountDialog } from './components/AccountDialog'
import { AdminDialog } from './components/AdminDialog'
import { ExportDialog } from './components/ExportDialog'
import { Header } from './components/Header'
import { LibraryDialog } from './components/LibraryDialog'
import { NameOptionDialog } from './components/NameOptionDialog'
import { NewDesignDialog } from './components/NewDesignDialog'
import { OptionsBar } from './components/OptionsBar'
import { OptionStrip } from './components/OptionStrip'
import { ResizeDialog } from './components/ResizeDialog'
import { Sidebar } from './components/Sidebar'
import { Stage } from './components/Stage'
import { Toolbar, TOOLS } from './components/Toolbar'
import { Dialog } from './components/Dialog'
import { LogIn, Save } from './components/icons'
import { canSave, loadAccount, onAccountChange, requireSave, useAccount } from './editor/account'
import { readPixels } from './editor/doc'
import { detachDesign, getDesigns, openDesign, refreshLibrary, save } from './editor/designs'
import { clearCloudCache } from './editor/storage'
import { download } from './editor/exporting'
import { contentBounds } from './editor/pixels'
import { editor, hadSettings, ProjectFile, useEditor } from './editor/store'
import { slug } from './lib/printSpecs'
import { readPngDpi } from './lib/png'

type Modal = 'new' | 'resize' | 'export' | 'library' | 'nameOption' | 'admin' | null

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable
}

const FOCUS_KEY = 'colorchute.focus'

function loadFocus() {
  try {
    return localStorage.getItem(FOCUS_KEY) === '1'
  } catch {
    return false
  }
}

/** True when the canvas has nothing on it and no unsaved work, so an opened image can just replace it */
function isBlank() {
  const s = editor.state
  return !s.dirty && s.layers.length === 1 && !contentBounds(readPixels(s.layers[0].canvas)) && !getDesigns().designId
}

export function App() {
  const [modal, setModal] = useState<Modal>(null)
  const [pending, setPending] = useState<(() => void) | null>(null)
  const toast = useEditor((s) => s.toast)
  const [shownToast, setShownToast] = useState<string | null>(null)
  const openInput = useRef<HTMLInputElement>(null)
  const [focus, setFocus] = useState(loadFocus)
  const toggleFocus = useCallback(() => {
    setFocus((f) => {
      try {
        localStorage.setItem(FOCUS_KEY, f ? '0' : '1')
      } catch {
        // Private windows can refuse storage; the mode just won't stick
      }
      return !f
    })
  }, [])
  const placeInput = useRef<HTMLInputElement>(null)
  // Editing needs an approved account; everyone else can look at public designs. The dev server has no API, so it
  // edits freely.
  const approved = useAccount((s) => s.user?.status === 'approved')
  const devOffline = useAccount((s) => import.meta.env.DEV && s.loaded && !s.reachable)
  const viewOnly = !approved && !devOffline
  const viewRef = useRef(viewOnly)
  viewRef.current = viewOnly

  // Looking only, the hand tool pans; editing again picks the paint bucket back up
  // (It waits for the account, so an approved person's tool isn't swapped while the page loads.)
  const accountLoaded = useAccount((s) => s.loaded)
  useEffect(() => {
    if (!accountLoaded) return
    if (viewOnly) editor.setTool('hand')
    else if (editor.state.tool === 'hand') editor.setTool('bucket')
  }, [viewOnly, accountLoaded])
  // Someone looking for the first time sees designs on the realistic shirt
  useEffect(() => {
    if (accountLoaded && viewOnly && !hadSettings) editor.setPreview({ mode: 'realistic' })
  }, [viewOnly, accountLoaded])

  useEffect(() => {
    if (!toast) return
    setShownToast(toast.text)
    const id = setTimeout(() => setShownToast(null), 2400)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const load = () => refreshLibrary().catch(() => {})
    loadAccount().then(load).then(() => {
      // Someone just looking gets the newest public design up front instead of an empty canvas
      const first = getDesigns().publicLibrary[0]
      if (viewRef.current && first && !getDesigns().designId && isBlank()) openDesign(first.id, 'public')
    })
    const stop = onAccountChange(() => {
      if (!canSave()) {
        // Signed out: forget the account's designs, and don't save into one from here
        clearCloudCache()
        if (getDesigns().openFrom === 'mine') detachDesign()
      }
      load()
    })
    const warn = (e: BeforeUnloadEvent) => {
      if (editor.state.dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      stop()
      window.removeEventListener('beforeunload', warn)
    }
  }, [])

  /** Runs `then` now, or after asking about unsaved changes */
  const confirmDiscard = useCallback((then: () => void) => {
    if (!editor.state.dirty) then()
    else setPending(() => then)
  }, [])

  const openFile = useCallback(async (file: File) => {
    try {
      if (/\.(colorchute|json)$/i.test(file.name)) {
        const p = JSON.parse(await file.text()) as ProjectFile
        await editor.loadProject(p)
        detachDesign()
      } else {
        const dpi = file.type === 'image/png' ? readPngDpi(new Uint8Array(await file.arrayBuffer())) : null
        await editor.openImage(file, file.name, dpi ?? 300)
        detachDesign()
      }
    } catch (e) {
      editor.toast(e instanceof Error ? e.message : "Couldn't open that file")
    }
  }, [])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      if (viewRef.current) return void requireSave()
      for (const f of Array.from(files)) {
        if (/\.(colorchute|json)$/i.test(f.name)) confirmDiscard(() => openFile(f))
        else if (!f.type.startsWith('image/')) editor.toast(`${f.name} isn't an image`)
        else if (isBlank()) await openFile(f)
        else await editor.placeImage(f, f.name).catch(() => editor.toast(`Couldn't read ${f.name}`))
      }
    },
    [confirmDiscard, openFile],
  )

  const saveFile = useCallback(async () => {
    const p = await editor.toProject()
    download(new Blob([JSON.stringify(p)], { type: 'application/json' }), `${slug(editor.state.name)}.colorchute`)
  }, [])

  const actions = {
    library: () => setModal('library'),
    newDesign: () => confirmDiscard(() => setModal('new')),
    open: () => confirmDiscard(() => openInput.current?.click()),
    save: () => save(),
    saveAsOption: () => setModal('nameOption'),
    saveFile,
    placeImage: () => placeInput.current?.click(),
    exportFile: () => setModal('export'),
    resize: () => setModal('resize'),
    admin: () => setModal('admin'),
  }

  // Paste an image to add it as a layer
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e as unknown as KeyboardEvent)) return
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
      if (files.length) {
        e.preventDefault()
        addFiles(files)
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || modal) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      const s = editor.state
      // Looking only: previews, focus and zoom
      if (viewOnly && !(mod ? ['0', '=', '+', '-'].includes(k) : !e.altKey && ['1', '2', '3', 'f'].includes(k))) return
      if (mod) {
        const run = (fn: () => void) => {
          e.preventDefault()
          fn()
        }
        if (k === 'z' && e.shiftKey) return run(() => editor.redo())
        if (k === 'z') return run(() => editor.undo())
        if (k === 'y') return run(() => editor.redo())
        if (k === 's' && e.shiftKey) return run(actions.saveAsOption)
        if (k === 's') return run(actions.save)
        if (k === 'o') return run(actions.open)
        if (k === 'e') return run(actions.exportFile)
        if (k === 'a') return run(() => editor.selectAll())
        if (k === 'd') return run(() => editor.deselect())
        if (k === 'i' && e.shiftKey) return run(() => editor.invertSelection())
        if (k === '0') return run(() => window.dispatchEvent(new Event('colorchute:fit')))
        if (k === '=' || k === '+') return run(() => window.dispatchEvent(new CustomEvent('colorchute:zoom', { detail: 1.25 })))
        if (k === '-') return run(() => window.dispatchEvent(new CustomEvent('colorchute:zoom', { detail: 0.8 })))
        return
      }
      if (e.altKey) return
      const tool = TOOLS.find((t) => t.key.toLowerCase() === k)
      if (tool) return editor.setTool(tool.id)
      if (k === 'x') return editor.swapColors()
      if (k === 'f') return toggleFocus()
      if (k === '1') return editor.setPreview({ mode: 'square' })
      if (k === '2') return editor.setPreview({ mode: 'shirt' })
      if (k === '3') return editor.setPreview({ mode: 'realistic' })
      if (k === '[') return editor.setOptions({ brushSize: Math.max(1, Math.round(s.options.brushSize / 1.25)) })
      if (k === ']') return editor.setOptions({ brushSize: Math.min(2000, Math.round(s.options.brushSize * 1.25) + 1) })
      if (k === 'delete' || k === 'backspace') {
        e.preventDefault()
        return editor.clearSelection()
      }
      if (k === 'enter' && s.tool === 'crop' && s.cropRect) return editor.crop(s.cropRect)
      if (k === 'escape') {
        if (s.cropRect) return editor.setCropRect(null)
        return editor.deselect()
      }
      if (s.tool === 'move' && k.startsWith('arrow')) {
        e.preventDefault()
        const n = e.shiftKey ? 10 : 1
        const dx = k === 'arrowleft' ? -n : k === 'arrowright' ? n : 0
        const dy = k === 'arrowup' ? -n : k === 'arrowdown' ? n : 0
        editor.nudge(dx, dy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // re-binds each render so `actions` and `modal` are current

  const close = () => setModal(null)

  return (
    <div className={`app ${focus ? 'focus' : ''} ${viewOnly ? 'view-only' : ''}`}>
      {!focus && <Header actions={actions} viewOnly={viewOnly} />}
      <main className="main">
        {!viewOnly && <Toolbar />}
        <section className="center">
          {!focus && !viewOnly && <OptionsBar />}
          <Stage onDropFiles={addFiles} focus={focus} onToggleFocus={toggleFocus} />
          {!focus && <OptionStrip confirmDiscard={confirmDiscard} onSaveAsOption={actions.saveAsOption} readOnly={viewOnly} />}
        </section>
        {!focus && <Sidebar onPlaceImage={actions.placeImage} viewOnly={viewOnly} />}
      </main>

      <input ref={openInput} type="file" hidden accept="image/*,.colorchute,.json"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) openFile(f)
          e.target.value = ''
        }} />
      <input ref={placeInput} type="file" hidden accept="image/*" multiple
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files)
          e.target.value = ''
        }} />

      {modal === 'new' && <NewDesignDialog onClose={close} />}
      {modal === 'resize' && <ResizeDialog onClose={close} />}
      {modal === 'export' && <ExportDialog onClose={close} />}
      {modal === 'library' && <LibraryDialog onClose={close} confirmDiscard={confirmDiscard} />}
      {modal === 'nameOption' && <NameOptionDialog onClose={close} />}
      {modal === 'admin' && <AdminDialog onClose={close} />}
      <AccountDialog />
      {pending && (
        <Dialog
          title="Save changes first?"
          icon={<Save size={14} />}
          onClose={() => setPending(null)}
          footer={
            <>
              <button className="btn red" onClick={() => {
                const next = pending
                setPending(null)
                next()
              }}>Don't save</button>
              <span className="grow" />
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              {canSave() ? (
                <button className="btn yellow" onClick={async () => {
                  const next = pending
                  setPending(null)
                  if (await save()) next()
                }}>Save</button>
              ) : (
                <button className="btn green" onClick={() => {
                  setPending(null)
                  save()
                }}><LogIn size={15} /> Sign in to save</button>
              )}
            </>
          }
        >
          <p className="dialog-text">
            {!canSave()
              ? 'These changes aren’t saved. Saving needs an approved account, or you can carry on without saving.'
              : getDesigns().designId
                ? 'This color option has changes that aren’t saved.'
                : 'This design isn’t saved yet. Save it to your designs?'}
          </p>
        </Dialog>
      )}
      {shownToast && <div className="toast" role="status">{shownToast}</div>}
    </div>
  )
}
