export const TIPOS_DOCUMENTO = {
  CT: {
    label: 'Certificado de Trabajo',
    descripcion: 'Emitido al cese del trabajador',
    campos: ['fecha_cese', 'motivo_cese'],
    sensibles: [],
  },
  CL: {
    label: 'Constancia de Trabajo',
    descripcion: 'Acredita vínculo laboral activo',
    campos: [],
    sensibles: [],
  },
  AM: {
    label: 'Amonestación Escrita',
    descripcion: 'Sanción disciplinaria escrita',
    campos: ['fecha_falta', 'descripcion_falta'],
    sensibles: ['descripcion_falta'],
  },
  SU: {
    label: 'Suspensión sin Goce de Haber',
    descripcion: 'Suspensión disciplinaria',
    campos: ['fecha_falta', 'descripcion_falta', 'dias_suspension', 'fecha_inicio_suspension'],
    sensibles: ['descripcion_falta'],
  },
  CP: {
    label: 'Carta de Preaviso de Despido',
    descripcion: '6 días hábiles para presentar descargos',
    campos: ['fecha_falta', 'descripcion_falta'],
    sensibles: ['descripcion_falta'],
  },
  CD: {
    label: 'Carta de Despido',
    descripcion: 'Extinción del vínculo laboral por causa justificada',
    campos: ['fecha_falta', 'descripcion_falta', 'fecha_cese'],
    sensibles: ['descripcion_falta'],
  },
}

export const MOTIVOS_CESE = [
  { value: 'renuncia_voluntaria',   label: 'Renuncia voluntaria' },
  { value: 'mutuo_acuerdo',         label: 'Mutuo acuerdo' },
  { value: 'vencimiento_contrato',  label: 'Vencimiento de contrato' },
  { value: 'despido_justificado',   label: 'Despido justificado' },
  { value: 'liquidacion_empresa',   label: 'Liquidación de empresa' },
  { value: 'otro',                  label: 'Otro' },
]

export const TITULOS = {
  CT: 'CERTIFICADO DE TRABAJO',
  CL: 'CONSTANCIA DE TRABAJO',
  AM: 'CARTA DE AMONESTACIÓN ESCRITA',
  SU: 'CARTA DE SUSPENSIÓN SIN GOCE DE HABER',
  CP: 'CARTA DE PREAVISO DE DESPIDO',
  CD: 'CARTA DE DESPIDO',
}

export const ROL_LABEL = {
  capital_humano: 'Capital Humano',
  gerencia:       'Gerencia',
  sig:            'SIG',
}

export const ROLES = [
  { value: 'capital_humano', label: 'Capital Humano' },
  { value: 'gerencia',       label: 'Gerencia' },
  { value: 'sig',            label: 'SIG' },
]

// Referencia local de empresas (datos de cabecera en docx)
export const EMPRESAS_REF = {
  'INACONS S.R.L.': { prefijo: 'INS', ruc: '20568587767' },
  'VELIMAQ':         { prefijo: 'VLM', ruc: '20605665269' },
  'INDAGO':          { prefijo: 'IND', ruc: '20604890862' },
  'GELTECH':         { prefijo: 'GLT', ruc: '20605665251' },
  'INACONS S.A.C.':  { prefijo: 'INC', ruc: '20607713368' },
  'NUFAGO':          { prefijo: 'NFG', ruc: '20606360453' },
  'MAQNOVA S.A.C.':  { prefijo: 'MQN', ruc: '20614841142' },
  'EXPERTOP SAC':    { prefijo: 'EXP', ruc: '20614818469' },
}
