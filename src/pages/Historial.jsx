import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/documentos'
import { generarDocx } from '@/lib/generarDocx'
import { Download, ExternalLink, Ban, RefreshCw, Search, X } from 'lucide-react'
import { fmt } from '@/lib/utils'
import { useToast, Toast } from '@/hooks/useToast'
import { useEmpresas } from '@/hooks/useEmpresas'
import { useAuth } from '@/context/AuthContext'
import Spinner from '@/components/Spinner'
import PageHeader from '@/components/PageHeader'
import Estadisticas from '@/components/Estadisticas'

const TIPO_COLOR = {
  CT: { bg: '#dbeafe', color: '#1e40af' },
  CL: { bg: '#e0f2fe', color: '#0369a1' },
  AM: { bg: '#fef3c7', color: '#92400e' },
  SU: { bg: '#fee2e2', color: '#991b1b' },
  CP: { bg: '#fdf4ff', color: '#7e22ce' },
  CD: { bg: '#ffe4e6', color: '#9f1239' },
}

// ── Modal anulación ──────────────────────────────────────────
function ModalAnular({ doc, onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleConfirm() {
    setSaving(true)
    await onConfirm(doc.id, motivo)
    setSaving(false)
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-head">
          <div>
            <p className="modal-title">Anular documento</p>
            <p className="modal-sub">Esta acción no se puede deshacer.</p>
          </div>
          <button type="button" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-light)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-doc-preview">
          <p className="cell-mono" style={{ marginBottom: 2 }}>{doc.correlativo}</p>
          <p style={{ fontSize: 13, color: 'var(--slate)' }}>{doc.nombre_trabajador}</p>
        </div>

        <div className="field">
          <label className="label">Motivo de anulación (opcional)</label>
          <textarea
            className="input"
            style={{ minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Error en los datos, documento duplicado…"
          />
        </div>

        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={handleConfirm} disabled={saving}
            style={{ fontWeight: 600, gap: 6 }}>
            {saving
              ? <span className="spinner" style={{ borderColor: 'rgba(220,38,38,.2)', borderTopColor: '#dc2626', width: 14, height: 14 }} />
              : <Ban size={14} />
            }
            Confirmar anulación
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────
const FILTROS_VACIO = { empresa_id: '', tipo: '', estado: '', nombre: '', fecha_emision: '' }

function diaSiguiente(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function Historial() {
  const [docs,        setDocs]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [anulando,    setAnulando]    = useState(null)
  const [descargando, setDescargando] = useState(null)
  const [filtros,     setFiltros]     = useState(FILTROS_VACIO)
  const [nombreInput, setNombreInput] = useState('')
  const nombreDebounce = useRef(null)
  const { toast, showToast } = useToast()
  const { empresas } = useEmpresas()
  const { perfil } = useAuth()

  // Gerencia consulta en modo solo lectura: puede ver KPIs, tabla y
  // verificador, pero no anular (el RPC igual lo rechaza en el servidor).
  const soloLectura = perfil?.rol === 'gerencia'

  useEffect(() => {
    fetchDocs()
    return () => clearTimeout(nombreDebounce.current)
  }, [])

  async function fetchDocs(f = filtros) {
    setLoading(true)
    let q = supabase
      .from('documentos')
      .select(`
        id, correlativo, tipo, estado,
        nombre_trabajador, cargo, fecha_emision,
        fecha_ingreso, fecha_cese, fecha_falta,
        descripcion_falta, dias_suspension,
        fecha_inicio_suspension, fecha_limite_descargos, motivo_cese,
        campos_extra, empresa_id,
        empresas ( id, razon_social, ruc, prefijo )
      `)
      .order('fecha_emision', { ascending: false })
      .limit(200)

    if (f.empresa_id)   q = q.eq('empresa_id', f.empresa_id)
    if (f.tipo)         q = q.eq('tipo', f.tipo)
    if (f.estado)       q = q.eq('estado', f.estado)
    if (f.nombre)       q = q.ilike('nombre_trabajador', `%${f.nombre}%`)
    if (f.fecha_emision) {
      // fecha_emision es timestamptz: filtrar por el rango del día
      q = q.gte('fecha_emision', f.fecha_emision)
           .lt('fecha_emision', diaSiguiente(f.fecha_emision))
    }

    const { data, error } = await q
    if (error) {
      showToast('Error al cargar los documentos: ' + error.message, true)
      setLoading(false)
      return
    }
    setDocs(data ?? [])
    setLoading(false)
  }

  function setFiltro(k, val) {
    const nuevo = { ...filtros, [k]: val }
    setFiltros(nuevo)
    fetchDocs(nuevo)
  }

  function onNombreChange(val) {
    setNombreInput(val)
    clearTimeout(nombreDebounce.current)
    nombreDebounce.current = setTimeout(() => {
      setFiltros(prev => {
        const nuevo = { ...prev, nombre: val }
        fetchDocs(nuevo)
        return nuevo
      })
    }, 400)
  }

  function limpiarFiltros() {
    clearTimeout(nombreDebounce.current)
    setNombreInput('')
    setFiltros(FILTROS_VACIO)
    fetchDocs(FILTROS_VACIO)
  }

  async function confirmarAnulacion(id, motivo) {
    // RPC con auditoría: registra anulado_por y anulado_en, y solo
    // permite la transición activo → anulado (documentos inmutables).
    const { error } = await supabase
      .rpc('anular_documento', { p_id: id, p_motivo: motivo || null })
    if (error) {
      showToast('No se pudo anular el documento: ' + error.message, true)
      return
    }
    setAnulando(null)
    showToast('Documento anulado correctamente.')
    fetchDocs()
  }

  async function descargarDoc(doc) {
    setDescargando(doc.id)
    try {
      // Los textos editados al emitir viven en campos_extra: pasarlos
      // para que la re-descarga sea idéntica al documento original.
      await generarDocx(doc, doc.empresas, {
        cuerpoOverride:     doc.campos_extra?.cuerpo,
        lugarFechaOverride: doc.campos_extra?.lugar_fecha,
        observaciones:      doc.campos_extra?.observaciones,
      })
    } catch (err) {
      console.warn('Error al generar Word:', err)
      showToast('No se pudo generar el archivo Word.', true)
    } finally {
      setDescargando(null)
    }
  }

  const tienesFiltros = Object.values(filtros).some(Boolean) || nombreInput.length > 0

  return (
    <div>

      <Toast toast={toast} />

      <PageHeader
        title="Historial"
        subtitle={
          loading
            ? 'Cargando…'
            : `${docs.length} documento${docs.length !== 1 ? 's' : ''}${tienesFiltros ? ' · filtrado' : ''}`
        }
      >
        <button type="button" className="btn" onClick={() => fetchDocs()}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </PageHeader>

      <Estadisticas />

      <div className="card filters-panel">
        <div className="filters-row">

          <div className="input-search-wrap" style={{ flex: '2 1 180px', minWidth: 150 }}>
            <Search size={14} className="input-search-icon" />
            <input
              className="input input-search"
              placeholder="Nombre del trabajador…"
              value={nombreInput}
              onChange={e => onNombreChange(e.target.value)}
            />
          </div>

          <select className="input filter-input" style={{ flex: '2 1 160px', minWidth: 130 }}
            value={filtros.empresa_id} onChange={e => setFiltro('empresa_id', e.target.value)}>
            <option value="">Todas las empresas</option>
            {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.razon_social}</option>)}
          </select>

          <select className="input filter-input" style={{ flex: '1 1 130px', minWidth: 110 }}
            value={filtros.tipo} onChange={e => setFiltro('tipo', e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => (
              <option key={k} value={k}>{k} · {v.label}</option>
            ))}
          </select>

          <div className="filter-date-group">
            <span className="filter-date-label">Fecha de emisión</span>
            <input type="date" className="input filter-input" style={{ minWidth: 140 }}
              value={filtros.fecha_emision} onChange={e => setFiltro('fecha_emision', e.target.value)} />
          </div>

          <select className="input filter-input" style={{ flex: '1 1 120px', minWidth: 100 }}
            value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="anulado">Anulado</option>
          </select>

          {tienesFiltros && (
            <button type="button" onClick={limpiarFiltros} className="btn btn-sm">
              <X size={13} /> Limpiar
            </button>
          )}

        </div>
      </div>

      <div className="card card-flush">
        {loading ? (
          <div className="loading-block">
            <Spinner size={28} />
          </div>
        ) : docs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Search size={22} color="var(--muted-light)" />
            </div>
            <p className="empty-state-title">Sin resultados</p>
            <p className="empty-state-text">
              {tienesFiltros ? 'Ningún documento coincide con los filtros aplicados.' : 'Aún no se han emitido documentos.'}
            </p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['Correlativo', 'Tipo', 'Trabajador', 'Empresa', 'Fecha emisión', 'Estado', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const tc = TIPO_COLOR[doc.tipo] ?? { bg: '#f3f4f6', color: '#374151' }
                  return (
                    <tr key={doc.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="cell-mono">{doc.correlativo}</span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="tag-tipo" style={{ background: tc.bg, color: tc.color }}>
                          {doc.tipo}
                        </span>
                      </td>
                      <td>
                        <p className="cell-name">{doc.nombre_trabajador}</p>
                        {doc.cargo && <p className="cell-sub">{doc.cargo}</p>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: 'var(--muted)' }}>
                        {doc.empresas?.razon_social ?? '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                        {fmt(doc.fecha_emision)}
                      </td>
                      <td>
                        <span className={`badge badge-${doc.estado}`}>
                          {doc.estado === 'activo' ? 'Activo' : 'Anulado'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '.35rem' }}>
                          <a href={`/v/${doc.id}`} target="_blank" rel="noreferrer"
                            className="btn btn-sm" title="Ver verificador público">
                            <ExternalLink size={12} />
                          </a>
                          <button type="button" className="btn btn-sm"
                            disabled={descargando === doc.id}
                            onClick={() => descargarDoc(doc)}
                            title="Descargar .docx">
                            {descargando === doc.id
                              ? <span className="spinner spinner-dark" style={{ width: 12, height: 12 }} />
                              : <Download size={12} />
                            }
                          </button>
                          {doc.estado === 'activo' && !soloLectura && (
                            <button type="button" className="btn btn-sm btn-danger"
                              onClick={() => setAnulando(doc)}
                              title="Anular documento">
                              <Ban size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {anulando && (
        <ModalAnular
          doc={anulando}
          onConfirm={confirmarAnulacion}
          onCancel={() => setAnulando(null)}
        />
      )}
    </div>
  )
}
