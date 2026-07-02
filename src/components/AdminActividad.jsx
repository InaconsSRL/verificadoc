import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { UserPlus, UserCog, UserCheck, UserX, History } from 'lucide-react'
import { ROL_LABEL } from '@/lib/documentos'
import Spinner from '@/components/Spinner'

const ACCION = {
  creado:       { icon: UserPlus,  color: '#1d4ed8', bg: '#dbeafe', texto: 'creó el perfil de' },
  rol_cambiado: { icon: UserCog,   color: '#92400e', bg: '#fef3c7', texto: 'cambió el rol de' },
  activado:     { icon: UserCheck, color: '#065f46', bg: '#d1fae5', texto: 'reactivó a' },
  desactivado:  { icon: UserX,     color: '#991b1b', bg: '#fee2e2', texto: 'desactivó a' },
}

function fmtFechaHora(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// Pestaña Actividad: log de auditoría de perfiles (migración 008).
// Solo lectura; lo escribe un trigger en la base de datos.
export default function AdminActividad({ showToast }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchEventos() }, [])

  async function fetchEventos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('auditoria_perfiles')
      .select('id, perfil_nombre, accion, rol_anterior, rol_nuevo, realizado_por_nombre, realizado_en')
      .order('realizado_en', { ascending: false })
      .limit(100)
    if (error) showToast('Error al cargar la actividad: ' + error.message, true)
    setEventos(data ?? [])
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{
        padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: '#0D1F35', margin: 0 }}>
          Actividad de usuarios
          <span style={{
            marginLeft: 8, background: '#f1f5f9', color: '#6b7280',
            padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
          }}>
            últimos {eventos.length}
          </span>
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem' }}>
          <Spinner size={26} />
        </div>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af' }}>
          <History size={22} style={{ marginBottom: 6 }} />
          <p style={{ fontSize: 13, margin: 0 }}>
            Sin actividad registrada aún. Los cambios de rol y activación se registran automáticamente.
          </p>
        </div>
      ) : (
        <div>
          {eventos.map((ev, i) => {
            const meta = ACCION[ev.accion] ?? { icon: History, color: '#374151', bg: '#f3f4f6', texto: ev.accion }
            const Icon = meta.icon
            return (
              <div
                key={ev.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '.85rem 1.5rem',
                  borderBottom: i < eventos.length - 1 ? '1px solid #f9fafb' : 'none',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={14} color={meta.color} strokeWidth={2} />
                </div>

                <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#374151' }}>
                  <strong>{ev.realizado_por_nombre ?? 'Sistema'}</strong>
                  {' '}{meta.texto}{' '}
                  <strong>{ev.perfil_nombre ?? '—'}</strong>
                  {ev.accion === 'rol_cambiado' && (
                    <span style={{ color: '#6b7280' }}>
                      {' '}({ROL_LABEL[ev.rol_anterior] ?? ev.rol_anterior} a {ROL_LABEL[ev.rol_nuevo] ?? ev.rol_nuevo})
                    </span>
                  )}
                  {ev.accion === 'creado' && ev.rol_nuevo && (
                    <span style={{ color: '#6b7280' }}>
                      {' '}con rol {ROL_LABEL[ev.rol_nuevo] ?? ev.rol_nuevo}
                    </span>
                  )}
                </div>

                <span style={{ flexShrink: 0, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                  {fmtFechaHora(ev.realizado_en)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
