import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO } from '@/lib/documentos'
import { FileText, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import Spinner from '@/components/Spinner'

function KpiCard({ label, value, icon: Icon, accent, bg, sub }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent, '--kpi-bg': bg }}>
      <div className="kpi-icon">
        <Icon size={18} color={accent} strokeWidth={1.75} />
      </div>
      <div>
        <p className="kpi-value">{value}</p>
        <p className="kpi-label">{label}</p>
        {sub && <p className="kpi-sub">{sub}</p>}
      </div>
    </div>
  )
}

function BarRow({ label, count, max, color = 'var(--accent)' }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="bar-row">
      <div className="bar-row-head">
        <span className="bar-row-label">{label}</span>
        <span className="bar-row-count">{count}</span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, '--bar-color': color }} />
      </div>
    </div>
  )
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const AÑOS  = ['2024','2025','2026','2027']

// KPIs y gráficos de emisión, mostrados dentro de Historial.
// Consulta agregada propia: la tabla de Historial está limitada a 200
// filas y filtrada, así que no sirve como fuente de los totales.
export default function Estadisticas() {
  const [stats,       setStats]       = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [periodo,     setPeriodo]     = useState(String(new Date().getFullYear()))
  const [verGraficos, setVerGraficos] = useState(false)

  useEffect(() => { fetchStats() }, [periodo])

  async function fetchStats() {
    setLoading(true)
    const { data } = await supabase
      .from('documentos')
      .select('tipo, estado, empresa_id, fecha_emision, empresas(razon_social)')
      .gte('fecha_emision', `${periodo}-01-01`)
      .lte('fecha_emision', `${periodo}-12-31`)

    if (!data) { setLoading(false); return }

    const totales    = { total: data.length, activo: 0, anulado: 0 }
    const porTipo    = {}
    const porEmpresa = {}
    const porMes     = Array(12).fill(0)

    data.forEach(d => {
      totales[d.estado] = (totales[d.estado] ?? 0) + 1
      porTipo[d.tipo]   = (porTipo[d.tipo]   ?? 0) + 1
      const emp = d.empresas?.razon_social ?? d.empresa_id
      porEmpresa[emp]   = (porEmpresa[emp]   ?? 0) + 1
      if (d.fecha_emision) {
        const mes = parseInt(d.fecha_emision.split('-')[1]) - 1
        porMes[mes]++
      }
    })

    setStats({ totales, porTipo, porEmpresa, porMes })
    setLoading(false)
  }

  const tasaAnulacion = stats && stats.totales.total > 0
    ? Math.round((stats.totales.anulado / stats.totales.total) * 100)
    : 0

  const sinDatos = !stats || stats.totales.total === 0

  return (
    <section style={{ marginBottom: '1.5rem' }} aria-label="Estadísticas de emisión">

      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: '.75rem', flexWrap: 'wrap',
      }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy)', margin: 0, flex: 1 }}>
          Estadísticas de emisión
        </p>
        <select
          className="input filter-input"
          style={{ width: 'auto', fontWeight: 600 }}
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          aria-label="Período"
        >
          {AÑOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {!sinDatos && (
          <button type="button" className="btn btn-sm" onClick={() => setVerGraficos(v => !v)}>
            {verGraficos
              ? <><ChevronUp size={13} /> Ocultar gráficos</>
              : <><ChevronDown size={13} /> Ver gráficos</>
            }
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <Spinner size={22} />
        </div>
      ) : sinDatos ? (
        <div className="card" style={{ padding: '1rem 1.25rem', fontSize: 13, color: 'var(--muted)' }}>
          Sin datos en {periodo}: no se emitieron documentos en este período.
        </div>
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard
              label="Total emitidos"
              value={stats.totales.total}
              icon={FileText}
              accent="var(--mc-color-text)"
              bg="var(--mc-color-bg-secondary)"
            />
            <KpiCard
              label="Activos"
              value={stats.totales.activo ?? 0}
              icon={CheckCircle}
              accent="var(--mc-color-success)"
              bg="var(--mc-color-success-soft)"
              sub={`${100 - tasaAnulacion}% del total`}
            />
            <KpiCard
              label="Anulados"
              value={stats.totales.anulado ?? 0}
              icon={XCircle}
              accent="var(--mc-color-danger)"
              bg="var(--mc-color-danger-soft)"
              sub={tasaAnulacion > 0 ? `${tasaAnulacion}% del total` : undefined}
            />
          </div>

          {verGraficos && (
            <>
              <div className="grid-2" style={{ margin: '1rem 0' }}>
                <div className="panel">
                  <p className="panel-head">Por tipo de documento</p>
                  <div className="panel-body">
                    {Object.entries(stats.porTipo)
                      .sort((a, b) => b[1] - a[1])
                      .map(([tipo, count]) => (
                        <BarRow
                          key={tipo}
                          label={`${tipo} · ${TIPOS_DOCUMENTO[tipo]?.label ?? tipo}`}
                          count={count}
                          max={stats.totales.total}
                        />
                      ))
                    }
                  </div>
                </div>

                <div className="panel">
                  <p className="panel-head">Por empresa</p>
                  <div className="panel-body">
                    {Object.entries(stats.porEmpresa)
                      .sort((a, b) => b[1] - a[1])
                      .map(([emp, count]) => (
                        <BarRow key={emp} label={emp} count={count} max={stats.totales.total} color="var(--mc-color-info)" />
                      ))
                    }
                  </div>
                </div>
              </div>

              <div className="panel">
                <p className="panel-head">Emisiones por mes — {periodo}</p>
                <div className="panel-body">
                  <div className="chart-months">
                    {stats.porMes.map((n, i) => {
                      const max = Math.max(...stats.porMes, 1)
                      const h   = Math.round((n / max) * 80) + 4
                      const active = n > 0
                      return (
                        <div key={i} className="chart-month-col">
                          <span className="chart-month-val">{active ? n : ' '}</span>
                          <div
                            className={`chart-month-bar${active ? ' active' : ''}`}
                            style={{ height: h }}
                          />
                          <span className="chart-month-label">{MESES[i]}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
