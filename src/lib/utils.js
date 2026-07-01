// fmt: compact date for tables — "25 jun. 2026"
export function fmt(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

// fmtLong: full date for public display — "25 de junio de 2026"
export function fmtLong(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
}

// hoy: today as YYYY-MM-DD
export function hoy() {
  return new Date().toISOString().split('T')[0]
}

// fmtCorto: ISO date → "DD/MM/YYYY"
export function fmtCorto(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = String(fecha).split('T')[0].split('-')
  if (!y || !m || !d) return '—'
  return `${d}/${m}/${y}`
}

// getVerifyUrl: canonical public verification URL for a document id
export function getVerifyUrl(id) {
  const base = import.meta.env.VITE_APP_URL || window.location.origin
  return `${base}/v/${id}`
}

/** Decodifica data:image/...;base64,... sin fetch (requerido por CSP en producción). */
export function decodePngDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null
  const base64 = dataUrl.split(',')[1]
  if (!base64) return null
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

/** @deprecated use decodePngDataUrl */
export const dataUrlToArrayBuffer = decodePngDataUrl

export async function urlToArrayBuffer(url) {
  if (!url) return null
  if (url.startsWith('data:')) return decodePngDataUrl(url)
  const res = await fetch(url)
  if (!res.ok) return null
  return res.arrayBuffer()
}

export function addDiasHabiles(fechaStr, dias) {
  const d = new Date(fechaStr + 'T12:00:00')
  let added = 0
  while (added < dias) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().split('T')[0]
}

/** Lee ancho/alto de un PNG desde su ArrayBuffer (IHDR). */
export function getPngDimensions(buffer) {
  if (!buffer || buffer.byteLength < 24) return null
  const view = new DataView(buffer)
  if (view.getUint32(0) !== 0x89504e47) return null
  return { width: view.getUint32(16), height: view.getUint32(20) }
}

/** Altura fija en px; ancho proporcional según relación de aspecto del PNG. */
export function logoTransformFromBuffer(buffer, fixedHeight = 56) {
  const dims = getPngDimensions(buffer)
  if (!dims?.width || !dims?.height) {
    return { width: fixedHeight * 2, height: fixedHeight }
  }
  return {
    width: Math.round(fixedHeight * (dims.width / dims.height)),
    height: fixedHeight,
  }
}
