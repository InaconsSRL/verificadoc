import { MOTIVOS_CESE } from './documentos'
import { addDiasHabiles } from './utils'

// ── Formato de fechas en texto legal ("15 de junio de 2026") ──
const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function fmtLarga(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = String(fecha).split('T')[0].split('-').map(Number)
  if (!y || !m || !d) return '—'
  return `${d} de ${MESES_ES[m - 1]} de ${y}`
}

// ── Placeholders disponibles en las plantillas ───────────────
// El editor de plantillas los muestra como chips; el render los
// sustituye por los datos del documento al emitir.
export const PLACEHOLDERS = [
  { token: 'trabajador',              descripcion: 'Nombre completo del trabajador' },
  { token: 'dni',                     descripcion: 'DNI del trabajador' },
  { token: 'cargo',                   descripcion: 'Cargo del trabajador' },
  { token: 'empresa',                 descripcion: 'Razón social de la empresa' },
  { token: 'ruc',                     descripcion: 'RUC de la empresa' },
  { token: 'fecha_ingreso',           descripcion: 'Fecha de ingreso' },
  { token: 'fecha_cese',              descripcion: 'Fecha de cese (CT y CD)' },
  { token: 'motivo_cese',             descripcion: 'Motivo del cese (CT)' },
  { token: 'fecha_falta',             descripcion: 'Fecha de la falta (AM, SU, CP, CD)' },
  { token: 'descripcion_falta',       descripcion: 'Descripción de la falta' },
  { token: 'dias_suspension',         descripcion: 'Días de suspensión (SU)' },
  { token: 'fecha_inicio_suspension', descripcion: 'Inicio de la suspensión (SU)' },
  { token: 'fecha_fin_suspension',    descripcion: 'Fin de la suspensión, calculado (SU)' },
  { token: 'fecha_limite_descargos',  descripcion: 'Límite para descargos, calculado (CP)' },
]

// Contexto de sustitución a partir del documento y la empresa
export function contextoDocumento(doc = {}, empresa = {}) {
  const finSuspension = (doc.fecha_inicio_suspension && doc.dias_suspension)
    ? fmtLarga(addDiasHabiles(doc.fecha_inicio_suspension, parseInt(doc.dias_suspension) - 1))
    : '—'

  return {
    trabajador:              doc.nombre_trabajador ?? '—',
    dni:                     doc.dni_trabajador ?? '—',
    cargo:                   doc.cargo ?? '—',
    empresa:                 empresa?.razon_social ?? '—',
    ruc:                     empresa?.ruc ?? '—',
    fecha_ingreso:           fmtLarga(doc.fecha_ingreso),
    fecha_cese:              fmtLarga(doc.fecha_cese),
    motivo_cese:             MOTIVOS_CESE.find(m => m.value === doc.motivo_cese)?.label ?? doc.motivo_cese ?? '—',
    fecha_falta:             fmtLarga(doc.fecha_falta),
    descripcion_falta:       doc.descripcion_falta ?? '—',
    dias_suspension:         doc.dias_suspension ?? '—',
    fecha_inicio_suspension: fmtLarga(doc.fecha_inicio_suspension),
    fecha_fin_suspension:    finSuspension,
    fecha_limite_descargos:  doc.fecha_falta ? fmtLarga(addDiasHabiles(doc.fecha_falta, 6)) : '—',
  }
}

// Sustituye {{token}} por su valor; los tokens desconocidos se
// dejan tal cual para que el error sea visible y corregible.
export function renderPlantilla(texto, doc, empresa) {
  if (!texto) return ''
  const ctx = contextoDocumento(doc, empresa)
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, token) =>
    token in ctx ? String(ctx[token]) : match
  )
}

// ── Textos base (los mismos que estaban en el código) ────────
// Sirven de semilla en la migración 009, de fallback si la tabla
// no responde y para el botón "Restaurar texto original".
export const PLANTILLAS_BASE = {
  CT: 'Se expide el presente certificado a solicitud del interesado y para los fines que estime conveniente, dentro del plazo de ley. El presente documento se limita a constatar hechos laborales y no contiene apreciaciones sobre la conducta o el desempeño del trabajador.',

  CL: 'Se expide la presente constancia a solicitud del interesado, para los trámites administrativos o personales que estime pertinentes, sin que ello implique el término de la relación laboral.',

  AM: `Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:

Con fecha {{fecha_falta}}, usted ha incurrido en la siguiente falta:

{{descripcion_falta}}

En consecuencia, se le aplica la presente AMONESTACIÓN ESCRITA, en cumplimiento al Reglamento Interno de Trabajo y la normativa laboral vigente.

Se le exhorta a no reincidir en dichas conductas. En caso de reincidencia, la empresa se reserva el derecho de aplicar medidas disciplinarias más severas.`,

  SU: `Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:

Con fecha {{fecha_falta}}, usted ha incurrido en la siguiente falta grave:

{{descripcion_falta}}

En consecuencia, se le impone una SUSPENSIÓN SIN GOCE DE HABER por {{dias_suspension}} día(s) calendario(s), comprendida entre el {{fecha_inicio_suspension}} y el {{fecha_fin_suspension}}.

Esta medida se aplica en cumplimiento al Reglamento Interno de Trabajo y la Ley de Productividad y Competitividad Laboral.`,

  CP: `Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:

Con fecha {{fecha_falta}}, usted habría incurrido en la siguiente falta grave:

{{descripcion_falta}}

En virtud de lo dispuesto en el artículo 31° de la Ley de Productividad y Competitividad Laboral, se le otorga un plazo de seis (6) días hábiles contados a partir de la recepción del presente, para que presente sus descargos por escrito.

Fecha límite para presentar descargos: {{fecha_limite_descargos}}.

Transcurrido dicho plazo sin presentar descargos, o evaluados los mismos, la empresa tomará la decisión que corresponda conforme a ley.`,

  CD: `Por medio de la presente, comunicamos al/la Sr./Sra. {{trabajador}}, quien ocupa el cargo de {{cargo}} en {{empresa}}, que:

Con fecha {{fecha_falta}}, usted incurrió en la siguiente falta grave:

{{descripcion_falta}}

Habiendo seguido el procedimiento previsto en el artículo 31° del D.S. 003-97-TR y evaluados los descargos presentados (o vencido el plazo sin recibirlos), la empresa ha decidido DAR POR CONCLUIDO EL VÍNCULO LABORAL con efectividad al {{fecha_cese}}.

Se le hace entrega de la presente carta según lo exige la normativa laboral vigente.`,
}

// Documento de ejemplo para la vista previa del editor de plantillas
export const DOC_EJEMPLO = {
  nombre_trabajador:       'PÉREZ QUISPE, JUAN CARLOS',
  dni_trabajador:          '12345678',
  cargo:                   'Operario de Almacén',
  fecha_ingreso:           '2023-03-01',
  fecha_cese:              '2026-06-30',
  motivo_cese:             'renuncia_voluntaria',
  fecha_falta:             '2026-06-10',
  descripcion_falta:       'Inasistencia injustificada durante tres días consecutivos.',
  dias_suspension:         3,
  fecha_inicio_suspension: '2026-06-15',
}

export const EMPRESA_EJEMPLO = {
  razon_social: 'INACONS S.R.L.',
  ruc:          '20568587767',
}
