import {
  ArrowLeftRight, Crop, Eraser, Hand, Move, PaintBucket, Pencil, Pipette, SquareDashed, Wand2,
} from './icons'
import { editor, Tool, useEditor } from '../editor/store'
import { ColorInput } from './ColorInput'


export const TOOLS: { id: Tool; name: string; key: string; icon: JSX.Element }[] = [
  { id: 'move', name: 'Move layer', key: 'V', icon: <Move size={19} /> },
  { id: 'select', name: 'Select box', key: 'M', icon: <SquareDashed size={19} /> },
  { id: 'wand', name: 'Magic wand', key: 'W', icon: <Wand2 size={19} /> },
  { id: 'bucket', name: 'Fill bucket', key: 'G', icon: <PaintBucket size={19} /> },
  { id: 'picker', name: 'Color picker', key: 'I', icon: <Pipette size={19} /> },
  { id: 'pencil', name: 'Pencil', key: 'B', icon: <Pencil size={19} /> },
  { id: 'eraser', name: 'Eraser', key: 'E', icon: <Eraser size={19} /> },
  { id: 'crop', name: 'Crop', key: 'C', icon: <Crop size={19} /> },
  { id: 'hand', name: 'Hand (or hold Space)', key: 'H', icon: <Hand size={19} /> },
]

export function Toolbar() {
  const tool = useEditor((s) => s.tool)
  const primary = useEditor((s) => s.primary)
  const secondary = useEditor((s) => s.secondary)
  return (
    <div className="card tools" role="toolbar" aria-label="Tools">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool ${tool === t.id ? 'active' : ''}`}
          title={`${t.name} (${t.key})`}
          aria-label={t.name}
          aria-pressed={tool === t.id}
          onClick={() => editor.setTool(t.id)}
        >
          {t.icon}
        </button>
      ))}
      <hr />
      <div className="color-pair">
        <ColorInput className="swatch primary" value={primary} onChange={(c) => editor.setPrimary(c)} title="Fill color" />
        <ColorInput className="swatch secondary" value={secondary} onChange={(c) => editor.setSecondary(c)} title="Second color" />
      </div>
      <button className="swap-btn" title="Swap colors (X)" aria-label="Swap colors" onClick={() => editor.swapColors()}>
        <ArrowLeftRight size={15} />
      </button>
    </div>
  )
}
