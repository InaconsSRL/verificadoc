import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useEmpresas } from '@/hooks/useEmpresas'
import { TIPOS_DOCUMENTO, MOTIVOS_CESE, TITULOS } from '@/lib/documentos'
import { hoy, fmtCorto, getVerifyUrl, addDiasHabiles } from '@/lib/utils'
import { validarFechasEmision } from '@/lib/validacionesEmitir'
import { renderPlantilla } from '@/lib/plantillas'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { generarDocx } from '@/lib/generarDocx'
import QRCode from 'qrcode'
import { Download, CheckCircle, Eye, Copy, AlertTriangle } from 'lucide-react'
import { getCuerpoDefault, getLugarFechaDefault } from '@/lib/generarDocx'
import { getLogoUrl } from '@/lib/logosEmpresa'
import PageHeader from '@/components/PageHeader'
import { useToast, Toast } from '@/hooks/useToast'

// ── Campos específicos según tipo ───────────────────────────
function CamposFalta({ v, set }) {
  return (
    <>
      <div className="field">
        <label className="label">Fecha de la falta</label>
        <input
          type="date" className="input"
          value={v.fecha_falta ?? ''} max={hoy()}
          onChange={e => set('fecha_falta', e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label className="label">
          Descripción de la falta
          <span style={{ color: 'var(--red)', fontSize: 11, marginLeft: 6, fontWeight: 400 }}>
            · confidencial, no aparece en el verificador
          </span>
        </label>
        <textarea
          className="input" style={{ minHeight: 90, resize: 'vertical' }}
          value={v.descripcion_falta ?? ''}
          onChange={e => set('descripcion_falta', e.target.value)}
          placeholder="Descripción detallada de los hechos..."
          required
        />
      </div>
    </>
  )
}

function CamposCT({ v, set }) {
  return (
    <>
      <div className="field">
        <label className="label">
          Área / unidad
          <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6 }}>· opcional</span>
        </label>
        <input
          className="input" value={v.area ?? ''}
          onChange={e => set('area', e.target.value)}
          placeholder="Ej: Recursos Humanos, Logística…"
        />
      </div>
      <div className="field">
        <label className="label">Fecha de cese</label>
        <input
          type="date" className="input"
          value={v.fecha_cese ?? ''} max={hoy()}
          onChange={e => set('fecha_cese', e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label className="label">Motivo del cese</label>
        <select
          className="input"
          value={v.motivo_cese ?? ''}
          onChange={e => set('motivo_cese', e.target.value)}
          required
        >
          <option value="">Seleccionar…</option>
          {MOTIVOS_CESE.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
    </>
  )
}

function CamposCL({ v, set }) {
  return (
    <>
      <div className="field">
        <label className="label">
          Área / unidad
          <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6 }}>· opcional</span>
        </label>
        <input
          className="input" value={v.area ?? ''}
          onChange={e => set('area', e.target.value)}
          placeholder="Ej: Recursos Humanos, Logística…"
        />
      </div>
      <div className="field">
        <label className="label">
          Tipo de contrato
          <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6 }}>· opcional</span>
        </label>
        <select className="input" value={v.tipo_contrato ?? ''} onChange={e => set('tipo_contrato', e.target.value)}>
          <option value="">No especificar</option>
          <option value="Contrato indefinido">Contrato indefinido</option>
          <option value="Contrato a plazo fijo">Contrato a plazo fijo</option>
          <option value="Contrato por obra o servicio">Contrato por obra o servicio</option>
          <option value="Contrato de locación de servicios">Contrato de locación de servicios</option>
        </select>
      </div>
    </>
  )
}

function CamposAM({ v, set }) {
  return <CamposFalta v={v} set={set} />
}

function CamposSU({ v, set }) {
  return (
    <>
      <CamposFalta v={v} set={set} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="field">
          <label className="label">Días de suspensión</label>
          <input
            type="number" className="input" min="1" max="30"
            value={v.dias_suspension ?? ''}
            onChange={e => set('dias_suspension', e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label className="label">Fecha inicio suspensión</label>
          <input
            type="date" className="input"
            value={v.fecha_inicio_suspension ?? ''}
            onChange={e => set('fecha_inicio_suspension', e.target.value)}
            required
          />
        </div>
      </div>
    </>
  )
}

function CamposCP({ v, set }) {
  return (
    <>
      <CamposFalta v={v} set={set} />
      {v.fecha_falta && (
        <div className="field">
          <label className="label">
            Fecha límite para descargos
            <span style={{ color: 'var(--gray-400)', fontWeight: 400, marginLeft: 6 }}>
              (6 días hábiles, calculado automáticamente)
            </span>
          </label>
          <input
            type="date" className="input"
            style={{ background: 'var(--gray-50)', color: 'var(--gray-600)' }}
            value={addDiasHabiles(v.fecha_falta, 6)}
            readOnly
          />
        </div>
      )}
    </>
  )
}

function CamposCD({ v, set }) {
  return (
    <>
      <CamposFalta v={v} set={set} />
      <div className="field">
        <label className="label">Fecha de cese</label>
        <input
          type="date" className="input"
          value={v.fecha_cese ?? ''} max={hoy()}
          onChange={e => set('fecha_cese', e.target.value)}
          required
        />
      </div>
    </>
  )
}

const CAMPOS_POR_TIPO = { CT: CamposCT, CL: CamposCL, AM: CamposAM, SU: CamposSU, CP: CamposCP, CD: CamposCD }

function CamposEspecificos({ tipo, valores, onChange }) {
  const v = valores
  const set = (k, val) => onChange({ ...v, [k]: val })
  const Comp = CAMPOS_POR_TIPO[tipo]
  return Comp ? <Comp v={v} set={set} /> : null
}

// ── Stepper de progreso ─────────────────────────────────────

const ETAPAS = ['Datos del documento', 'Revisar y editar', 'Emitido']

function Stepper({ etapa }) {
  return (
    <ol aria-label="Progreso de emisión" style={{
      display: 'flex', flexWrap: 'wrap', alignItems: 'center',
      listStyle: 'none', padding: 0, margin: '0 0 1.25rem',
    }}>
      {ETAPAS.map((label, i) => {
        const n      = i + 1
        const activo = etapa === n
        const hecho  = etapa > n
        return (
          <li key={label} aria-current={activo ? 'step' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
            <span aria-hidden style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: hecho || activo ? 'var(--navy)' : 'var(--gray-100, #f3f4f6)',
              color: hecho || activo ? '#fff' : 'var(--gray-500, #6b7280)',
            }}>
              {hecho ? '✓' : n}
            </span>
            <span style={{
              fontSize: 12, fontWeight: activo ? 700 : 500,
              color: activo ? 'var(--navy)' : 'var(--gray-500, #6b7280)',
            }}>
              {label}
            </span>
            {i < ETAPAS.length - 1 && (
              <span aria-hidden style={{ width: 24, height: 1, background: 'var(--gray-200, #e5e7eb)', marginLeft: 16 }} />
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ── Vista previa modal ──────────────────────────────────────

function VistaPrevia({ tipo, trab, campos, empresa, editables, onConfirmar, onVolver, guardando, error, dupAviso }) {
  const esCTCL = tipo === 'CT' || tipo === 'CL'
  const titulo = TITULOS[tipo] ?? tipo
  const panelRef = useRef(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  function handleKeyDown(e) {
    if (e.key === 'Escape' && !guardando) onVolver()
  }

  const dir      = empresa?.direccion?.startsWith('[')    ? null : empresa?.direccion
  const rep      = empresa?.representante?.startsWith('[') ? null : empresa?.representante
  const cargoRep = empresa?.cargo_rep?.startsWith('[')    ? null : empresa?.cargo_rep
  const logoUrl  = getLogoUrl(empresa)

  const area         = campos.area         ?? null
  const tipoContrato = campos.tipo_contrato ?? null
  const motivoLabel  = (MOTIVOS_CESE.find(m => m.value === campos.motivo_cese)?.label) ?? campos.motivo_cese ?? '—'

  const filasTabla = esCTCL ? [
    ['Trabajador',                    trab.nombre],
    ['Documento (DNI)',               trab.dni],
    [tipo === 'CT' ? 'Cargo desempeñado' : 'Cargo actual', trab.cargo],
    ...(area         ? [['Área / unidad',      area]]         : []),
    ['Fecha de ingreso',              fmtCorto(trab.fecha_ingreso)],
    ...(tipo === 'CT' ? [
      ['Fecha de cese',               fmtCorto(campos.fecha_cese)],
      ['Motivo de cese',              motivoLabel],
    ] : []),
    ...(tipoContrato ? [['Tipo de contrato',   tipoContrato]]  : []),
    ...(tipo === 'CL' ? [['Situación del vínculo', 'Activo']]  : []),
  ] : []

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(13,31,53,.72)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '20px 16px', overflowY: 'auto',
    }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa: ${titulo}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={{
        width: '100%', maxWidth: 760, background: '#fff',
        borderRadius: 12, boxShadow: '0 32px 80px rgba(0,0,0,.45)',
        display: 'flex', flexDirection: 'column', marginBottom: 24,
      }}>

        {/* ── Modal header ── */}
        <div style={{
          padding: '14px 20px', borderRadius: '12px 12px 0 0',
          background: 'var(--navy)', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#7BA8C4', marginBottom: 3 }}>
              Vista previa
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
              {tipo} · {empresa?.razon_social}
            </div>
          </div>
          <button type="button" onClick={onVolver} style={{
            background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)',
            color: '#fff', borderRadius: 6, padding: '5px 12px',
            cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
          }}>
            ← Volver al formulario
          </button>
        </div>

        {/* ── Review hint ── */}
        <div style={{
          padding: '8px 20px', background: '#EFF6FF',
          borderBottom: '1px solid #BFDBFE', fontSize: 12, color: '#1D4ED8',
        }}>
          Revisa que todos los datos sean correctos antes de emitir. Para corregir algo, vuelve al formulario.
          El texto legal proviene de la plantilla vigente y no se edita aquí.
        </div>

        {/* ── Aviso de posible duplicado ── */}
        {dupAviso && (
          <div role="alert" style={{
            padding: '10px 20px', background: '#FFFBEB',
            borderBottom: '1px solid #FDE68A', fontSize: 12.5, color: '#92400E',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              Ya existe un documento <strong>{tipo}</strong> activo para este DNI en esta empresa:{' '}
              <span className="mono" style={{ fontWeight: 600 }}>{dupAviso.correlativo}</span>
              {' '}emitido el {fmtCorto(dupAviso.fecha_emision)}. Verifica que no estés duplicando antes de confirmar.
            </span>
          </div>
        )}

        {/* ── Document preview ── */}
        <div style={{ padding: '28px 36px', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>

          {/* Empresa header */}
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                style={{ height: 52, width: 'auto', objectFit: 'contain', maxWidth: 220, marginBottom: 10 }}
              />
            )}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1F35', letterSpacing: '.02em' }}>
              {empresa?.razon_social?.toUpperCase()}
            </div>
            <div style={{ fontSize: 11.5, color: '#3A6B8A', marginTop: 3 }}>
              RUC {empresa?.ruc ?? '—'}{dir ? ` • ${dir}` : ''}
            </div>
            <div style={{ borderBottom: '1px solid #E2E8F0', marginTop: 10 }} />
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#0D1F35', margin: '14px 0 6px', letterSpacing: '.04em' }}>
            {titulo}
          </div>
          {tipo === 'CL' && (
            <div style={{ textAlign: 'center', fontSize: 11, color: '#6B7280', fontStyle: 'italic', marginBottom: 10 }}>
              Documento de carácter informativo emitido a solicitud del trabajador
            </div>
          )}

          {/* CT/CL: intro + data table */}
          {esCTCL && (
            <>
              <p style={{ fontSize: 13, lineHeight: 1.75, textAlign: 'justify', marginBottom: 12, color: '#1A2733' }}>
                <strong>{empresa?.razon_social}</strong>
                {` con RUC N.° ${empresa?.ruc ?? '—'}`}
                {dir ? ` y domicilio fiscal en ${dir},` : ','}{' '}
                deja constancia y{' '}
                <strong>{tipo === 'CT' ? 'CERTIFICA' : 'hace CONSTANCIA'}</strong>
                {' '}que la persona cuyos datos se detallan a continuación{' '}
                {tipo === 'CT' ? 'prestó servicios bajo relación laboral' : 'mantiene vínculo laboral vigente con nuestra organización a la fecha de emisión'}:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 13 }}>
                <tbody>
                  {filasTabla.map(([label, valor]) => (
                    <tr key={label}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, fontSize: 12, color: '#374151', background: '#F8FAFC', border: '1px solid #E2E8F0', width: '36%' }}>{label}</td>
                      <td style={{ padding: '6px 10px', border: '1px solid #E2E8F0', color: '#1A2733' }}>{valor || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* AM/SU/CP/CD: compact data row */}
          {!esCTCL && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[['Trabajador', trab.nombre], ['Cargo', trab.cargo], ['Empresa', empresa?.razon_social]].map(([l, v]) => (
                <div key={l} style={{ flex: 1, padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 4, fontSize: 12 }}>
                  <div style={{ color: '#6B7280', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 600, color: '#1A2733' }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Cuerpo del documento (según plantilla vigente, solo lectura) */}
          <div style={{ marginBottom: 14 }}>
            {editables.cuerpo.split('\n\n').filter(Boolean).map((parrafo, i) => (
              <p key={i} style={{
                fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.75,
                textAlign: 'justify', color: '#1A2733', marginBottom: 10,
                whiteSpace: 'pre-wrap',
              }}>
                {parrafo}
              </p>
            ))}
          </div>

          {/* Lugar y fecha */}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#1A2733', marginBottom: 14 }}>
            {editables.lugarFecha}
          </p>

          {/* Observaciones (se ingresan en el formulario) */}
          {editables.observaciones && (
            <p style={{
              fontFamily: 'Georgia, serif', fontSize: 13, lineHeight: 1.75,
              textAlign: 'justify', color: '#1A2733', marginBottom: 24,
              whiteSpace: 'pre-wrap',
            }}>
              {editables.observaciones}
            </p>
          )}

          {/* Firma placeholder */}
          <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 36 }}>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>___________________________________</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 5 }}>{empresa?.razon_social}</div>
            {rep && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{rep}</div>}
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{cargoRep ?? 'Representante Legal'}</div>
          </div>

          {/* Control interno al final */}
          <div style={{
            background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6,
            padding: '9px 14px', marginTop: 24, fontSize: 12, color: '#1E40AF',
          }}>
            <strong style={{ display: 'block', marginBottom: 3 }}>CONTROL INTERNO</strong>
            N.° de documento: <em>Se asignará al confirmar</em>
            <div style={{ marginTop: 4, fontSize: 11, color: '#3B82F6' }}>
              Código de verificación y QR se generarán al confirmar la emisión.
            </div>
          </div>
        </div>

        {/* ── Modal footer ── */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--gray-200)',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: '#F9FAFB', borderRadius: '0 0 12px 12px',
        }}>
          {error && (
            <div className="alert alert-error" style={{ margin: 0 }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onVolver} style={{
              padding: '8px 16px', borderRadius: 6, border: '1px solid var(--gray-300)',
              background: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            }}>
              ← Volver al formulario
            </button>
            <button type="button" onClick={onConfirmar} disabled={guardando} style={{
              padding: '8px 20px', borderRadius: 6, background: 'var(--navy)', color: '#fff',
              border: 'none', cursor: guardando ? 'not-allowed' : 'pointer',
              fontSize: 13, fontFamily: 'inherit', fontWeight: 600,
              opacity: guardando ? .7 : 1, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {guardando
                ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff', width: 14, height: 14 }} /> Emitiendo…</>
                : <><Download size={14} /> Confirmar y emitir</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────
const TRAB_VACIO = { dni: '', nombre: '', cargo: '', fecha_ingreso: '' }

export default function Emitir() {
  const { toast, showToast } = useToast()

  const { empresas } = useEmpresas({ soloActivas: true })
  const [empresaId, setEmpresaId] = useState('')
  const [tipo,      setTipo]      = useState('')
  const [trab,      setTrab]      = useState(TRAB_VACIO)
  const [campos,    setCampos]    = useState({})
  const [emitiendo,   setEmitiendo]   = useState(false)
  const [resultado,   setResultado]   = useState(null)
  const [qrDataUrl,   setQrDataUrl]   = useState('')
  const [error,       setError]       = useState('')
  const [vistaPrevia, setVistaPrevia] = useState(false)
  const [editables,   setEditables]   = useState({ cuerpo: '', lugarFecha: '', observaciones: '' })
  const [dupAviso,    setDupAviso]    = useState(null)

  useDocumentTitle('Emitir documento')

  function setT(k, v) { setTrab(prev => ({ ...prev, [k]: v })) }

  // Si el trabajador ya está en el registro maestro, autocompletar
  // los campos vacíos: mismo nombre en todos sus documentos.
  async function autocompletarPorDni() {
    if (!dniValido || !empresaId) return
    const { data } = await supabase
      .from('trabajadores')
      .select('nombre, cargo, fecha_ingreso')
      .eq('dni', trab.dni)
      .eq('empresa_id', empresaId)
      .maybeSingle()
    if (!data) return
    let usado = false
    setTrab(prev => {
      usado = !prev.nombre || !prev.cargo || !prev.fecha_ingreso
      return {
        ...prev,
        nombre:        prev.nombre        || data.nombre        || '',
        cargo:         prev.cargo         || data.cargo         || '',
        fecha_ingreso: prev.fecha_ingreso || data.fecha_ingreso || '',
      }
    })
    if (usado) showToast('Datos del trabajador autocompletados desde el registro.')
  }

  async function abrirVistaPrevia(e) {
    e.preventDefault()
    const docPreview = {
      tipo,
      nombre_trabajador: trab.nombre,
      dni_trabajador:    trab.dni,
      cargo:             trab.cargo,
      fecha_ingreso:     trab.fecha_ingreso,
      fecha_emision:     hoy(),
      ...campos,
    }

    // Texto legal desde la plantilla vigente (módulo Plantillas);
    // si la consulta falla, se usa el texto base del código.
    let cuerpo
    try {
      const { data: plantilla } = await supabase
        .from('plantillas_documento')
        .select('cuerpo')
        .eq('tipo', tipo)
        .maybeSingle()
      cuerpo = plantilla?.cuerpo
        ? renderPlantilla(plantilla.cuerpo, docPreview, empresaSeleccionada)
        : getCuerpoDefault(tipo, docPreview, empresaSeleccionada)
    } catch {
      cuerpo = getCuerpoDefault(tipo, docPreview, empresaSeleccionada)
    }

    // El texto queda congelado aquí: se guarda con el documento al
    // emitir, así los cambios de plantilla no afectan lo ya emitido.
    setEditables({
      cuerpo,
      lugarFecha:    getLugarFechaDefault(hoy()),
      observaciones: campos.observaciones?.trim() ?? '',
    })
    setError('')
    setDupAviso(null)
    setVistaPrevia(true)

    // Aviso de posible duplicado (best-effort, no bloquea la vista previa)
    try {
      const { data } = await supabase
        .from('documentos')
        .select('correlativo, fecha_emision')
        .eq('empresa_id', empresaId)
        .eq('tipo', tipo)
        .eq('dni_trabajador', trab.dni)
        .eq('estado', 'activo')
        .order('fecha_emision', { ascending: false })
        .limit(1)
      if (data?.[0]) setDupAviso(data[0])
    } catch { /* sin aviso si la consulta falla */ }
  }

  async function handleConfirmar() {
    setError('')
    setEmitiendo(true)
    try {
      const fechaLimite = (tipo === 'CP' && campos.fecha_falta)
        ? addDiasHabiles(campos.fecha_falta, 6) : null

      // Se guardan también los textos editados en la vista previa para
      // que la re-descarga desde Historial reproduzca el documento original.
      const camposExtra = {
        ...(campos.area          ? { area:          campos.area }          : {}),
        ...(campos.tipo_contrato ? { tipo_contrato: campos.tipo_contrato } : {}),
        ...(editables.observaciones?.trim() ? { observaciones: editables.observaciones.trim() } : {}),
        ...(editables.cuerpo?.trim()        ? { cuerpo:        editables.cuerpo.trim() }        : {}),
        ...(editables.lugarFecha?.trim()    ? { lugar_fecha:   editables.lugarFecha.trim() }    : {}),
      }

      // RPC transaccional: genera el correlativo e inserta el documento
      // en una sola operación (sin huecos de numeración si algo falla).
      const { data, error: rpcErr } = await supabase.rpc('emitir_documento', {
        p_empresa_id:              empresaId,
        p_tipo:                    tipo,
        p_dni_trabajador:          trab.dni,
        p_nombre_trabajador:       trab.nombre,
        p_cargo:                   trab.cargo,
        p_fecha_ingreso:           trab.fecha_ingreso || null,
        p_fecha_cese:              campos.fecha_cese              ?? null,
        p_motivo_cese:             campos.motivo_cese             ?? null,
        p_fecha_falta:             campos.fecha_falta             ?? null,
        p_descripcion_falta:       campos.descripcion_falta       ?? null,
        p_dias_suspension:         campos.dias_suspension ? parseInt(campos.dias_suspension) : null,
        p_fecha_inicio_suspension: campos.fecha_inicio_suspension ?? null,
        p_fecha_limite_descargos:  fechaLimite,
        p_campos_extra:            Object.keys(camposExtra).length ? camposExtra : null,
      })

      if (rpcErr) throw new Error(`Error al emitir: ${rpcErr.message}`)
      const docData = Array.isArray(data) ? data[0] : data
      if (!docData?.id) throw new Error('La emisión no devolvió el documento creado.')

      const verifyUrl = getVerifyUrl(docData.id)
      const qr = await QRCode.toDataURL(verifyUrl, { width: 160, margin: 1 })
      setQrDataUrl(qr)

      // Payload del Word: se guarda en el resultado para poder
      // re-descargarlo desde el banner de éxito.
      const regen = {
        doc: {
          ...docData,
          tipo,
          nombre_trabajador: trab.nombre,
          cargo:             trab.cargo,
          fecha_ingreso:     trab.fecha_ingreso || null,
          fecha_emision:     hoy(),
          dni_trabajador:    trab.dni,
          ...campos,
          fecha_limite_descargos: fechaLimite,
        },
        empresa: empresaSeleccionada,
        extras: {
          cuerpoOverride:     editables.cuerpo      || undefined,
          lugarFechaOverride: editables.lugarFecha  || undefined,
          observaciones:      editables.observaciones?.trim() || undefined,
        },
      }

      try {
        await generarDocx(regen.doc, regen.empresa, regen.extras)
      } catch (docxErr) {
        console.warn('No se pudo generar el Word:', docxErr)
        showToast('Documento registrado. Si el Word no se descargó, descárgalo desde Historial.', true)
      }

      // Registro maestro de trabajadores: mantiene consistente el
      // nombre/cargo entre documentos y alimenta el autocompletado.
      await supabase
        .from('trabajadores')
        .upsert({
          dni:           trab.dni,
          empresa_id:    empresaId,
          nombre:        trab.nombre,
          cargo:         trab.cargo,
          fecha_ingreso: trab.fecha_ingreso || null,
          estado:        (tipo === 'CT' || tipo === 'CD') ? 'cesado' : 'activo',
        }, { onConflict: 'dni,empresa_id' })

      setResultado({ ...docData, verifyUrl, regen })
      setVistaPrevia(false)
      setTrab(TRAB_VACIO)
      setCampos({})
      setTipo('')
      setEmpresaId('')
      setEditables({ cuerpo: '', lugarFecha: '', observaciones: '' })

    } catch (err) {
      const msg = err.message ?? 'Error al emitir el documento.'
      setError(msg)
      showToast(msg, true)
    } finally {
      setEmitiendo(false)
    }
  }

  const empresaSeleccionada = empresas.find(e => e.id === empresaId)
  const logoEmpresa         = empresaSeleccionada ? getLogoUrl(empresaSeleccionada) : null
  const listo = empresaId && tipo
  const dniValido = /^\d{8}$/.test(trab.dni)
  const erroresFechas = listo ? validarFechasEmision(tipo, trab, campos) : []
  const etapa = resultado && !vistaPrevia ? 3 : vistaPrevia ? 2 : 1

  async function copiarEnlace() {
    try {
      await navigator.clipboard.writeText(resultado.verifyUrl)
      showToast('Enlace de verificación copiado.')
    } catch {
      showToast('No se pudo copiar. Copia el enlace manualmente.', true)
    }
  }

  async function volverADescargar() {
    try {
      await generarDocx(resultado.regen.doc, resultado.regen.empresa, resultado.regen.extras)
    } catch {
      showToast('No se pudo generar el Word. Descárgalo desde Historial.', true)
    }
  }

  return (
    <div>
      <Toast toast={toast} />

      <PageHeader
        title="Emitir documento"
        subtitle="Genera un documento laboral oficial con correlativo y código QR verificable."
      />

      <Stepper etapa={etapa} />

      {/* Banner de éxito */}
      {resultado && (
        <div style={{
          background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12,
          padding: '1.25rem', marginBottom: '1.5rem',
          display: 'flex', gap: '1rem', alignItems: 'flex-start',
        }}>
          <CheckCircle size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: '#15803d', margin: '0 0 4px' }}>
              Documento emitido correctamente
            </p>
            <p style={{ fontSize: 13, color: '#166534', margin: 0 }}>
              Correlativo: <span className="mono" style={{ fontWeight: 600 }}>{resultado.correlativo}</span>
              {' · '}
              <a href={resultado.verifyUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>
                Ver verificador →
              </a>
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: '.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-sm" onClick={copiarEnlace}>
                <Copy size={12} /> Copiar enlace de verificación
              </button>
              {resultado.regen && (
                <button type="button" className="btn btn-sm" onClick={volverADescargar}>
                  <Download size={12} /> Volver a descargar el Word
                </button>
              )}
            </div>
            {qrDataUrl && (
              <img src={qrDataUrl} alt={`Código QR de verificación del documento ${resultado.correlativo}`} style={{ width: 80, height: 80, marginTop: '.75rem', borderRadius: 4, border: '1px solid #bbf7d0' }} />
            )}
          </div>
          <button
            onClick={() => setResultado(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#16a34a', lineHeight: 1, padding: 0 }}
          >×</button>
        </div>
      )}

      {vistaPrevia && (
        <VistaPrevia
          tipo={tipo}
          trab={trab}
          campos={campos}
          empresa={empresaSeleccionada}
          editables={editables}
          onConfirmar={handleConfirmar}
          onVolver={() => { setVistaPrevia(false); setError('') }}
          guardando={emitiendo}
          error={error}
          dupAviso={dupAviso}
        />
      )}

      <form onSubmit={abrirVistaPrevia}>
        <div className="emitir-grid">

          {/* ── Columna izquierda: empresa + tipo ── */}
          <div className="card">
            <p className="emitir-step-title">1 · Empresa y tipo de documento</p>

            <div className="field">
              <label className="label">Empresa</label>
              <select
                className="input"
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
                required
              >
                <option value="">Seleccionar empresa…</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.razon_social}</option>
                ))}
              </select>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label className="label">Tipo de documento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                {Object.entries(TIPOS_DOCUMENTO).map(([key, { label }]) => (
                  <button
                    key={key} type="button"
                    onClick={() => { setTipo(key); setCampos({}) }}
                    style={{
                      textAlign: 'left', padding: '.6rem .75rem', borderRadius: 8,
                      border: tipo === key ? '2px solid var(--navy)' : '1px solid var(--gray-200)',
                      background: tipo === key ? 'rgba(13,31,53,.05)' : '#fff',
                      cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, color: tipo === key ? 'var(--navy)' : 'var(--gray-700)' }}>
                      {key}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2, lineHeight: 1.3 }}>
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Columna derecha: datos trabajador + campos del tipo ── */}
          {listo ? (
            <div className="card">
              <p className="emitir-step-title">
                2 · Datos del trabajador y documento
                <span className="emitir-step-badge">
                  {tipo} · {TIPOS_DOCUMENTO[tipo]?.label}
                </span>
              </p>

              {/* Badge empresa */}
              {empresaSeleccionada && (
                <div style={{
                  padding: '.5rem .75rem', background: 'var(--gray-50)',
                  borderRadius: 8, marginBottom: '1rem', fontSize: 12,
                  color: 'var(--gray-600)', border: '1px solid var(--gray-100)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {logoEmpresa && (
                    <img
                      src={logoEmpresa}
                      alt=""
                      style={{ height: 28, width: 'auto', objectFit: 'contain', maxWidth: 120, flexShrink: 0 }}
                    />
                  )}
                  <strong style={{ color: 'var(--navy)' }}>{empresaSeleccionada.razon_social}</strong>
                  <span>RUC {empresaSeleccionada.ruc}</span>
                </div>
              )}

              {/* Datos libres del trabajador */}
              <div className="emitir-fields-grid">
                <div className="field">
                  <label className="label">DNI</label>
                  <input
                    className="input" value={trab.dni}
                    onChange={e => setT('dni', e.target.value.replace(/\D/g, ''))}
                    onBlur={autocompletarPorDni}
                    placeholder="12345678"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    style={trab.dni && !dniValido ? { borderColor: 'var(--red)', outline: 'none', boxShadow: '0 0 0 3px rgba(220,38,38,.12)' } : undefined}
                  />
                  {trab.dni && !dniValido && (
                    <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 4, display: 'block' }}>
                      El DNI debe tener exactamente 8 dígitos numéricos.
                    </span>
                  )}
                </div>
                <div className="field">
                  <label className="label">Fecha de ingreso</label>
                  <input
                    type="date" className="input"
                    value={trab.fecha_ingreso}
                    onChange={e => setT('fecha_ingreso', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label className="label">Nombre completo</label>
                <input
                  className="input" value={trab.nombre}
                  onChange={e => setT('nombre', e.target.value)}
                  placeholder="Apellidos y nombres"
                  required
                />
              </div>

              <div className="field">
                <label className="label">Cargo</label>
                <input
                  className="input" value={trab.cargo}
                  onChange={e => setT('cargo', e.target.value)}
                  placeholder="Cargo desempeñado"
                  required
                />
              </div>

              {/* Separador */}
              <div style={{ borderTop: '1px solid var(--gray-100)', margin: '0 0 1rem' }} />

              {/* Campos específicos del tipo */}
              <CamposEspecificos tipo={tipo} valores={campos} onChange={setCampos} />

              {/* Observaciones (aparecen antes de la firma en el documento) */}
              <div className="field">
                <label className="label" htmlFor="emitir-observaciones">
                  Observaciones adicionales
                  <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 6 }}>· opcional · aparecen antes de la firma</span>
                </label>
                <textarea
                  id="emitir-observaciones"
                  className="input"
                  value={campos.observaciones ?? ''}
                  onChange={e => setCampos({ ...campos, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Dejar en blanco si no aplica…"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>
              )}

              {erroresFechas.length > 0 && (
                <div className="alert alert-error" role="alert" style={{ marginBottom: '1rem' }}>
                  {erroresFechas.map(msg => <div key={msg}>{msg}</div>)}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={!dniValido || erroresFechas.length > 0}
                style={{ width: '100%', justifyContent: 'center', gap: 8 }}
              >
                <Eye size={16} /> Vista previa y editar
              </button>

              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: '.75rem', textAlign: 'center' }}>
                Se genera el correlativo, se guarda en el sistema y se descarga el Word con QR.
              </p>
            </div>
          ) : (
            <div className="emitir-placeholder">
              <p className="emitir-placeholder-title">Paso 2 · Datos del trabajador</p>
              <p className="emitir-placeholder-text">
                Selecciona una empresa y un tipo de documento para completar los datos del trabajador y emitir.
              </p>
            </div>
          )}

        </div>
      </form>
    </div>
  )
}
