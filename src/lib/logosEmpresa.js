/** Logos estáticos en public/logos-empresa — rutas fijas, sin data: inline */
const POR_RUC = {
  '20568587767': '/logos-empresa/logo_inacons.png', // INACONS S.R.L.
  '20607713368': '/logos-empresa/logo_inacons.png', // INACONS S.A.C.
  '20605665269': '/logos-empresa/logo_velimaq.png',
  '20605665251': '/logos-empresa/logo_geltech.png',
  '20606360453': '/logos-empresa/logo_nufago.png',
}

const bufferCache = new Map()

export function getLogoUrl(empresa) {
  if (!empresa?.ruc) return null
  return POR_RUC[empresa.ruc] ?? null
}

export async function getLogoArrayBuffer(empresa) {
  const url = getLogoUrl(empresa)
  if (!url) return null

  if (bufferCache.has(url)) return bufferCache.get(url)

  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    bufferCache.set(url, buf)
    return buf
  } catch {
    return null
  }
}
