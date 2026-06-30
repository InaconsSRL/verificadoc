import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { RefreshCw } from 'lucide-react'
import { useToast, Toast } from '@/hooks/useToast'
import Spinner from '@/components/Spinner'
import PageHeader from '@/components/PageHeader'
import { ROLES } from '@/lib/documentos'

const ROL_STYLE = {
  capital_humano: { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  gerencia:       { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  sig:            { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
}

const PERMISOS = [
  {
    rol: 'capital_humano',
    items: ['Emitir documentos', 'Ver historial y descargar'],
  },
  {
    rol: 'gerencia',
    items: ['Ver reportes (solo lectura)'],
  },
  {
    rol: 'sig',
    items: ['Acceso total al sistema', 'Emitir y anular documentos', 'Ver historial y reportes', 'Administrar usuarios'],
  },
]

function RolBadge({ rol }) {
  const s = ROL_STYLE[rol] ?? { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' }
  const label = ROLES.find(r => r.value === rol)?.label ?? rol
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {label}
    </span>
  )
}

export default function Admin() {
  const { user }  = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)
  const { toast, showToast } = useToast()

  useEffect(() => { fetchPerfiles() }, [])

  async function fetchPerfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('id, nombre, rol')
      .order('nombre')
    setPerfiles(data ?? [])
    setLoading(false)
  }

  async function cambiarRol(id, rol) {
    if (id === user?.id) {
      showToast('No puedes cambiar tu propio rol.', true)
      return
    }
    setSaving(id)
    const { error } = await supabase
      .from('usuarios_perfil')
      .update({ rol })
      .eq('id', id)
    setSaving(null)
    if (error) {
      showToast(`No se pudo actualizar el rol: ${error.message}`, true)
      return
    }
    setPerfiles(prev => prev.map(p => p.id === id ? { ...p, rol } : p))
    showToast('Rol actualizado correctamente.')
  }

  function Initials({ nombre }) {
    const parts = (nombre ?? '?').trim().split(' ')
    const ini = parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2)
    return ini.toUpperCase()
  }

  return (
    <div>

      <PageHeader
        title="Administración"
        subtitle="Gestión de usuarios y roles del sistema"
      >
        <button type="button" className="btn" onClick={fetchPerfiles}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </PageHeader>

      <Toast toast={toast} />

      {/* Permisos por rol */}
      <div className="admin-permisos">
        {PERMISOS.map(({ rol, items }) => {
          const s = ROL_STYLE[rol] ?? {}
          const label = ROLES.find(r => r.value === rol)?.label
          return (
            <div key={rol} className="admin-permisos-item">
              <div className="admin-permisos-head">
                <span className="admin-permisos-dot" style={{ background: s.dot }} />
                <span className="admin-permisos-label">{label}</span>
              </div>
              <p className="admin-permisos-desc">{items.join(' · ')}</p>
            </div>
          )
        })}
      </div>

      {/* Lista de usuarios */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#0D1F35', margin: 0 }}>
            Usuarios
            <span style={{
              marginLeft: 8, background: '#f1f5f9', color: '#6b7280',
              padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            }}>
              {perfiles.length}
            </span>
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem' }}>
            <Spinner size={26} />
          </div>
        ) : perfiles.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af', fontSize: 13 }}>
            Sin usuarios registrados.
          </p>
        ) : (
          <div>
            {perfiles.map((p, i) => {
              const isMe = p.id === user?.id
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: i < perfiles.length - 1 ? '1px solid #f9fafb' : 'none',
                    background: isMe ? 'rgba(13,31,53,.015)' : '#fff',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => !isMe && (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => !isMe && (e.currentTarget.style.background = '#fff')}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: isMe
                      ? 'linear-gradient(135deg, #3A6B8A, #4E7FA0)'
                      : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: isMe ? '#fff' : '#6b7280',
                  }}>
                    <Initials nombre={p.nombre} />
                  </div>

                  {/* Nombre + ID */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: 0 }}>
                        {p.nombre ?? '—'}
                      </p>
                      {isMe && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#3A6B8A',
                          background: '#e0f2fe', padding: '1px 6px', borderRadius: 99,
                        }}>
                          Tú
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>
                      {p.id.slice(0, 8)}…
                    </p>
                  </div>

                  {/* Rol actual */}
                  <div style={{ flexShrink: 0 }}>
                    <RolBadge rol={p.rol} />
                  </div>

                  {/* Selector de rol */}
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      className="input"
                      style={{
                        width: 'auto', padding: '.35rem .65rem',
                        fontSize: 12, opacity: isMe ? .45 : 1,
                        cursor: isMe ? 'not-allowed' : 'pointer',
                      }}
                      value={p.rol ?? ''}
                      disabled={isMe || saving === p.id}
                      onChange={e => cambiarRol(p.id, e.target.value)}
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {saving === p.id && (
                      <span className="spinner" style={{
                        width: 14, height: 14,
                        borderColor: 'rgba(0,0,0,.08)', borderTopColor: '#0D1F35',
                      }} />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
