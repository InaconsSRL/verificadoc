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

export function addDiasHabiles(fechaStr, dias) {
  const d = new Date(fechaStr + 'T12:00:00')
  let added = 0
  while (added < dias) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) added++
  }
  return d.toISOString().split('T')[0]
}
