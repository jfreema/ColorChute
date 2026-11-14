import { useState } from 'react'
import { saveAsNewOption, suggestOptionName, useDesigns } from '../editor/designs'
import { Dialog } from './Dialog'
import { Plus } from './icons'

/** Names a new color option before saving it */
export function NameOptionDialog({ onClose }: { onClose: () => void }) {
  const [suggested] = useState(suggestOptionName)
  const [name, setName] = useState(suggested)
  const first = useDesigns((s) => !s.designId)
  const save = () => {
    onClose()
    saveAsNewOption(name.trim() || suggested)
  }
  return (
    <Dialog title={first ? 'Save first color option' : 'Save as new color option'} icon={<Plus size={14} />} onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn yellow" onClick={save}>Save option</button>
        </>
      }>
      <p className="dialog-text">Name this color scheme so you can tell the options apart, like the team or its colors.</p>
      <input className="field" style={{ width: '100%', height: 34, fontSize: 14 }} autoFocus value={name}
        aria-label="Color option name" placeholder={suggested}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
        }} />
    </Dialog>
  )
}
