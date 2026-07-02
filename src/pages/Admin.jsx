import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { crearUsuario } from '@/lib/usuarios'
import { useAuth } from '@/context/AuthContext'
import { RefreshCw, UserPlus, Users, Building2, History, UserX } from 'lucide-react'
import { useToast, Toast } from '@/hooks/useToast'
import Spinner from '@/components/Spinner'
import PageHeader from '@/components/PageHeader'
import Modal from '@/components/Modal'
import AdminEmpresas from '@/components/AdminEmpresas'
import AdminActividad from '@/components/AdminActividad'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ROLES } from '@/lib/documentos'

const TABS = [
  { id: 'usuarios',  label: 'Usuarios',  icon: Users },
  { id: 'empresas',  label: 'Empresas',  icon: Building2 },
  { id: 'actividad', label: 'Actividad', icon: History },
]

const ROL_STYLE = {
  capital_humano: { bg: '#dbeafe', color: '#1d4ed8', dot: '#3b82f6' },
  gerencia:       { bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  sig:            { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
}

const PERMISOS = [
  {
    rol: 'capital_humano',
    items: ['Emitir documentos', 'Ver historial con estadísticas y descargar'],
  },
  {
    rol: 'gerencia',
    items: ['Ver historial y estadísticas (solo lectura)', 'Editar plantillas de documentos'],
  },
  {
    rol: 'sig',
    items: ['Acceso total al sistema', 'Emitir y anular documentos', 'Editar plantillas', 'Administrar usuarios y empresas'],
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

const FORM_INICIAL = { nombre: '', email: '', password: '', rol: 'capital_humano' }

// ── Modal de confirmación de desactivación ──────────────────
function ModalDesactivar({ perfil, onConfirm, onCancel, saving }) {
  return (
    <Modal
      maxWidth={420}
      title="Desactivar usuario"
      subtitle="Podrás reactivarlo en cualquier momento."
      ariaLabel={`Desactivar a ${perfil.nombre}`}
      onClose={onCancel}
    >
      <div className="modal-doc-preview">
        <p style={{ fontWeight: 600, marginBottom: 2 }}>{perfil.nombre}</p>
        {perfil.email && <p style={{ fontSize: 13, color: 'var(--slate)' }}>{perfil.email}</p>}
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 1rem' }}>
        Perderá el acceso de inmediato: no podrá emitir, consultar el historial ni entrar al panel.
        El cambio queda registrado en la pestaña Actividad.
      </p>

      <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={saving}
          style={{ fontWeight: 600, gap: 6 }}>
          {saving
            ? <span className="spinner" style={{ borderColor: 'rgba(220,38,38,.2)', borderTopColor: '#dc2626', width: 14, height: 14 }} />
            : <UserX size={14} />
          }
          Desactivar
        </button>
      </div>
    </Modal>
  )
}

export default function Admin() {
  const { user }  = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)
  const [form,     setForm]     = useState(FORM_INICIAL)
  const [creando,  setCreando]  = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [tab,      setTab]      = useState('usuarios')
  const [confirmando, setConfirmando] = useState(null)
  const { toast, showToast } = useToast()
  useDocumentTitle('Administración')

  useEffect(() => { fetchPerfiles() }, [])

  async function fetchPerfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('id, nombre, email, rol, activo')
      .order('nombre')
    setPerfiles(data ?? [])
    setLoading(false)
  }

  function actualizarForm(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleCrearUsuario(e) {
    e.preventDefault()
    setCreando(true)
    try {
      const creado = await crearUsuario(form)
      setForm(FORM_INICIAL)
      setShowForm(false)
      await fetchPerfiles()
      showToast(
        creado.cuentaNueva
          ? `Usuario ${creado.nombre} creado. Ya puede iniciar sesión.`
          : `Perfil asignado a ${creado.nombre}.`,
      )
    } catch (err) {
      showToast(err.message || 'No se pudo crear el usuario.', true)
    } finally {
      setCreando(false)
    }
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

  async function cambiarActivo(id, activo) {
    if (id === user?.id) {
      showToast('No puedes desactivar tu propia cuenta.', true)
      return
    }
    setSaving(id)
    const { error } = await supabase
      .from('usuarios_perfil')
      .update({ activo })
      .eq('id', id)
    setSaving(null)
    if (error) {
      showToast(`No se pudo ${activo ? 'activar' : 'desactivar'} el usuario: ${error.message}`, true)
      return
    }
    setPerfiles(prev => prev.map(p => p.id === id ? { ...p, activo } : p))
    setConfirmando(null)
    showToast(activo
      ? 'Usuario activado: recupera el acceso al sistema.'
      : 'Usuario desactivado: ya no puede emitir ni consultar documentos.')
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
        subtitle="Usuarios, empresas y actividad del sistema"
      >
        {tab === 'usuarios' && (
          <button type="button" className="btn" onClick={fetchPerfiles}>
            <RefreshCw size={14} /> Actualizar
          </button>
        )}
      </PageHeader>

      <Toast toast={toast} />

      {/* Pestañas */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: '1.25rem',
        borderBottom: '1px solid var(--gray-200, #e5e7eb)',
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '.55rem .9rem', fontSize: 13, fontFamily: 'inherit',
              fontWeight: tab === id ? 700 : 500,
              color: tab === id ? 'var(--navy, #0D1F35)' : 'var(--muted, #6b7280)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === id ? '2px solid var(--navy, #0D1F35)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <Icon size={15} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'empresas' && <AdminEmpresas showToast={showToast} />}
      {tab === 'actividad' && <AdminActividad showToast={showToast} />}

      {tab === 'usuarios' && (
      <>
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

      {/* Alta de usuario */}
      <div className="card admin-nuevo-usuario">
        <div className="admin-nuevo-usuario-head">
          <div>
            <p className="admin-nuevo-usuario-title">Nuevo usuario</p>
            <p className="admin-nuevo-usuario-desc">
              Crea la cuenta y asigna el rol en un solo paso. Comparte el correo y la contraseña temporal.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowForm(v => !v)}
          >
            <UserPlus size={14} />
            {showForm ? 'Cancelar' : 'Agregar usuario'}
          </button>
        </div>

        {showForm && (
          <form className="admin-nuevo-usuario-form" onSubmit={handleCrearUsuario}>
            <div className="field">
              <label className="label" htmlFor="admin-nombre">Nombre completo</label>
              <input
                id="admin-nombre"
                type="text"
                className="input"
                placeholder="María Pérez"
                value={form.nombre}
                onChange={e => actualizarForm('nombre', e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="admin-email">Correo corporativo</label>
              <input
                id="admin-email"
                type="email"
                className="input"
                placeholder="correo@empresa.com"
                value={form.email}
                onChange={e => actualizarForm('email', e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="admin-password">Contraseña temporal</label>
              <input
                id="admin-password"
                type="password"
                className="input"
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={e => actualizarForm('password', e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="admin-rol">Rol</label>
              <select
                id="admin-rol"
                className="input"
                value={form.rol}
                onChange={e => actualizarForm('rol', e.target.value)}
                required
              >
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <button type="submit" className="btn btn-primary" disabled={creando}>
              {creando ? <span className="spinner" /> : 'Crear usuario'}
            </button>
          </form>
        )}
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
              const isMe     = p.id === user?.id
              const inactivo = p.activo === false
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: i < perfiles.length - 1 ? '1px solid #f9fafb' : 'none',
                    background: isMe ? 'rgba(13,31,53,.015)' : '#fff',
                    transition: 'background .1s',
                    opacity: inactivo ? .55 : 1,
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
                      {inactivo && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#991b1b',
                          background: '#fee2e2', padding: '1px 6px', borderRadius: 99,
                        }}>
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      {p.email ?? <span style={{ fontFamily: 'monospace' }}>{p.id.slice(0, 8)}…</span>}
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
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={isMe || saving === p.id}
                      onClick={() => inactivo ? cambiarActivo(p.id, true) : setConfirmando(p)}
                      title={inactivo ? 'Reactivar acceso' : 'Desactivar acceso'}
                      style={{
                        opacity: isMe ? .45 : 1,
                        cursor: isMe ? 'not-allowed' : 'pointer',
                        color: inactivo ? '#065f46' : '#991b1b',
                      }}
                    >
                      {inactivo ? 'Activar' : 'Desactivar'}
                    </button>
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

      {confirmando && (
        <ModalDesactivar
          perfil={confirmando}
          saving={saving === confirmando.id}
          onConfirm={() => cambiarActivo(confirmando.id, false)}
          onCancel={() => setConfirmando(null)}
        />
      )}
      </>
      )}

    </div>
  )
}
