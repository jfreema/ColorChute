import { ReactNode, useEffect } from 'react'
import { X } from './icons'

export function Dialog(props: {
  title: string
  icon: ReactNode
  chip?: string
  wide?: boolean
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props.onClose]) // eslint-disable-line
  return (
    <div className="backdrop" onPointerDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={`dialog ${props.wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="head">
          <span className="icon-chip" style={{ background: props.chip ?? 'var(--yellow)' }}>{props.icon}</span>
          <span className="title" style={{ fontSize: 19 }}>{props.title}</span>
          <span className="grow" />
          <button className="btn small icon" onClick={props.onClose} aria-label="Close"><X size={14} /></button>
        </div>
        <div className="body">{props.children}</div>
        {props.footer && <div className="foot">{props.footer}</div>}
      </div>
    </div>
  )
}
