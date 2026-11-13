import { useEffect, useRef } from 'react'

/** A swatch that opens the system color picker */
export function ColorInput(props: { value: string; onChange: (hex: string) => void; className?: string; title?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.value = props.value.toLowerCase()
  }, [props.value])
  return (
    <label className={props.className} style={{ background: props.value }} title={props.title}>
      <input
        ref={ref}
        type="color"
        className="color-input"
        defaultValue={props.value.toLowerCase()}
        onChange={(e) => props.onChange(e.target.value)}
        aria-label={props.title}
      />
    </label>
  )
}
