import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/documentos'
import { CheckCircle, XCircle, AlertTriangle, Search, ClipboardCheck } from 'lucide-react'
import { fmtLong as fmt } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import BrandLogo from '@/components/BrandLogo'

function Campo({ label, value, full }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <p className="verify-field-label">{label}</p>
      <p className="verify-field-value">{value ?? '—'}</p>
    </div>
  )
}

// Búsqueda manual: para quien recibe el documento impreso y el QR
// no escanea (fotocopia, impresión borrosa).
function BuscarManual({ inicial = '' }) {
  const navigate = useNavigate()
  const [codigo, setCodigo] = useState(inicial)

  function handleSubmit(e) {
    e.preventDefault()
    const limpio = codigo.trim()
    if (limpio) navigate(`/v/${encodeURIComponent(limpio)}`)
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem', textAlign: 'left' }}>
      <label className="label" htmlFor="codigo-manual">
        ¿Tienes el documento impreso? Escribe su número
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id="codigo-manual"
          className="input"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          placeholder="Ej: CT-0001-2026"
          autoComplete="off"
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={!codigo.trim()}>
          Verificar
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--mc-color-text-secondary, #6b7280)', marginTop: 6 }}>
        Lo encuentras en el recuadro "Control interno" del documento, como N.° de documento.
      </p>
    </form>
  )
}

const PASOS = [
  'Buscando en registros…',
  'Verificando autenticidad…',
  'Comprobando vigencia…',
]

// Respetar la preferencia del sistema: sin animación de verificación
const REDUCE_MOTION = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

export default function Verificar() {
  const { uuid }       = useParams()
  const [searchParams] = useSearchParams()
  const codigo         = uuid || searchParams.get('codigo')

  const [doc,       setDoc]       = useState(null)
  const [fetchDone, setFetchDone] = useState(false)
  const [error,     setError]     = useState(false)
  const [paso,      setPaso]      = useState(REDUCE_MOTION ? PASOS.length : 0)

  useDocumentTitle('Verificar documento')

  // Advance animation one step every 550 ms
  useEffect(() => {
    if (paso >= PASOS.length) return
    const t = setTimeout(() => setPaso(p => p + 1), 550)
    return () => clearTimeout(t)
  }, [paso])

  useEffect(() => {
    // Reiniciar al cambiar de código (búsqueda manual encadenada)
    setDoc(null)
    setError(false)
    setFetchDone(false)
    setPaso(REDUCE_MOTION ? PASOS.length : 0)
    if (!codigo) { setFetchDone(true); return }
    buscarDocumento()
  }, [codigo])

  async function buscarDocumento() {
    // RPC de búsqueda por código exacto: no permite listar documentos
    // y devuelve solo columnas públicas + razón social y RUC.
    const { data, error: rpcErr } = await supabase
      .rpc('verificar_documento', { p_codigo: codigo })

    const docData = Array.isArray(data) ? data[0] : data
    if (rpcErr || !docData) {
      setError(true)
      setFetchDone(true)
      return
    }

    setDoc({
      ...docData,
      empresas: docData.empresa_razon_social
        ? { razon_social: docData.empresa_razon_social, ruc: docData.empresa_ruc }
        : null,
    })
    setFetchDone(true)
  }

  // Show result only when both fetch and animation are done
  const ready    = fetchDone && paso >= PASOS.length
  const tipoInfo = doc ? (TIPOS_DOCUMENTO[doc.tipo] ?? { label: doc.tipo }) : null
  const esActivo = doc?.estado === 'activo'

  return (
    <div className="verify-page">
      <header className="verify-header">
        <BrandLogo size="md" />
      </header>

      <div className="verify-wrap">

        {/* ── Checking animation ── */}
        {!ready && (
          <div className="verify-checking">
            <div className="verify-checking-icon">
              <Search size={26} strokeWidth={1.75} />
            </div>
            <p className="verify-checking-title">Revisando documento</p>
            <div className="verify-checking-steps">
              {PASOS.map((label, i) => (
                <div
                  key={i}
                  className={`verify-check-step${paso > i ? ' done' : paso === i ? ' active' : ''}`}
                >
                  <span className="verify-check-dot">{paso > i ? '✓' : ''}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── No código ── */}
        {ready && !codigo && (
          <div className="verify-card verify-card-result">
            <div className="empty-state">
              <div className="empty-state-icon">
                <Search size={24} color="var(--mc-color-text-placeholder)" />
              </div>
              <p className="empty-state-title">Verificar un documento</p>
              <p className="empty-state-text">
                Escanea el código QR impreso en el documento, o escribe su número aquí.
              </p>
              <BuscarManual />
            </div>
          </div>
        )}

        {/* ── Not found ── */}
        {ready && error && codigo && (
          <div className="verify-card verify-card-result" role="status">
            <div className="empty-state" style={{ padding: '2.5rem 1.5rem' }}>
              <div className="empty-state-icon" style={{ background: 'var(--mc-color-danger-soft)' }}>
                <AlertTriangle size={26} color="var(--mc-color-danger)" />
              </div>
              <p className="empty-state-title">Documento no encontrado</p>
              <p className="empty-state-text" style={{ marginBottom: '1.25rem' }}>
                El código <span className="mono" style={{ background: 'var(--mc-color-bg-secondary)', padding: '2px 7px', borderRadius: 4 }}>{codigo}</span> no existe en nuestros registros.
              </p>
              <div className="alert alert-error" style={{ textAlign: 'left' }}>
                Revisa que el código esté bien escrito. Si el problema continúa, contacta a la empresa que emitió el documento.
              </div>
              <BuscarManual />
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {ready && doc && (
          <article className="verify-card verify-card-result">

            {/* 1 · Status banner (role=status: lo anuncian los lectores de pantalla) */}
            <div className={`verify-status ${esActivo ? 'valid' : 'invalid'}`} role="status">
              <div className="verify-status-icon">
                {esActivo
                  ? <CheckCircle size={44} color="#fff" strokeWidth={1.5} />
                  : <XCircle    size={44} color="#fff" strokeWidth={1.5} />
                }
              </div>
              <p className="verify-status-title">
                {esActivo ? 'Documento válido y auténtico' : 'Documento anulado'}
              </p>
              <p className="verify-status-emisor">
                {esActivo
                  ? <>Emitido por <strong>{doc.empresas?.razon_social ?? '—'}</strong>{doc.empresas?.ruc ? ` · RUC ${doc.empresas.ruc}` : ''}</>
                  : <>
                      Este documento ha sido anulado y ya no tiene validez legal.
                      {doc.empresas?.razon_social && <> Ante cualquier duda, contacte a <strong>{doc.empresas.razon_social}</strong>.</>}
                    </>
                }
              </p>
            </div>

            {/* 2 · Datos del documento */}
            <div className="verify-doc-section">
              <p className="verify-section-label">Datos del documento</p>
              <div className="verify-doc-fields">
                <div>
                  <p className="verify-field-label">Tipo de documento</p>
                  <p className="verify-field-value">{tipoInfo?.label ?? doc.tipo}</p>
                  {tipoInfo?.descripcion && (
                    <p style={{ fontSize: 12, color: 'var(--mc-color-text-secondary, #6b7280)', margin: '2px 0 0' }}>
                      {tipoInfo.descripcion}
                    </p>
                  )}
                </div>
                <div>
                  <p className="verify-field-label">N.° de documento</p>
                  <p className="verify-field-value verify-correlativo-inline">{doc.correlativo}</p>
                </div>
              </div>
            </div>

            {/* 3 · Datos del trabajador */}
            <div className="verify-body">
              <p className="verify-section-label">Datos del trabajador</p>
              <div className="verify-grid">
                <Campo label="Nombre completo"   value={doc.nombre_trabajador} full />
                <Campo label="Cargo"             value={doc.cargo}             full />
                <Campo label="Empresa"           value={doc.empresas?.razon_social} />
                <Campo label="Fecha de emisión"  value={fmt(doc.fecha_emision)} />
                {doc.fecha_ingreso && <Campo label="Fecha de ingreso" value={fmt(doc.fecha_ingreso)} />}
                {doc.fecha_cese    && <Campo label="Fecha de cese"    value={fmt(doc.fecha_cese)} />}
              </div>
            </div>

            {/* 4 · Checklist de cotejo contra el documento físico */}
            {esActivo && (
              <div style={{
                margin: '0 1.5rem 1.25rem', padding: '12px 16px',
                background: 'var(--mc-color-info-soft, #eff6ff)',
                border: '1px solid #bfdbfe', borderRadius: 8,
                display: 'flex', gap: 10, alignItems: 'flex-start',
                textAlign: 'left',
              }}>
                <ClipboardCheck size={18} color="#1d4ed8" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.55 }}>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Antes de dar por bueno el documento</strong>
                  Compruebe que el nombre del trabajador, el cargo, las fechas y el N.° de documento
                  que ve aquí coincidan exactamente con los del documento impreso que tiene en la mano.
                </div>
              </div>
            )}

            {/* 5 · Footer */}
            <div className="verify-foot">
              <span className="verify-foot-brand">VerificaDoc</span>
              <span className="verify-foot-code">{doc.correlativo}</span>
            </div>

          </article>
        )}

      </div>

      <p className="verify-page-foot">VerificaDoc</p>
    </div>
  )
}
