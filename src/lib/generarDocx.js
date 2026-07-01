import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  AlignmentType, BorderStyle,
  Table, TableRow, TableCell, WidthType,
  ShadingType, VerticalAlign,
} from 'docx'
import QRCode from 'qrcode'
import { MOTIVOS_CESE, TITULOS } from './documentos'
import { getLogoArrayBuffer } from './logosEmpresa'
import { fmtCorto, getVerifyUrl, addDiasHabiles, decodePngDataUrl, logoTransformFromBuffer } from './utils'

const NAVY  = '0D1F35'
const BLUE  = '3A6B8A'
const GRAY  = '6B7280'

// ── Date helpers ────────────────────────────────────────────
const MESES_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

function parseFecha(fecha) {
  if (!fecha) return null
  const raw = String(fecha).split('T')[0]
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

function fmt(fecha) {
  const p = parseFecha(fecha)
  if (!p) return '—'
  return `${p.d} de ${MESES_ES[p.m - 1]} de ${p.y}`
}

function fmtLugarFecha(fecha) {
  const p = parseFecha(fecha)
  if (!p) return 'Huancayo, _____ de ____________ de _____.'
  return `Huancayo, ${p.d} de ${MESES_ES[p.m - 1]} de ${p.y}.`
}

export function calcTiempoServicios(ingreso, cese) {
  const p1 = parseFecha(ingreso)
  const p2 = parseFecha(cese)
  if (!p1 || !p2) return '—'

  let years  = p2.y - p1.y
  let months = p2.m - p1.m
  let days   = p2.d - p1.d

  if (days < 0) {
    months--
    days += new Date(p2.y, p2.m - 1, 0).getDate()
  }
  if (months < 0) {
    years--
    months += 12
  }

  const parts = []
  if (years  > 0) parts.push(`${years} año${years  !== 1 ? 's' : ''}`)
  if (months > 0) parts.push(`${months} mes${months !== 1 ? 'es' : ''}`)
  if (days   > 0) parts.push(`${days} día${days     !== 1 ? 's' : ''}`)

  if (!parts.length) return 'menos de un día'
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}

// ── Text / paragraph helpers ────────────────────────────────
function tr(text, opts = {}) {
  return new TextRun({ text: String(text ?? ''), font: 'Calibri', size: 22, ...opts })
}
function tbold(text, opts = {}) { return tr(text, { bold: true, ...opts }) }

function pr(children, alignment = AlignmentType.JUSTIFIED, spacing = { after: 180, line: 360 }) {
  const kids = Array.isArray(children) ? children : [tr(children)]
  return new Paragraph({ children: kids, alignment, spacing })
}

function hrLine(color = 'E2E8F0') {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color } },
    spacing: { before: 160, after: 160 },
  })
}

function noBorder() {
  const n = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  return { top: n, bottom: n, left: n, right: n }
}

function thinBorder() {
  const b = { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' }
  return { top: b, bottom: b, left: b, right: b }
}

function labelVal(label, valor) {
  return new Paragraph({
    children: [tbold(`${label}: `, { size: 20 }), tr(String(valor ?? '—'), { size: 20 })],
    spacing: { after: 80 },
  })
}

// ── QR ─────────────────────────────────────────────────────
async function getQRArrayBuffer(url) {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 200, margin: 1,
    color: { dark: '#0D1F35', light: '#FFFFFF' },
  })
  return decodePngDataUrl(dataUrl)
}

// ── Empresa field validators ────────────────────────────────
function getDir(empresa) {
  const d = empresa?.direccion
  return (d && !d.startsWith('[')) ? d : null
}
function getRep(empresa) {
  const r = empresa?.representante
  return (r && !r.startsWith('[')) ? r : null
}
function getCargoRep(empresa) {
  const c = empresa?.cargo_rep
  return (c && !c.startsWith('[')) ? c : null
}

// ── Shared building blocks ──────────────────────────────────

function buildHeaderEmpresa(empresa, logoBuf = null) {
  const nombre  = empresa?.razon_social?.toUpperCase() ?? ''
  const ruc     = empresa?.ruc ?? '—'
  const dir     = getDir(empresa)
  const infoLine = ['RUC ' + ruc, dir].filter(Boolean).join(' • ')

  const blocks = []

  if (logoBuf) {
    const transform = logoTransformFromBuffer(logoBuf)
    blocks.push(new Paragraph({
      children: [new ImageRun({
        data: logoBuf,
        transformation: transform,
        type: 'png',
      })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
  }

  blocks.push(
    new Paragraph({
      children: [tbold(nombre, { size: 28, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [tr(infoLine, { size: 18, color: BLUE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    hrLine(),
  )

  return blocks
}

function buildControlInterno(doc, qrBuf) {
  const verCode = (doc.id ?? '').slice(0, 8).toUpperCase()

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [
        new TableCell({
          width:  { size: 70, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EFF6FF' },
          margins: { top: 120, bottom: 120, left: 180, right: 120 },
          children: [
            new Paragraph({
              children: [tbold('CONTROL INTERNO', { size: 18, color: NAVY })],
              spacing: { after: 80 },
            }),
            new Paragraph({
              children: [
                tbold('N.° de documento: ', { size: 18 }),
                tr(doc.correlativo ?? '—', { size: 18, color: BLUE, font: 'Courier New' }),
              ],
              spacing: { after: 60 },
            }),
            new Paragraph({
              children: [
                tbold('Código de verificación: ', { size: 18 }),
                tr(verCode, { size: 18, font: 'Courier New', bold: true }),
              ],
              spacing: { after: 60 },
            }),
            new Paragraph({
              children: [tr(
                'Escanee el QR y verifique que los datos coincidan con el documento impreso.',
                { size: 16, color: GRAY, italics: true },
              )],
            }),
          ],
        }),
        // Right: QR image
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({
            children: [new ImageRun({ data: qrBuf, transformation: { width: 90, height: 90 }, type: 'png' })],
            alignment: AlignmentType.CENTER,
          })],
        }),
      ],
    })],
  })
}

function buildTablaData(filas) {
  const validas = filas.filter(([, v]) =>
    v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '—'
  )
  if (!validas.length) return new Paragraph({})

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: validas.map(([label, valor]) => new TableRow({
      children: [
        new TableCell({
          width:   { size: 36, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F8FAFC' },
          margins: { top: 90, bottom: 90, left: 140, right: 80 },
          children: [new Paragraph({
            children: [tbold(label, { size: 20, color: '374151' })],
          })],
        }),
        new TableCell({
          width:   { size: 64, type: WidthType.PERCENTAGE },
          borders: thinBorder(),
          margins: { top: 90, bottom: 90, left: 140, right: 80 },
          children: [new Paragraph({
            children: [tr(String(valor), { size: 20 })],
          })],
        }),
      ],
    })),
  })
}

function buildFirmaBlock(empresa) {
  const rep      = getRep(empresa)
  const cargoRep = getCargoRep(empresa)
  const nombre   = empresa?.razon_social ?? ''

  return [
    new Paragraph({ spacing: { before: 1000 } }),
    new Paragraph({
      children: [tr('___________________________________')],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [tbold(nombre, { size: 20 })],
      spacing: { after: 40 },
    }),
    ...(rep ? [new Paragraph({
      children: [tr(rep, { size: 20 })],
      spacing: { after: 40 },
    })] : []),
    new Paragraph({
      children: [tr(cargoRep ?? 'Representante', { size: 18, color: GRAY })],
      spacing: { after: 40 },
    }),
  ]
}

function buildDocumentFooter(doc, qrBuf, empresa) {
  return [
    ...buildFirmaBlock(empresa),
    new Paragraph({ spacing: { before: 400, after: 200 } }),
    buildControlInterno(doc, qrBuf),
  ]
}

// ── Preview helpers (exported for Emitir.jsx) ───────────────
export function getCuerpoDefault(tipo, doc, empresa) {
  const empNombre = empresa?.razon_social ?? ''
  const nombre    = doc.nombre_trabajador ?? '—'
  const cargo     = doc.cargo ?? '—'
  const motivo    = MOTIVOS_CESE.find(m => m.value === doc.motivo_cese)?.label ?? doc.motivo_cese ?? '—'

  const fechaFinSus = (doc.fecha_inicio_suspension && doc.dias_suspension)
    ? fmt(addDiasHabiles(doc.fecha_inicio_suspension, parseInt(doc.dias_suspension) - 1))
    : '—'
  const fechaLimiteDcgs = doc.fecha_falta
    ? fmt(addDiasHabiles(doc.fecha_falta, 6))
    : '—'

  switch (tipo) {
    case 'CT':
      return 'Se expide el presente certificado a solicitud del interesado y para los fines que estime conveniente, dentro del plazo de ley. El presente documento se limita a constatar hechos laborales y no contiene apreciaciones sobre la conducta o el desempeño del trabajador.'
    case 'CL':
      return 'Se expide la presente constancia a solicitud del interesado, para los trámites administrativos o personales que estime pertinentes, sin que ello implique el término de la relación laboral.'
    case 'AM':
      return `Por medio de la presente, comunicamos al/la Sr./Sra. ${nombre}, quien ocupa el cargo de ${cargo} en ${empNombre}, que:\n\nCon fecha ${fmt(doc.fecha_falta)}, usted ha incurrido en la siguiente falta:\n\n${doc.descripcion_falta ?? '—'}\n\nEn consecuencia, se le aplica la presente AMONESTACIÓN ESCRITA, en cumplimiento al Reglamento Interno de Trabajo y la normativa laboral vigente.\n\nSe le exhorta a no reincidir en dichas conductas. En caso de reincidencia, la empresa se reserva el derecho de aplicar medidas disciplinarias más severas.`
    case 'SU':
      return `Por medio de la presente, comunicamos al/la Sr./Sra. ${nombre}, quien ocupa el cargo de ${cargo} en ${empNombre}, que:\n\nCon fecha ${fmt(doc.fecha_falta)}, usted ha incurrido en la siguiente falta grave:\n\n${doc.descripcion_falta ?? '—'}\n\nEn consecuencia, se le impone una SUSPENSIÓN SIN GOCE DE HABER por ${doc.dias_suspension ?? '—'} día(s) calendario(s), comprendida entre el ${fmt(doc.fecha_inicio_suspension)} y el ${fechaFinSus}.\n\nEsta medida se aplica en cumplimiento al Reglamento Interno de Trabajo y la Ley de Productividad y Competitividad Laboral.`
    case 'CP':
      return `Por medio de la presente, comunicamos al/la Sr./Sra. ${nombre}, quien ocupa el cargo de ${cargo} en ${empNombre}, que:\n\nCon fecha ${fmt(doc.fecha_falta)}, usted habría incurrido en la siguiente falta grave:\n\n${doc.descripcion_falta ?? '—'}\n\nEn virtud de lo dispuesto en el artículo 31° de la Ley de Productividad y Competitividad Laboral, se le otorga un plazo de seis (6) días hábiles contados a partir de la recepción del presente, para que presente sus descargos por escrito.\n\nFecha límite para presentar descargos: ${fechaLimiteDcgs}.\n\nTranscurrido dicho plazo sin presentar descargos, o evaluados los mismos, la empresa tomará la decisión que corresponda conforme a ley.`
    case 'CD':
      return `Por medio de la presente, comunicamos al/la Sr./Sra. ${nombre}, quien ocupa el cargo de ${cargo} en ${empNombre}, que:\n\nCon fecha ${fmt(doc.fecha_falta)}, usted incurrió en la siguiente falta grave:\n\n${doc.descripcion_falta ?? '—'}\n\nHabiendo seguido el procedimiento previsto en el artículo 31° del D.S. 003-97-TR y evaluados los descargos presentados (o vencido el plazo sin recibirlos), la empresa ha decidido DAR POR CONCLUIDO EL VÍNCULO LABORAL con efectividad al ${fmt(doc.fecha_cese)}.\n\nSe le hace entrega de la presente carta según lo exige la normativa laboral vigente.`
    default:
      return ''
  }
}

export function getLugarFechaDefault(fecha) {
  return fmtLugarFecha(fecha)
}

// ── Shared body: cuerpo → fecha → observaciones ─────────────
function buildBodySection({ cuerpoOverride, lugarFechaOverride, observaciones }, defaultParagraphs, fechaEmision) {
  return [
    ...(cuerpoOverride
      ? cuerpoOverride.split('\n\n').filter(Boolean).map(p => pr([tr(p)]))
      : defaultParagraphs),
    new Paragraph({
      children: [tr(lugarFechaOverride || fmtLugarFecha(fechaEmision))],
      spacing: { before: 200, after: 0 },
    }),
    ...(observaciones?.trim() ? [
      new Paragraph({ spacing: { after: 100 } }),
      pr([tr(observaciones.trim())]),
    ] : []),
  ]
}

// ── CT ──────────────────────────────────────────────────────
function buildChildrenCT(doc, empresa, qrBuf, extras = {}, logoBuf = null) {
  const { cuerpoOverride, lugarFechaOverride, observaciones } = extras
  const tiempo = calcTiempoServicios(doc.fecha_ingreso, doc.fecha_cese)
  const ruc    = empresa?.ruc ?? '—'
  const dir    = getDir(empresa)

  const filas = [
    ['Trabajador',          doc.nombre_trabajador],
    ['Documento (DNI)',     doc.dni_trabajador],
    ['Cargo desempeñado',   doc.cargo],
    ['Fecha de ingreso',    fmtCorto(doc.fecha_ingreso)],
    ['Fecha de cese',       fmtCorto(doc.fecha_cese)],
    ['Tiempo de servicios', tiempo],
  ]

  const intro = [
    tbold(empresa?.razon_social ?? ''),
    tr(` con RUC N.° ${ruc}`),
    ...(dir ? [tr(` y domicilio fiscal en ${dir},`)] : [tr(',')]),
    tr(' deja constancia y '),
    tbold('CERTIFICA'),
    tr(' que la persona cuyos datos se detallan a continuación prestó servicios bajo relación laboral en nuestra organización:'),
  ]

  return [
    ...buildHeaderEmpresa(empresa, logoBuf),

    new Paragraph({
      children: [tbold('CERTIFICADO DE TRABAJO', { size: 28, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 240 },
    }),

    pr(intro),
    new Paragraph({ spacing: { after: 120 } }),

    buildTablaData(filas),
    new Paragraph({ spacing: { after: 280 } }),

    ...buildBodySection(extras, [pr([tr(
      'Se expide el presente certificado a solicitud del interesado y para los fines que estime conveniente, ' +
      'dentro del plazo de ley. El presente documento se limita a constatar hechos laborales y no contiene ' +
      'apreciaciones sobre la conducta o el desempeño del trabajador.',
    )])], doc.fecha_emision),
    ...buildDocumentFooter(doc, qrBuf, empresa),
  ]
}

// ── CL ──────────────────────────────────────────────────────
function buildChildrenCL(doc, empresa, qrBuf, extras = {}, logoBuf = null) {
  const { cuerpoOverride, lugarFechaOverride, observaciones } = extras
  const tipoContrato  = doc.tipo_contrato || doc.campos_extra?.tipo_contrato || null
  const ruc           = empresa?.ruc ?? '—'

  const filas = [
    ['Trabajador',          doc.nombre_trabajador],
    ['Documento (DNI)',     doc.dni_trabajador],
    ['Cargo actual',        doc.cargo],
    ['Fecha de ingreso',    fmtCorto(doc.fecha_ingreso)],
    ...(tipoContrato ? [['Tipo de contrato', tipoContrato]] : []),
    ['Situación del vínculo', 'Activo'],
  ]

  const intro = [
    tbold(empresa?.razon_social ?? ''),
    tr(`, con RUC N.° ${ruc},`),
    tr(' deja '),
    tbold('CONSTANCIA'),
    tr(' de que la persona cuyos datos se detallan mantiene vínculo laboral vigente con nuestra organización a la fecha de emisión:'),
  ]

  return [
    ...buildHeaderEmpresa(empresa, logoBuf),

    new Paragraph({
      children: [tbold('CONSTANCIA DE TRABAJO', { size: 28, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 280, after: 80 },
    }),
    new Paragraph({
      children: [tr(
        'Documento de carácter informativo emitido a solicitud del trabajador',
        { size: 18, color: GRAY, italics: true },
      )],
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
    }),

    pr(intro),
    new Paragraph({ spacing: { after: 120 } }),

    buildTablaData(filas),
    new Paragraph({ spacing: { after: 280 } }),

    ...buildBodySection(extras, [pr([tr(
      'Se expide la presente constancia a solicitud del interesado, para los trámites administrativos ' +
      'o personales que estime pertinentes, sin que ello implique el término de la relación laboral.',
    )])], doc.fecha_emision),
    ...buildDocumentFooter(doc, qrBuf, empresa),
  ]
}

// ── AM, SU, CP, CD ──────────────────────────────────────────
function buildCuerpoOtros(tipo, doc, empresa) {
  const empNombre = empresa?.razon_social ?? ''
  const motivoLabel = MOTIVOS_CESE.find(m => m.value === doc.motivo_cese)?.label ?? doc.motivo_cese ?? '—'

  const fechaFinSus = (doc.fecha_inicio_suspension && doc.dias_suspension)
    ? fmt(addDiasHabiles(doc.fecha_inicio_suspension, parseInt(doc.dias_suspension) - 1))
    : '—'

  const fechaLimiteDescargos = doc.fecha_falta
    ? fmt(addDiasHabiles(doc.fecha_falta, 6))
    : '—'

  const faltaIndented = new Paragraph({
    children: [tr(doc.descripcion_falta ?? '—', { italics: true, color: '444444' })],
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720 },
    spacing: { before: 80, after: 160 },
  })

  switch (tipo) {
    case 'AM':
      return [
        pr([tr('Por medio de la presente, comunicamos al/la Sr./Sra. '), tbold(doc.nombre_trabajador), tr(', quien ocupa el cargo de '), tbold(doc.cargo ?? '—'), tr(' en '), tbold(empNombre), tr(', que:')]),
        pr([tr('Con fecha '), tbold(fmt(doc.fecha_falta)), tr(', usted ha incurrido en la siguiente falta:')]),
        faltaIndented,
        pr([tr('En consecuencia, se le aplica la presente '), tbold('AMONESTACIÓN ESCRITA'), tr(', en cumplimiento al Reglamento Interno de Trabajo y la normativa laboral vigente.')]),
        pr([tr('Se le exhorta a no reincidir en dichas conductas. En caso de reincidencia, la empresa se reserva el derecho de aplicar medidas disciplinarias más severas.')]),
      ]

    case 'SU':
      return [
        pr([tr('Por medio de la presente, comunicamos al/la Sr./Sra. '), tbold(doc.nombre_trabajador), tr(', quien ocupa el cargo de '), tbold(doc.cargo ?? '—'), tr(' en '), tbold(empNombre), tr(', que:')]),
        pr([tr('Con fecha '), tbold(fmt(doc.fecha_falta)), tr(', usted ha incurrido en la siguiente falta grave:')]),
        faltaIndented,
        pr([tr('En consecuencia, se le impone una '), tbold('SUSPENSIÓN SIN GOCE DE HABER'), tr(' por '), tbold(`${doc.dias_suspension ?? '—'} día(s) calendario(s)`), tr(', comprendida entre el '), tbold(fmt(doc.fecha_inicio_suspension)), tr(' y el '), tbold(fechaFinSus), tr('.')]),
        pr([tr('Esta medida se aplica en cumplimiento al Reglamento Interno de Trabajo y la Ley de Productividad y Competitividad Laboral.')]),
      ]

    case 'CP':
      return [
        pr([tr('Por medio de la presente, comunicamos al/la Sr./Sra. '), tbold(doc.nombre_trabajador), tr(', quien ocupa el cargo de '), tbold(doc.cargo ?? '—'), tr(' en '), tbold(empNombre), tr(', que:')]),
        pr([tr('Con fecha '), tbold(fmt(doc.fecha_falta)), tr(', usted habría incurrido en la siguiente falta grave:')]),
        faltaIndented,
        pr([tr('En virtud de lo dispuesto en el artículo 31° de la Ley de Productividad y Competitividad Laboral, se le otorga un plazo de '), tbold('seis (6) días hábiles'), tr(' contados a partir de la recepción del presente, para que presente sus descargos por escrito.')]),
        pr([tr('Fecha límite para presentar descargos: '), tbold(fechaLimiteDescargos), tr('.')]),
        pr([tr('Transcurrido dicho plazo sin presentar descargos, o evaluados los mismos, la empresa tomará la decisión que corresponda conforme a ley.')]),
      ]

    case 'CD':
      return [
        pr([tr('Por medio de la presente, comunicamos al/la Sr./Sra. '), tbold(doc.nombre_trabajador), tr(', quien ocupa el cargo de '), tbold(doc.cargo ?? '—'), tr(' en '), tbold(empNombre), tr(', que:')]),
        pr([tr('Con fecha '), tbold(fmt(doc.fecha_falta)), tr(', usted incurrió en la siguiente falta grave:')]),
        faltaIndented,
        pr([tr('Habiendo seguido el procedimiento previsto en el artículo 31° del D.S. 003-97-TR y evaluados los descargos presentados (o vencido el plazo sin recibirlos), la empresa ha decidido '), tbold('DAR POR CONCLUIDO EL VÍNCULO LABORAL'), tr(' con efectividad al '), tbold(fmt(doc.fecha_cese)), tr('.')]),
        pr([tr('Se le hace entrega de la presente carta según lo exige la normativa laboral vigente.')]),
      ]

    default:
      return [pr('Documento generado por VerificaDoc.')]
  }
}

function buildChildrenOtros(doc, empresa, qrBuf, extras = {}, logoBuf = null) {
  const { cuerpoOverride, lugarFechaOverride, observaciones } = extras
  const titulo = TITULOS[doc.tipo] ?? doc.tipo
  const cuerpo = buildCuerpoOtros(doc.tipo, doc, empresa)

  return [
    ...buildHeaderEmpresa(empresa, logoBuf),

    new Paragraph({
      children: [tbold(titulo.toUpperCase(), { size: 28, color: NAVY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE } },
    }),

    new Paragraph({
      children: [
        tbold('Ref.: ', { size: 20 }),
        tr(doc.correlativo, { size: 20, color: BLUE }),
        tr('        '),
        tbold('Fecha: ', { size: 20 }),
        tr(fmt(doc.fecha_emision), { size: 20 }),
      ],
      spacing: { before: 200, after: 320 },
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({
        children: [
          new TableCell({ borders: noBorder(), width: { size: 40, type: WidthType.PERCENTAGE }, children: [labelVal('Trabajador', doc.nombre_trabajador)] }),
          new TableCell({ borders: noBorder(), width: { size: 30, type: WidthType.PERCENTAGE }, children: [labelVal('Cargo', doc.cargo)] }),
          new TableCell({ borders: noBorder(), width: { size: 30, type: WidthType.PERCENTAGE }, children: [labelVal('Empresa', empresa?.razon_social)] }),
        ],
      })],
    }),

    new Paragraph({ spacing: { after: 280 } }),

    ...buildBodySection(extras, cuerpo, doc.fecha_emision),
    ...buildDocumentFooter(doc, qrBuf, empresa),
  ]
}

// ── Main export ─────────────────────────────────────────────
export async function generarDocx(doc, empresa, extras = {}) {
  const verifyUrl = getVerifyUrl(doc.id)
  const qrBuf     = await getQRArrayBuffer(verifyUrl)
  let logoBuf     = null
  try {
    logoBuf = await getLogoArrayBuffer(empresa)
  } catch {
    logoBuf = null
  }

  let children
  if (doc.tipo === 'CT') {
    children = buildChildrenCT(doc, empresa, qrBuf, extras, logoBuf)
  } else if (doc.tipo === 'CL') {
    children = buildChildrenCL(doc, empresa, qrBuf, extras, logoBuf)
  } else {
    children = buildChildrenOtros(doc, empresa, qrBuf, extras, logoBuf)
  }

  const wordDoc = new Document({
    sections: [{
      properties: {
        page: {
          size:   { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1260, bottom: 1440, left: 1800 },
        },
      },
      children,
    }],
  })

  const blob    = await Packer.toBlob(wordDoc)
  const blobUrl = URL.createObjectURL(blob)
  const anchor  = window.document.createElement('a')
  anchor.href     = blobUrl
  anchor.download = `${doc.correlativo}.docx`
  window.document.body.appendChild(anchor)
  anchor.click()
  window.document.body.removeChild(anchor)
  URL.revokeObjectURL(blobUrl)
}
