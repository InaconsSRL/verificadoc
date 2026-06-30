import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/documentos'
import { CheckCircle, XCircle, AlertTriangle, Search } from 'lucide-react'
import { fmtLong as fmt } from '@/lib/utils'
import BrandLogo from '@/components/BrandLogo'

function Campo({ label, value, full }) {
  return (
    <div style={full ? { gridColumn: '1 / -1' } : undefined}>
      <p className="verify-field-label">{label}</p>
      <p className="verify-field-value">{value ?? '—'}</p>
    </div>
  )
}

const PASOS = [
  'Buscando en registros…',
  'Verificando autenticidad…',
  'Comprobando vigencia…',
]

export default function Verificar() {
  const { uuid }       = useParams()
  const [searchParams] = useSearchParams()
  const codigo         = uuid || searchParams.get('codigo')

  const [doc,       setDoc]       = useState(null)
  const [fetchDone, setFetchDone] = useState(false)
  const [error,     setError]     = useState(false)
  const [paso,      setPaso]      = useState(0)

  // Advance animation one step every 550 ms
  useEffect(() => {
    if (paso >= PASOS.length) return
    const t = setTimeout(() => setPaso(p => p + 1), 550)
    return () => clearTimeout(t)
  }, [paso])

  useEffect(() => {
    if (!codigo) { setFetchDone(true); return }
    buscarDocumento()
  }, [codigo])

  async function buscarDocumento() {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo)

    const { data: docData, error: docErr } = await supabase
      .from('documentos_publicos')
      .select('id, correlativo, tipo, estado, nombre_trabajador, cargo, fecha_ingreso, fecha_cese, fecha_emision, empresa_id')
      .eq(isUUID ? 'id' : 'correlativo', codigo)
      .single()

    if (docErr || !docData) {
      setError(true)
      setFetchDone(true)
      return
    }

    let empresas = null
    if (docData.empresa_id) {
      const { data: empData } = await supabase
        .from('empresas')
        .select('razon_social, ruc')
        .eq('id', docData.empresa_id)
        .single()
      empresas = empData ?? null
    }

    setDoc({ ...docData, empresas })
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
              <p className="empty-state-title">Código no proporcionado</p>
              <p className="empty-state-text">
                Escanea el código QR impreso en el documento para verificar su autenticidad.
              </p>
            </div>
          </div>
        )}

        {/* ── Not found ── */}
        {ready && error && codigo && (
          <div className="verify-card verify-card-result">
            <div className="empty-state" style={{ padding: '2.5rem 1.5rem' }}>
              <div className="empty-state-icon" style={{ background: 'var(--mc-color-danger-soft)' }}>
                <AlertTriangle size={26} color="var(--mc-color-danger)" />
              </div>
              <p className="empty-state-title">Documento no encontrado</p>
              <p className="empty-state-text" style={{ marginBottom: '1.25rem' }}>
                El código <span className="mono" style={{ background: 'var(--mc-color-bg-secondary)', padding: '2px 7px', borderRadius: 4 }}>{codigo}</span> no existe en nuestros registros.
              </p>
              <div className="alert alert-error" style={{ textAlign: 'left' }}>
                Si crees que es un error, contacta a Capital Humano.
              </div>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {ready && doc && (
          <article className="verify-card verify-card-result">

            {/* 1 · Status banner */}
            <div className={`verify-status ${esActivo ? 'valid' : 'invalid'}`}>
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
                  : 'Este documento ha sido anulado y ya no tiene validez legal.'
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

            {/* 4 · Footer */}
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
