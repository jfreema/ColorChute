import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Rect } from '../editor/pixels'
import { outlineSegments, SelectMode } from '../editor/selection'
import { editor, useEditor } from '../editor/store'
import {
  basicShirt, PRINT_CENTER_X, PRINT_TOP, printScale, realisticShirtBase, realisticShirtHighlights,
  realisticShirtShadows, SHIRT_H, SHIRT_W, svgUrl,
} from '../lib/shirt'
import { Maximize, Maximize2, Minimize2, Redo2, Shirt, Square, Undo2, ZoomIn, ZoomOut } from './icons'

interface View {
  zoom: number
  x: number
  y: number
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number }
  | { kind: 'rect'; x0: number; y0: number; x1: number; y1: number; mode: SelectMode }
  | { kind: 'crop'; x0: number; y0: number }
  | { kind: 'paint' }
  | { kind: 'move'; x0: number; y0: number }

const modeFor = (e: { shiftKey: boolean; altKey: boolean }): SelectMode =>
  e.shiftKey && e.altKey ? 'intersect' : e.shiftKey ? 'add' : e.altKey ? 'subtract' : 'replace'

function normRect(x0: number, y0: number, x1: number, y1: number, w: number, h: number): Rect {
  const ax = Math.max(0, Math.min(w, Math.round(Math.min(x0, x1))))
  const ay = Math.max(0, Math.min(h, Math.round(Math.min(y0, y1))))
  const bx = Math.max(0, Math.min(w, Math.round(Math.max(x0, x1))))
  const by = Math.max(0, Math.min(h, Math.round(Math.max(y0, y1))))
  return { x: ax, y: ay, w: bx - ax, h: by - ay }
}

export function Stage({ onDropFiles, focus, onToggleFocus }: {
  onDropFiles: (files: FileList) => void
  focus: boolean
  onToggleFocus: () => void
}) {
  const width = useEditor((s) => s.width)
  const height = useEditor((s) => s.height)
  const dpi = useEditor((s) => s.dpi)
  const pixelsVersion = useEditor((s) => s.pixelsVersion)
  const selection = useEditor((s) => s.selection)
  const tool = useEditor((s) => s.tool)
  const preview = useEditor((s) => s.preview)
  const cropRect = useEditor((s) => s.cropRect)
  const brushSize = useEditor((s) => s.options.brushSize)
  const canUndo = useEditor((s) => s.canUndo)
  const canRedo = useEditor((s) => s.canRedo)

  const box = useRef<HTMLDivElement>(null)
  const art = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState<View>({ zoom: 0.2, x: 0, y: 0 })
  const viewRef = useRef(view)
  viewRef.current = view
  const [size, setSize] = useState({ w: 800, h: 600 })
  /** True until the person zooms or pans, so a resized stage refits instead of drifting */
  const fitted = useRef(true)
  const drag = useRef<Drag | null>(null)
  const cursor = useRef<{ x: number; y: number } | null>(null)
  const [space, setSpace] = useState(false)
  const [dropping, setDropping] = useState(false)
  const dash = useRef(0)

  // MARK: Scene layout, in document pixels

  const scene = useMemo(() => {
    if (preview.mode === 'square') {
      const side = Math.max(width, height) * 1.12
      const board = { x: width / 2 - side / 2, y: height / 2 - side / 2, w: side, h: side }
      return { bounds: board, board, shirt: null }
    }
    const s = printScale(width, height, dpi, preview.sizeMode)
    const shirt = { x: width / 2 - PRINT_CENTER_X / s, y: -PRINT_TOP / s, w: SHIRT_W / s, h: SHIRT_H / s }
    return { bounds: shirt, board: null, shirt }
  }, [preview.mode, preview.sizeMode, width, height, dpi])

  const fit = useCallback(() => {
    const b = scene.bounds
    const pad = 28
    const zoom = Math.min((size.w - pad * 2) / b.w, (size.h - pad * 2) / b.h)
    setView({ zoom, x: size.w / 2 - (b.x + b.w / 2) * zoom, y: size.h / 2 - (b.y + b.h / 2) * zoom })
    fitted.current = true
  }, [scene, size])

  useLayoutEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // Refit when the document or background changes shape
  useEffect(fit, [width, height, preview.mode, preview.sizeMode, size.w > 0 && size.h > 0]) // eslint-disable-line

  // When the stage itself changes size (focus mode, window resize), refit if the view was fitted, otherwise keep
  // the same spot in the middle
  const lastSize = useRef(size)
  useEffect(() => {
    const was = lastSize.current
    lastSize.current = size
    if (was.w === size.w && was.h === size.h) return
    if (fitted.current) fit()
    else setView((v) => ({ ...v, x: v.x + (size.w - was.w) / 2, y: v.y + (size.h - was.h) / 2 }))
  }, [size.w, size.h]) // eslint-disable-line

  useEffect(() => {
    const onFit = () => fit()
    window.addEventListener('colorchute:fit', onFit)
    return () => window.removeEventListener('colorchute:fit', onFit)
  }, [fit])

  // MARK: Drawing the art

  useEffect(() => {
    const c = art.current
    if (!c) return
    const id = requestAnimationFrame(() => {
      if (c.width !== width || c.height !== height) {
        c.width = width
        c.height = height
      }
      const g = c.getContext('2d')!
      g.clearRect(0, 0, width, height)
      g.drawImage(editor.composite(), 0, 0)
    })
    return () => cancelAnimationFrame(id)
  }, [pixelsVersion, width, height])

  // MARK: Overlay: selection, boxes, brush

  const segments = useMemo(() => (selection ? outlineSegments(selection, width, height) : null), [selection, width, height])

  const drawOverlay = useCallback(() => {
    const c = overlay.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== Math.round(size.w * dpr) || c.height !== Math.round(size.h * dpr)) {
      c.width = Math.round(size.w * dpr)
      c.height = Math.round(size.h * dpr)
    }
    const g = c.getContext('2d')!
    const { zoom, x, y } = viewRef.current
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, c.width, c.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const sx = (px: number) => x + px * zoom
    const sy = (py: number) => y + py * zoom

    // The document's edges, faint, so the printable area is clear on a shirt
    g.lineWidth = 1
    g.setLineDash([5, 4])
    g.strokeStyle = 'rgba(23,31,61,0.35)'
    g.strokeRect(Math.round(sx(0)) + 0.5, Math.round(sy(0)) + 0.5, Math.round(width * zoom), Math.round(height * zoom))

    const ants = (path: () => void) => {
      g.setLineDash([5, 5])
      g.lineDashOffset = -dash.current
      g.strokeStyle = '#fff'
      g.lineWidth = 1.5
      path()
      g.stroke()
      g.lineDashOffset = -dash.current + 5
      g.strokeStyle = '#171F3D'
      path()
      g.stroke()
    }

    if (segments && segments.length) {
      ants(() => {
        g.beginPath()
        for (let i = 0; i < segments.length; i += 4) {
          g.moveTo(Math.round(sx(segments[i])) + 0.5, Math.round(sy(segments[i + 1])) + 0.5)
          g.lineTo(Math.round(sx(segments[i + 2])) + 0.5, Math.round(sy(segments[i + 3])) + 0.5)
        }
      })
    }

    const d = drag.current
    if (d?.kind === 'rect') {
      const r = normRect(d.x0, d.y0, d.x1, d.y1, width, height)
      ants(() => {
        g.beginPath()
        g.rect(sx(r.x) + 0.5, sy(r.y) + 0.5, r.w * zoom, r.h * zoom)
      })
    }

    const crop = editor.state.cropRect
    if (crop && editor.state.tool === 'crop') {
      g.setLineDash([])
      g.fillStyle = 'rgba(23,31,61,0.5)'
      g.beginPath()
      g.rect(sx(0), sy(0), width * zoom, height * zoom)
      g.rect(sx(crop.x), sy(crop.y), crop.w * zoom, crop.h * zoom)
      g.fill('evenodd')
      g.strokeStyle = '#FAD945'
      g.lineWidth = 2
      g.strokeRect(sx(crop.x), sy(crop.y), crop.w * zoom, crop.h * zoom)
      // Thirds, for lining things up
      g.strokeStyle = 'rgba(250,217,69,0.5)'
      g.lineWidth = 1
      g.beginPath()
      for (let i = 1; i < 3; i++) {
        g.moveTo(sx(crop.x + (crop.w * i) / 3), sy(crop.y))
        g.lineTo(sx(crop.x + (crop.w * i) / 3), sy(crop.y + crop.h))
        g.moveTo(sx(crop.x), sy(crop.y + (crop.h * i) / 3))
        g.lineTo(sx(crop.x + crop.w), sy(crop.y + (crop.h * i) / 3))
      }
      g.stroke()
    }

    const t = editor.state.tool
    const cur = cursor.current
    if (cur && (t === 'pencil' || t === 'eraser') && !space) {
      const r = Math.max(1, (editor.state.options.brushSize * zoom) / 2)
      g.setLineDash([])
      g.lineWidth = 1.5
      g.strokeStyle = '#fff'
      g.beginPath()
      g.arc(sx(cur.x), sy(cur.y), r + 1, 0, Math.PI * 2)
      g.stroke()
      g.strokeStyle = '#171F3D'
      g.beginPath()
      g.arc(sx(cur.x), sy(cur.y), r, 0, Math.PI * 2)
      g.stroke()
    }
  }, [segments, size, width, height, space])

  useEffect(drawOverlay, [drawOverlay, view, cropRect, tool, brushSize])

  // Marching ants
  useEffect(() => {
    if (!segments?.length && tool !== 'crop') return
    const id = setInterval(() => {
      dash.current = (dash.current + 1) % 10
      drawOverlay()
    }, 90)
    return () => clearInterval(id)
  }, [segments, drawOverlay, tool])

  // MARK: Input

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect()
    const { zoom, x, y } = viewRef.current
    return { x: (e.clientX - r.left - x) / zoom, y: (e.clientY - r.top - y) / zoom }
  }

  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    fitted.current = false
    setView((v) => {
      const zoom = Math.min(32, Math.max(0.01, v.zoom * factor))
      const k = zoom / v.zoom
      return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
    })
  }, [])

  useEffect(() => {
    const el = box.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) zoomAt(Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
      else {
        fitted.current = false
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !e.repeat) {
        e.preventDefault()
        setSpace(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpace(false)
    }
    const zoomKeys = (e: Event) => {
      const d = (e as CustomEvent<number>).detail
      zoomAt(d, size.w / 2, size.h / 2)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('colorchute:zoom', zoomKeys)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('colorchute:zoom', zoomKeys)
    }
  }, [zoomAt, size])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return
    box.current!.setPointerCapture(e.pointerId)
    const p = toDoc(e)
    const v = viewRef.current
    const t = editor.state.tool
    if (space || t === 'hand' || e.button === 1) {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y }
      return
    }
    switch (t) {
      case 'bucket':
        if (e.altKey) editor.pickAt(p.x, p.y)
        else editor.fillAt(p.x, p.y)
        break
      case 'picker':
        editor.pickAt(p.x, p.y, e.altKey ? 'secondary' : 'primary')
        break
      case 'wand':
        editor.wandAt(p.x, p.y, modeFor(e))
        break
      case 'select':
        drag.current = { kind: 'rect', x0: p.x, y0: p.y, x1: p.x, y1: p.y, mode: modeFor(e) }
        break
      case 'crop':
        drag.current = { kind: 'crop', x0: p.x, y0: p.y }
        editor.setCropRect(null)
        break
      case 'pencil':
      case 'eraser':
        if (e.altKey && t === 'pencil') {
          editor.pickAt(p.x, p.y)
          break
        }
        editor.beginStroke(p.x, p.y, t === 'eraser')
        drag.current = { kind: 'paint' }
        break
      case 'move':
        editor.beginMove()
        drag.current = { kind: 'move', x0: p.x, y0: p.y }
        break
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const p = toDoc(e)
    cursor.current = p
    const d = drag.current
    if (d?.kind === 'pan') {
      fitted.current = false
      setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }))
    } else if (d?.kind === 'rect') {
      d.x1 = p.x
      d.y1 = p.y
    } else if (d?.kind === 'crop') {
      const r = normRect(d.x0, d.y0, p.x, p.y, width, height)
      editor.setCropRect(r.w > 0 && r.h > 0 ? r : null)
    } else if (d?.kind === 'paint') {
      editor.strokeTo(p.x, p.y)
    } else if (d?.kind === 'move') {
      editor.moveBy(p.x - d.x0, p.y - d.y0)
    }
    drawOverlay()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (d?.kind === 'rect') {
      const r = normRect(d.x0, d.y0, d.x1, d.y1, width, height)
      if (r.w < 2 || r.h < 2) {
        if (d.mode === 'replace') editor.deselect()
      } else editor.selectRect(r, d.mode)
    } else if (d?.kind === 'paint') editor.endStroke()
    else if (d?.kind === 'move') editor.endMove()
    if (box.current?.hasPointerCapture(e.pointerId)) box.current.releasePointerCapture(e.pointerId)
    drawOverlay()
  }

  // MARK: Render

  const { zoom, x, y } = view
  const place = (r: { x: number; y: number; w: number; h: number }): React.CSSProperties => ({
    left: x + r.x * zoom, top: y + r.y * zoom, width: r.w * zoom, height: r.h * zoom,
  })
  const shirtImgs = useMemo(() => {
    if (preview.mode === 'shirt') return { base: svgUrl(basicShirt(preview.shirtColor)), shadow: null, light: null }
    if (preview.mode === 'realistic') {
      return {
        base: svgUrl(realisticShirtBase(preview.shirtColor)),
        shadow: svgUrl(realisticShirtShadows(preview.shirtColor)),
        light: svgUrl(realisticShirtHighlights(preview.shirtColor)),
      }
    }
    return null
  }, [preview.mode, preview.shirtColor])

  const cursorStyle =
    space || tool === 'hand' ? (drag.current?.kind === 'pan' ? 'grabbing' : 'grab')
      : tool === 'move' ? 'move'
        : tool === 'pencil' || tool === 'eraser' ? 'none'
          : 'crosshair'

  return (
    <div
      ref={box}
      className="stage"
      style={{ background: preview.stageColor, cursor: cursorStyle }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => {
        cursor.current = null
        drawOverlay()
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragOver={(e) => {
        e.preventDefault()
        setDropping(true)
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDropping(false)
        if (e.dataTransfer.files.length) onDropFiles(e.dataTransfer.files)
      }}
    >
      {scene.board && (
        <div
          className={`board ${preview.boardColor === 'transparent' ? 'checker' : ''}`}
          style={{
            ...place(scene.board),
            background: preview.boardColor === 'transparent' ? undefined : preview.boardColor,
            boxShadow: '2px 3px 0 #171F3D', border: '2px solid #171F3D', borderRadius: 6,
          }}
        />
      )}
      {scene.shirt && shirtImgs && <img className="layer-img" alt="" src={shirtImgs.base} style={place(scene.shirt)} />}
      <canvas
        ref={art}
        className="art"
        style={{
          left: x, top: y, width: width * zoom, height: height * zoom,
          imageRendering: zoom >= 2 ? 'pixelated' : 'auto',
        }}
      />
      {scene.shirt && shirtImgs?.shadow && (
        <img className="layer-img blend-multiply" alt="" src={shirtImgs.shadow} style={place(scene.shirt)} />
      )}
      {scene.shirt && shirtImgs?.light && (
        <img className="layer-img blend-screen" alt="" src={shirtImgs.light} style={place(scene.shirt)} />
      )}
      <canvas ref={overlay} className="overlay" style={{ width: size.w, height: size.h }} />

      <div className="float bl" onPointerDown={(e) => e.stopPropagation()}>
        <div className="segmented" role="radiogroup" aria-label="Background">
          {([
            ['square', 'Square', <Square size={13} key="s" />],
            ['shirt', 'T-shirt', <Shirt size={13} key="t" />],
            ['realistic', 'Realistic', <Shirt size={13} key="r" fill="currentColor" />],
          ] as const).map(([m, label, icon]) => (
            <button key={m} className={preview.mode === m ? 'active' : ''} role="radio" aria-checked={preview.mode === m}
              onClick={() => editor.setPreview({ mode: m })} title={`${label} background (${m === 'square' ? 1 : m === 'shirt' ? 2 : 3})`}>
              {icon} <span className="lbl">{label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="float br" onPointerDown={(e) => e.stopPropagation()}>
        <button className="btn small icon" title="Zoom out (Ctrl -)" onClick={() => zoomAt(1 / 1.25, size.w / 2, size.h / 2)}>
          <ZoomOut size={14} />
        </button>
        <button className="btn small zoom-label" title="Actual pixels" onClick={() => zoomAt(1 / zoom, size.w / 2, size.h / 2)}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="btn small icon" title="Zoom in (Ctrl +)" onClick={() => zoomAt(1.25, size.w / 2, size.h / 2)}>
          <ZoomIn size={14} />
        </button>
        <button className="btn small icon" title="Fit (Ctrl 0)" onClick={fit}>
          <Maximize size={14} />
        </button>
      </div>
      <div className="float tr" onPointerDown={(e) => e.stopPropagation()}>
        {focus && (
          <>
            <button className="btn small icon" disabled={!canUndo} onClick={() => editor.undo()} title="Undo" aria-label="Undo">
              <Undo2 size={14} />
            </button>
            <button className="btn small icon" disabled={!canRedo} onClick={() => editor.redo()} title="Redo" aria-label="Redo">
              <Redo2 size={14} />
            </button>
          </>
        )}
        <button className={`btn small ${focus ? 'sky' : ''}`} onClick={onToggleFocus} aria-pressed={focus}
          title={focus ? 'Bring back the panels (F)' : 'Hide the panels and give the canvas the whole window (F)'}>
          {focus ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          {focus ? 'Show panels' : 'Focus'}
          <span className="kbd">F</span>
        </button>
      </div>
      {dropping && <div className="drop-hint">Drop an image to add it as a layer</div>}
    </div>
  )
}
