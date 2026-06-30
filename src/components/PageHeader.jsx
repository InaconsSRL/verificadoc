/** Encabezado de página — estilo mc-page-header */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <div className="page-header-top">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {children && <div className="page-header-actions">{children}</div>}
      </div>
    </header>
  )
}
