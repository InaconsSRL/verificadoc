import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

const FOCUSABLES = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * Diálogo modal accesible: role=dialog, cierre con Esc y clic fuera,
 * foco inicial dentro, trampa de Tab y retorno del foco al cerrar.
 *
 * - `title`: nodo del encabezado (texto o JSX).
 * - `ariaLabel`: nombre accesible del diálogo (string).
 * - `subtitle`: línea secundaria opcional.
 */
export default function Modal({ title, subtitle, ariaLabel, onClose, children, maxWidth = 480 }) {
  const panelRef  = useRef(null)
  const focoPrevio = useRef(null)

  useEffect(() => {
    focoPrevio.current = document.activeElement
    panelRef.current?.focus()
    return () => focoPrevio.current?.focus?.()
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return

    const focusables = panelRef.current?.querySelectorAll(FOCUSABLES)
    if (!focusables?.length) return
    const first = focusables[0]
    const last  = focusables[focusables.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={{ maxWidth }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-head">
          <div>
            <p className="modal-title">{title}</p>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-light)', padding: 4, borderRadius: 6 }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
