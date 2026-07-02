import { useEffect } from 'react'

const BASE = 'VerificaDoc'

// Título de pestaña por página: orientación para historial del navegador,
// múltiples pestañas y lectores de pantalla.
export function useDocumentTitle(titulo) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${BASE}` : BASE
    return () => { document.title = BASE }
  }, [titulo])
}
