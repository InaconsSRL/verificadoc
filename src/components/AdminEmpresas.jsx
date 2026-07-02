import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Pencil, Plus, AlertTriangle } from 'lucide-react'
import Spinner from '@/components/Spinner'
import Modal from '@/components/Modal'

// Los datos sembrados por SQL usan placeholders tipo "[DIRECCIÓN PENDIENTE]"
// que el generador de Word omite: detectarlos para avisar al administrador.
function esPendiente(valor) {
  return !valor || valor.startsWith('[')
}

function datosPendientes(emp) {
  return esPendiente(emp.direccion) || esPendiente(emp.representante) || esPendiente(emp.cargo_rep)
}

const FORM_ALTA_VACIO = { razon_social: '', ruc: '', prefijo: '' }

function CampoTexto({ id, label, value, onChange, placeholder, required, hint, maxLength }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6 }}>· {hint}</span>}
      </label>
      <input
        id={id} className="input" value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} required={required} maxLength={maxLength}
      />
    </div>
  )
}

// ── Modal edición de datos de cabecera/firma ────────────────
function ModalEditar({ empresa, onGuardado, onCancel, showToast }) {
  const [form, setForm] = useState({
    direccion:     esPendiente(empresa.direccion)     ? '' : empresa.direccion,
    telefono:      empresa.telefono ?? '',
    representante: esPendiente(empresa.representante) ? '' : empresa.representante,
    cargo_rep:     esPendiente(empresa.cargo_rep)     ? '' : empresa.cargo_rep,
  })
  const [saving, setSaving] = useState(false)

  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleGuardar(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase
      .from('empresas')
      .update({
        direccion:     form.direccion.trim()     || null,
        telefono:      form.telefono.trim()      || null,
        representante: form.representante.trim() || null,
        cargo_rep:     form.cargo_rep.trim()     || null,
      })
      .eq('id', empresa.id)
    setSaving(false)
    if (error) {
      showToast(`No se pudo guardar: ${error.message}`, true)
      return
    }
    showToast('Datos de la empresa actualizados.')
    onGuardado()
  }

  return (
    <Modal
      title={empresa.razon_social}
      subtitle={`RUC ${empresa.ruc} · Estos datos aparecen en la cabecera y la firma de los documentos.`}
      ariaLabel={`Editar datos de ${empresa.razon_social}`}
      onClose={onCancel}
    >
        <form onSubmit={handleGuardar}>
          <CampoTexto id="emp-direccion" label="Dirección fiscal" value={form.direccion}
            onChange={set('direccion')} placeholder="Av. Ejemplo 123, Huancayo" />
          <CampoTexto id="emp-telefono" label="Teléfono" hint="opcional" value={form.telefono}
            onChange={set('telefono')} placeholder="064 123456" />
          <CampoTexto id="emp-representante" label="Representante (firmante)" value={form.representante}
            onChange={set('representante')} placeholder="Nombre completo del firmante" />
          <CampoTexto id="emp-cargo" label="Cargo del firmante" value={form.cargo_rep}
            onChange={set('cargo_rep')} placeholder="Gerente General" />

          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Guardar cambios'}
            </button>
          </div>
        </form>
    </Modal>
  )
}

// ── Pestaña Empresas ─────────────────────────────────────────
export default function AdminEmpresas({ showToast }) {
  const [empresas, setEmpresas] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editando, setEditando] = useState(null)
  const [saving,   setSaving]   = useState(null)
  const [showAlta, setShowAlta] = useState(false)
  const [alta,     setAlta]     = useState(FORM_ALTA_VACIO)
  const [creando,  setCreando]  = useState(false)

  useEffect(() => { fetchEmpresas() }, [])

  async function fetchEmpresas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('empresas')
      .select('id, razon_social, ruc, prefijo, direccion, telefono, representante, cargo_rep, activa')
      .order('razon_social')
    if (error) showToast('Error al cargar empresas: ' + error.message, true)
    setEmpresas(data ?? [])
    setLoading(false)
  }

  async function cambiarActiva(emp) {
    setSaving(emp.id)
    const { error } = await supabase
      .from('empresas')
      .update({ activa: !emp.activa })
      .eq('id', emp.id)
    setSaving(null)
    if (error) {
      showToast(`No se pudo actualizar: ${error.message}`, true)
      return
    }
    setEmpresas(prev => prev.map(e => e.id === emp.id ? { ...e, activa: !emp.activa } : e))
    showToast(emp.activa
      ? 'Empresa desactivada: ya no aparecerá al emitir documentos.'
      : 'Empresa activada: vuelve a estar disponible al emitir.')
  }

  const rucValido     = /^\d{11}$/.test(alta.ruc)
  const prefijoValido = /^[A-Z]{2,4}$/.test(alta.prefijo)

  async function handleAlta(e) {
    e.preventDefault()
    setCreando(true)
    const { error } = await supabase
      .from('empresas')
      .insert([{
        razon_social: alta.razon_social.trim(),
        ruc:          alta.ruc,
        prefijo:      alta.prefijo,
        activa:       true,
      }])
    setCreando(false)
    if (error) {
      const msg = error.message.includes('duplicate')
        ? 'Ya existe una empresa con ese RUC o prefijo.'
        : error.message
      showToast(`No se pudo crear la empresa: ${msg}`, true)
      return
    }
    setAlta(FORM_ALTA_VACIO)
    setShowAlta(false)
    showToast('Empresa creada. Completa su dirección y representante para que salgan en los documentos.')
    fetchEmpresas()
  }

  return (
    <>
      {/* Alta de empresa */}
      <div className="card admin-nuevo-usuario">
        <div className="admin-nuevo-usuario-head">
          <div>
            <p className="admin-nuevo-usuario-title">Nueva empresa</p>
            <p className="admin-nuevo-usuario-desc">
              Registra una empresa del grupo. Después de crearla, edita su dirección y representante.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAlta(v => !v)}>
            <Plus size={14} />
            {showAlta ? 'Cancelar' : 'Agregar empresa'}
          </button>
        </div>

        {showAlta && (
          <form className="admin-nuevo-usuario-form" onSubmit={handleAlta}>
            <CampoTexto id="alta-razon" label="Razón social" required
              value={alta.razon_social} onChange={v => setAlta(p => ({ ...p, razon_social: v }))}
              placeholder="EMPRESA S.A.C." />
            <CampoTexto id="alta-ruc" label="RUC" hint="11 dígitos" required maxLength={11}
              value={alta.ruc} onChange={v => setAlta(p => ({ ...p, ruc: v.replace(/\D/g, '') }))}
              placeholder="20123456789" />
            <CampoTexto id="alta-prefijo" label="Prefijo" hint="2–4 letras, para el correlativo" required maxLength={4}
              value={alta.prefijo} onChange={v => setAlta(p => ({ ...p, prefijo: v.toUpperCase().replace(/[^A-Z]/g, '') }))}
              placeholder="EMP" />
            <button type="submit" className="btn btn-primary" disabled={creando || !rucValido || !prefijoValido}>
              {creando ? <span className="spinner" /> : 'Crear empresa'}
            </button>
          </form>
        )}
      </div>

      {/* Lista de empresas */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#0D1F35', margin: 0 }}>
            Empresas
            <span style={{
              marginLeft: 8, background: '#f1f5f9', color: '#6b7280',
              padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            }}>
              {empresas.length}
            </span>
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2.5rem' }}>
            <Spinner size={26} />
          </div>
        ) : empresas.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '2.5rem', color: '#9ca3af', fontSize: 13 }}>
            Sin empresas registradas.
          </p>
        ) : (
          <div>
            {empresas.map((emp, i) => {
              const pendiente = datosPendientes(emp)
              const inactiva  = emp.activa === false
              return (
                <div
                  key={emp.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: i < empresas.length - 1 ? '1px solid #f9fafb' : 'none',
                    opacity: inactiva ? .55 : 1,
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                    background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 size={17} color="#6b7280" strokeWidth={1.75} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: 0 }}>
                        {emp.razon_social}
                      </p>
                      {pendiente && (
                        <span title="Faltan dirección o representante: los documentos salen sin esos datos" style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 600, color: '#92400e',
                          background: '#fef3c7', padding: '1px 6px', borderRadius: 99,
                        }}>
                          <AlertTriangle size={10} /> Datos pendientes
                        </span>
                      )}
                      {inactiva && (
                        <span style={{
                          fontSize: 10, fontWeight: 600, color: '#991b1b',
                          background: '#fee2e2', padding: '1px 6px', borderRadius: 99,
                        }}>
                          Inactiva
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9ca3af' }}>
                      RUC {emp.ruc} · Prefijo <span style={{ fontFamily: 'monospace' }}>{emp.prefijo}</span>
                      {!esPendiente(emp.representante) && ` · Firma: ${emp.representante}`}
                    </p>
                  </div>

                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button type="button" className="btn btn-sm" onClick={() => setEditando(emp)} title="Editar datos">
                      <Pencil size={12} /> Editar
                    </button>
                    <button
                      type="button" className="btn btn-sm"
                      disabled={saving === emp.id}
                      onClick={() => cambiarActiva(emp)}
                      style={{ color: inactiva ? '#065f46' : '#991b1b' }}
                    >
                      {inactiva ? 'Activar' : 'Desactivar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editando && (
        <ModalEditar
          empresa={editando}
          showToast={showToast}
          onCancel={() => setEditando(null)}
          onGuardado={() => { setEditando(null); fetchEmpresas() }}
        />
      )}
    </>
  )
}
