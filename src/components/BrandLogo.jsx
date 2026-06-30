/** Marca VerificaDoc — alineado con Materen Canvas (agenda-ti) */
export default function BrandLogo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { box: 28, icon: 15, title: 14, sub: 11 },
    md: { box: 32, icon: 17, title: 15, sub: 11 },
    lg: { box: 36, icon: 19, title: 18, sub: 12 },
  }
  const s = sizes[size] ?? sizes.md

  return (
    <div className="brand">
      <div className="brand-mark" style={{ width: s.box, height: s.box }} aria-hidden>
        <svg width={s.icon} height={s.icon} viewBox="0 0 24 24" fill="none">
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path d="M14 2v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      </div>
      {showText && (
        <div className="brand-text">
          <p className="brand-title" style={{ fontSize: s.title }}>VerificaDoc</p>
          {size !== 'sm' && (
            <p className="brand-sub" style={{ fontSize: s.sub }}>Documentos laborales</p>
          )}
        </div>
      )}
    </div>
  )
}
