import { useEffect, useRef, useState } from 'react'

function PlatformSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find((o) => o.value === value) || options[0]

  return (
    <div className={`custom-select${open ? ' open' : ''}`} ref={ref}>
      <button
        className="custom-select-trigger"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="custom-select-chevron">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        <span className="custom-select-label">{selected.label}</span>
      </button>

      {open && (
        <ul className="custom-select-menu">
          {options.map((opt) => (
            <li
              key={opt.value}
              className={`custom-select-option${opt.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default PlatformSelect
