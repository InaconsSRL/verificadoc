import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/documentos'
import { PLACEHOLDERS, PLANTILLAS_BASE, DOC_EJEMPLO, EMPRESA_EJEMPLO, renderPlantilla } from '@/lib/plantillas'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast, Toast } from '@/hooks/useToast'
import { fmt } from '@/lib/utils'
import { Save, RotateCcw, Info } from 'lucide-react'
import Spinner from '@/components/Spinner'
import PageHeader from '@/components/PageHeader'

export default function Plantillas() {
  const [plantillas, setPlantillas] = useState({})   // tipo → fila de BD
  const [borradores, setBorradores] = useState({})   // tipo → texto en edición
  const [tipo,       setTipo]       = useState('CT')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const { toast, showToast } = useToast()
  const textareaRef = useRef(null)

  useDocumentTitle('Plantillas')

  useEffect(() => { fetchPlantillas() }, [])

  async function fetchPlantillas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('plantillas_documento')
      .select('tipo, cuerpo, actualizado_por_nombre, actualizado_en')
    if (error) {
      showToast('Error al cargar las plantillas: ' + error.message, true)
      setLoading(false)
      return
    }
    const porTipo = Object.fromEntries((data ?? []).map(p => [p.tipo, p]))
    setPlantillas(porTipo)
    setBorradores(Object.fromEntries(
      Object.keys(TIPOS_DOCUMENTO).map(t => [t, porTipo[t]?.cuerpo ?? PLANTILLAS_BASE[t]])
    ))
    setLoading(false)
  }

  const actual     = plantillas[tipo]
  const borrador   = borradores[tipo] ?? ''
  const original   = actual?.cuerpo ?? PLANTILLAS_BASE[tipo]
  const modificado = borrador !== original
  const preview    = renderPlantilla(borrador, DOC_EJEMPLO, EMPRESA_EJEMPLO)

  function setBorrador(texto) {
    setBorradores(prev => ({ ...prev, [tipo]: texto }))
  }

  // Inserta el placeholder en la posición del cursor del textarea
  function insertarPlaceholder(token) {
    const ta = textareaRef.current
    const chip = `{{${token}}}`
    if (!ta) { setBorrador(borrador + chip); return }
    const ini = ta.selectionStart ?? borrador.length
    const fin = ta.selectionEnd ?? borrador.length
    const nuevo = borrador.slice(0, ini) + chip + borrador.slice(fin)
    setBorrador(nuevo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = ini + chip.length
    })
  }

  async function handleGuardar() {
    setSaving(true)
    const { error } = await supabase
      .from('plantillas_documento')
      .update({ cuerpo: borrador })
      .eq('tipo', tipo)
    setSaving(false)
    if (error) {
      showToast('No se pudo guardar la plantilla: ' + error.message, true)
      return
    }
    showToast(`Plantilla de ${TIPOS_DOCUMENTO[tipo].label} actualizada. Las próximas emisiones usarán este texto.`)
    fetchPlantillas()
  }

  return (
    <div>
      <Toast toast={toast} />

      <PageHeader
        title="Plantillas de documentos"
        subtitle="Texto legal de cada tipo de documento. Los cambios aplican solo a emisiones futuras: los documentos ya emitidos conservan el texto con el que salieron."
      />

      {loading ? (
        <div className="loading-block"><Spinner size={28} /></div>
      ) : (
        <div className="emitir-grid">

          {/* ── Columna izquierda: selector + placeholders ── */}
          <div className="card">
            <p className="emitir-step-title">Tipo de documento</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginBottom: '1.25rem' }}>
              {Object.entries(TIPOS_DOCUMENTO).map(([key, { label }]) => {
                const activo = tipo === key
                const conCambios = (borradores[key] ?? '') !== (plantillas[key]?.cuerpo ?? PLANTILLAS_BASE[key])
                return (
                  <button
                    key={key} type="button"
                    onClick={() => setTipo(key)}
                    style={{
                      textAlign: 'left', padding: '.6rem .75rem', borderRadius: 8,
                      border: activo ? '2px solid var(--navy)' : '1px solid var(--gray-200)',
                      background: activo ? 'rgba(13,31,53,.05)' : '#fff',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, color: activo ? 'var(--navy)' : 'var(--gray-700)' }}>
                      {key}
                      {conCambios && <span title="Cambios sin guardar" style={{ color: '#d97706', marginLeft: 6 }}>●</span>}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2, lineHeight: 1.3 }}>
                      {label}
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="emitir-step-title">Datos disponibles</p>
            <p style={{ fontSize: 12, color: 'var(--gray-500)', margin: '0 0 .6rem' }}>
              Haz clic para insertar en el texto. Al emitir, se reemplazan por los datos reales del documento.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLACEHOLDERS.map(({ token, descripcion }) => (
                <button
                  key={token} type="button"
                  onClick={() => insertarPlaceholder(token)}
                  title={descripcion}
                  style={{
                    fontFamily: 'var(--mono, monospace)', fontSize: 11,
                    padding: '3px 8px', borderRadius: 99, cursor: 'pointer',
                    border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8',
                  }}
                >
                  {`{{${token}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* ── Columna derecha: editor + vista previa ── */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '.75rem', flexWrap: 'wrap' }}>
              <p className="emitir-step-title" style={{ margin: 0, flex: 1 }}>
                {TIPOS_DOCUMENTO[tipo].label}
              </p>
              {actual?.actualizado_en && (
                <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                  Última edición: {actual.actualizado_por_nombre ?? 'Sistema'} · {fmt(actual.actualizado_en)}
                </span>
              )}
            </div>

            <label className="label" htmlFor="plantilla-cuerpo">Texto de la plantilla</label>
            <textarea
              id="plantilla-cuerpo"
              ref={textareaRef}
              className="input"
              value={borrador}
              onChange={e => setBorrador(e.target.value)}
              rows={12}
              style={{ fontFamily: 'var(--mono, monospace)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: 8, margin: '.75rem 0 1.25rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGuardar}
                disabled={saving || !modificado || !borrador.trim()}
              >
                {saving ? <span className="spinner" /> : <><Save size={14} /> Guardar plantilla</>}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setBorrador(PLANTILLAS_BASE[tipo])}
                disabled={saving || borrador === PLANTILLAS_BASE[tipo]}
              >
                <RotateCcw size={13} /> Restaurar texto original
              </button>
            </div>

            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '8px 12px', background: '#f8fafc', borderRadius: 6,
              border: '1px solid var(--gray-200, #e5e7eb)', marginBottom: '.75rem',
              fontSize: 12, color: 'var(--gray-500)',
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              Así se verá con datos de ejemplo ({DOC_EJEMPLO.nombre_trabajador}):
            </div>
            <div style={{
              fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.75,
              color: '#1A2733', whiteSpace: 'pre-wrap', padding: '12px 16px',
              border: '1px solid var(--gray-200, #e5e7eb)', borderRadius: 8, background: '#fff',
            }}>
              {preview}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
