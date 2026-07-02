import { useNavigate } from 'react-router-dom'
import { ShieldOff, UserX } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function SinAcceso() {
  const navigate = useNavigate()
  const { perfil, logout } = useAuth()
  const desactivado = perfil?.activo === false
  useDocumentTitle(desactivado ? 'Cuenta desactivada' : 'Sin acceso')

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <header className="auth-card-header">
            {desactivado
              ? <UserX size={32} color="var(--mc-color-danger)" />
              : <ShieldOff size={32} color="var(--mc-color-warning)" />
            }
            <h1 className="auth-title">
              {desactivado ? 'Cuenta desactivada' : 'Sin acceso'}
            </h1>
            <p className="auth-subtitle">
              {desactivado
                ? 'Tu cuenta fue desactivada por un administrador. Si crees que es un error, contacta al área SIG.'
                : 'Tu rol no tiene permisos para ver esta sección.'
              }
            </p>
          </header>
          {desactivado ? (
            <button type="button" className="btn btn-primary btn-lg" onClick={handleLogout}>
              Cerrar sesión
            </button>
          ) : (
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate(-1)}>
              Volver atrás
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
