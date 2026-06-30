import { useNavigate } from 'react-router-dom'
import { ShieldOff } from 'lucide-react'

export default function SinAcceso() {
  const navigate = useNavigate()
  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-card-header">
            <ShieldOff size={32} color="var(--mc-color-warning)" />
            <h1 className="auth-title">Sin acceso</h1>
            <p className="auth-subtitle">
              Tu rol no tiene permisos para ver esta sección.
            </p>
          </header>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(-1)}>
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  )
}
