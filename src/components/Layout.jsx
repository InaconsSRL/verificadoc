import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { LogOut, FileText, Clock, Settings } from 'lucide-react'
import { ROL_LABEL } from '@/lib/documentos'
import BrandLogo from '@/components/BrandLogo'

const NAV_LINKS = [
  { to: '/emitir',    label: 'Emitir',    icon: FileText,  roles: ['capital_humano', 'sig'] },
  { to: '/historial', label: 'Historial', icon: Clock,     roles: ['capital_humano', 'gerencia', 'sig'] },
  { to: '/admin',     label: 'Admin',     icon: Settings,  roles: ['sig'] },
]

const ICON = { size: 18, strokeWidth: 1.75 }

function Initials({ nombre }) {
  const parts = (nombre ?? '?').trim().split(' ')
  const ini = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
  return ini.toUpperCase()
}

export default function Layout() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const rol = perfil?.rol

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <nav className="app-sidebar" aria-label="Navegación principal">
        <div className="sidebar-head">
          <BrandLogo size="sm" />
        </div>

        <div className="sidebar-nav">
          <p className="sidebar-label">Módulos</p>
          {NAV_LINKS
            .filter(link => link.roles.includes(rol))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
              >
                <Icon {...ICON} />
                {label}
              </NavLink>
            ))
          }
        </div>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              <Initials nombre={perfil?.nombre} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="sidebar-user-name">{perfil?.nombre ?? '—'}</p>
              <p className="sidebar-user-role">{ROL_LABEL[rol] ?? rol}</p>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            <LogOut size={14} strokeWidth={1.75} /> Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="app-main">
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
