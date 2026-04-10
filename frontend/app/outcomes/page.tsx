'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { api } from '@/lib/api'
import {
  TrendingDown, AlertTriangle, Brain, Scale,
  Play, CheckCircle, DollarSign, Zap, BarChart2, Target
} from 'lucide-react'
import {
  LineChart, Line, ScatterChart, Scatter, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ReferenceLine, ZAxis
} from 'recharts'

/* ── colour constants ────────────────────────────────────────────────────── */
const COLORS: Record<string, string> = {
  sac: '#00d4ff', ppo: '#10b981', dqn: '#f59e0b',
  rule_based: '#7c3aed', naive: '#475569',
}
const LABELS: Record<string, string> = {
  sac: 'SAC', ppo: 'PPO', dqn: 'DQN', rule_based: 'Rule-Based', naive: 'Naive',
}
const ALGOS_ORDER = ['sac', 'ppo', 'dqn', 'rule_based', 'naive']
const RL_ALGOS = ['sac', 'ppo', 'dqn']

/* ── tooltip ─────────────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      {label !== undefined && <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color || p.fill || p.stroke || 'var(--text-primary)' }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

/* ── section header ──────────────────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, color, num, title, desc }: any) => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 20 }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>Outcome {num}</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color }}>{title}</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</p>
    </div>
  </div>
)

/* ── savings KPI ─────────────────────────────────────────────────────────── */
function SavingsKPI({ data }: { data: any }) {
  const naive = data.summaries?.naive
  const best = data.tradeoff_points?.reduce((a: any, b: any) => (a.net_cost < b.net_cost ? a : b), data.tradeoff_points?.[0])

  if (!naive || !best) return null
  const savingsPct = naive.net_cost > 0 ? ((naive.net_cost - best.net_cost) / naive.net_cost * 100) : 0
  const peakReduction = data.summaries?.[best.algo]?.peak_grid_import
    ? (data.summaries.naive.peak_grid_import - data.summaries[best.algo].peak_grid_import) / data.summaries.naive.peak_grid_import * 100
    : 0

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
      {[
        { label: 'Best Net Cost', value: `$${best.net_cost.toFixed(2)}`, sub: `${LABELS[best.algo]} wins`, color: 'var(--success)' },
        { label: 'vs Naive Baseline', value: `${savingsPct.toFixed(1)}%`, sub: 'cost reduction', color: 'var(--primary)' },
        { label: 'Peak Reduction', value: `${Math.abs(peakReduction).toFixed(1)}%`, sub: 'vs no-battery', color: 'var(--warning)' },
        { label: 'Algorithms Evaluated', value: data.algorithms_run?.length ?? 0, sub: 'policies compared', color: 'var(--secondary)' },
      ].map(m => (
        <div key={m.label} className="glass stat-card">
          <div className="label">{m.label}</div>
          <div className="value" style={{ fontSize: 22, color: m.color }}>{m.value}</div>
          <div className="sub">{m.sub}</div>
        </div>
      ))}
    </div>
  )
}

/* ── main page ───────────────────────────────────────────────────────────── */
export default function OutcomesPage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [activeAlgo, setActiveAlgo] = useState('sac')

  async function handleRun() {
    setError('')
    setStatus('running')
    try {
      const result = await api.runOutcomes({ days: 14 })
      setData(result)
      // default to first RL algo that has interpretation data
      const firstRL = RL_ALGOS.find(a => result.interpretation?.[a]) || result.algorithms_run?.[0]
      setActiveAlgo(firstRL || 'rule_based')
      setStatus('done')
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
    }
  }

  /* ── derived chart data ───────────────────────────────────────────────── */
  const algosAvailable = data ? ALGOS_ORDER.filter(a => data.summaries?.[a]) : []

  // Cost savings bar
  const costBarData = algosAvailable.map(a => ({
    algo: LABELS[a] || a,
    net_cost: data.summaries[a]?.net_cost ?? 0,
    _key: a,
  }))

  // Trade-off scatter
  const tradeoffWithColor = (data?.tradeoff_points ?? []).map((p: any) => ({
    ...p,
    fill: COLORS[p.algo] || '#64748b',
    label: LABELS[p.algo] || p.algo,
  }))

  // Cumulative cost lines — downsample to 200pts each
  const cumulativeAlgos = data ? Object.keys(data.cumulative_cost || {}) : []
  const maxLen = data ? Math.max(...cumulativeAlgos.map((a: string) => (data.cumulative_cost[a] || []).length), 1) : 1
  const step = Math.max(1, Math.ceil(maxLen / 200))
  const cumChartData: any[] = []
  if (data) {
    const longest = data.cumulative_cost[cumulativeAlgos[0]] || []
    for (let i = 0; i < longest.length; i += step) {
      const row: any = { t: i }
      cumulativeAlgos.forEach((a: string) => { row[a] = data.cumulative_cost[a]?.[i]?.cumulative_cost ?? null })
      cumChartData.push(row)
    }
  }

  // Hourly cost compare
  const hourlyCostData = data?.hourly_cost_compare ?? []

  // Interpretation for selected algo
  const interp = data?.interpretation?.[activeAlgo]
  const hourlyAvg = interp?.hourly_avg ?? []
  const actionDist = interp?.action_distribution ?? []
  const actionVsPrice = interp?.action_vs_price ?? []
  const actionVsSoc = interp?.action_vs_soc ?? []

  /* ── action distribution colours ───────────────────────────────────────── */
  const distColors = ['#00d4ff', '#10b981', '#64748b', '#f59e0b', '#ef4444']

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1>Expected <span className="gradient-text">Outcomes</span></h1>
              <p>Project brief results: cost savings · trade-off curves · policy interpretation</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {status === 'done' && <span className="badge badge-completed"><CheckCircle size={10} />Analysis Complete</span>}
              <button className="btn btn-primary" onClick={handleRun} disabled={status === 'running'}>
                {status === 'running'
                  ? <><span className="spinner" />Evaluating — {'>'}1min...</>
                  : <><Play size={15} />Run Full Evaluation</>}
              </button>
            </div>
          </div>
          {error && <div style={{ marginTop: 10, color: 'var(--danger)', fontSize: 13 }}>Error: {error}</div>}
        </div>

        {/* ── Info banner ────────────────────────────────────────────────── */}
        {status === 'idle' && (
          <div className="glass" style={{ padding: '20px 24px', marginBottom: 24, borderLeft: '3px solid var(--primary)', display: 'flex', gap: 16 }}>
            <Target size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>IEEE Project Brief — Expected Outcomes</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                This page evaluates all 3 required outcomes: <strong>cost savings demonstration</strong>,
                {' '}<strong>trade-off curves (energy cost vs constraint violations)</strong>, and
                {' '}<strong>policy interpretation under uncertainty</strong>. Click <em>Run Full Evaluation</em> to
                run all available policies (RL models + Rule-Based + Naive) on 14-day test data.
                Train at least one RL model in <a href="/train" style={{ color: 'var(--primary)' }}>Training</a> for RL comparison.
              </div>
            </div>
          </div>
        )}

        {status === 'running' && (
          <div className="glass" style={{ padding: 48, textAlign: 'center', marginBottom: 24 }}>
            <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Running Full Policy Evaluation</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Evaluating all policies × 14 days × 24h · Computing trade-off curves · Analysing policy decisions...
            </div>
          </div>
        )}

        {status === 'done' && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* ══════════════════════════════════════════════════════════════
                OUTCOME 1 — Cost Savings Demonstration
            ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader
                icon={DollarSign} color="var(--success)" num={1}
                title="Cost Savings Demonstration"
                desc="Net energy cost (energy imported − export revenue) for each policy over 14-day test period."
              />
              <SavingsKPI data={data} />

              <div className="grid-2">
                {/* Cost bar chart */}
                <div className="glass" style={{ padding: 22 }}>
                  <div className="section-title"><BarChart2 size={13} />Net Energy Cost by Policy ($)</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={costBarData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--text-muted)" tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <YAxis type="category" dataKey="algo" tick={{ fontSize: 11 }} stroke="var(--text-muted)" width={84} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="net_cost" radius={[0, 4, 4, 0]} maxBarSize={32} name="Net Cost ($)">
                        {costBarData.map((d: any) => (
                          <Cell key={d._key} fill={COLORS[d._key] || '#64748b'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Cumulative cost over time */}
                <div className="glass" style={{ padding: 22 }}>
                  <div className="section-title"><TrendingDown size={13} />Cumulative Cost Over Time ($)</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={cumChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" label={{ value: 'Timestep', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {cumulativeAlgos.map((a: string) => (
                        <Line key={a} type="monotone" dataKey={a} stroke={COLORS[a] || '#64748b'} dot={false} strokeWidth={2} name={LABELS[a] || a} connectNulls />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    Lower = less money spent importing from grid · Slope = hourly spend rate
                  </div>
                </div>
              </div>

              {/* Hourly cost heatmap */}
              {hourlyCostData.length > 0 && (
                <div className="glass" style={{ padding: 22, marginTop: 16 }}>
                  <div className="section-title"><Zap size={13} />Average Hourly Energy Cost — All Policies ($/hour)</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={hourlyCostData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="var(--text-muted)" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      {algosAvailable.map(a => (
                        <Bar key={a} dataKey={a} fill={COLORS[a] || '#64748b'} name={LABELS[a] || a} maxBarSize={12} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    Shaded area 17–22h = peak price window · RL agents should reduce cost here by pre-charging
                  </div>
                </div>
              )}
            </section>

            {/* ══════════════════════════════════════════════════════════════
                OUTCOME 2 — Trade-off Curves
            ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader
                icon={Scale} color="var(--warning)" num={2}
                title="Trade-off Curves: Energy Cost vs Constraint Violations"
                desc="Pareto analysis — each dot is a policy. Ideal agent sits bottom-left (low cost AND low violations)."
              />

              <div className="grid-2">
                {/* Trade-off scatter: cost vs violations */}
                <div className="glass" style={{ padding: 22 }}>
                  <div className="section-title">Energy Cost ($) vs Violations ($penalty)</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="net_cost" type="number" name="Net Cost" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                        label={{ value: 'Net Energy Cost ($)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis dataKey="violations" type="number" name="Violations" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                        label={{ value: 'Violations ($)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                      <ZAxis range={[120, 120]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]?.payload
                          return (
                            <div style={{ background: 'rgba(13,27,46,0.97)', border: `1px solid ${COLORS[d.algo] || 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                              <div style={{ fontWeight: 700, color: COLORS[d.algo], marginBottom: 6 }}>{LABELS[d.algo] || d.algo}</div>
                              <div>Net Cost: <strong>${d.net_cost?.toFixed(2)}</strong></div>
                              <div>Violations: <strong>${d.violations?.toFixed(3)}</strong></div>
                              <div>Peak Import: <strong>{d.peak?.toFixed(1)} kW</strong></div>
                              <div>Reward: <strong>{d.reward?.toFixed(1)}</strong></div>
                            </div>
                          )
                        }}
                      />
                      <Scatter name="Policies" data={tradeoffWithColor}>
                        {tradeoffWithColor.map((d: any, i: number) => (
                          <Cell key={i} fill={COLORS[d.algo] || '#64748b'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8, justifyContent: 'center' }}>
                    {tradeoffWithColor.map((d: any) => (
                      <div key={d.algo} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[d.algo] || '#64748b' }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{LABELS[d.algo] || d.algo}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    ↙ Bottom-left = ideal (low cost, low violations)
                  </div>
                </div>

                {/* Trade-off: cost vs peak */}
                <div className="glass" style={{ padding: 22 }}>
                  <div className="section-title">Net Cost ($) vs Peak Grid Import (kW)</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="net_cost" type="number" name="Net Cost" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                        label={{ value: 'Net Energy Cost ($)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis dataKey="peak" type="number" name="Peak Import" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                        label={{ value: 'Peak Import (kW)', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 11 }} />
                      <ZAxis range={[120, 120]} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0]?.payload
                          return (
                            <div style={{ background: 'rgba(13,27,46,0.97)', border: `1px solid ${COLORS[d.algo] || 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                              <div style={{ fontWeight: 700, color: COLORS[d.algo], marginBottom: 6 }}>{LABELS[d.algo] || d.algo}</div>
                              <div>Net Cost: <strong>${d.net_cost?.toFixed(2)}</strong></div>
                              <div>Peak Import: <strong>{d.peak?.toFixed(1)} kW</strong></div>
                              <div>Renewable: <strong>{(d.renewable_ratio * 100)?.toFixed(1)}%</strong></div>
                            </div>
                          )
                        }}
                      />
                      <Scatter name="Policies" data={tradeoffWithColor}>
                        {tradeoffWithColor.map((d: any, i: number) => (
                          <Cell key={i} fill={COLORS[d.algo] || '#64748b'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    ↙ Bottom-left = ideal (cheap AND low peak demand charge)
                  </div>
                </div>
              </div>

              {/* Detailed trade-off table */}
              <div className="glass" style={{ padding: 22, marginTop: 16, overflow: 'auto' }}>
                <div className="section-title"><AlertTriangle size={13} />Full Evaluation Table — Energy Savings vs Operational Constraints</div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Net Cost ($)</th>
                      <th>vs Naive</th>
                      <th>Peak Import (kW)</th>
                      <th>SOC Violations ($)</th>
                      <th>Battery Degradation ($)</th>
                      <th>Renewable Use (%)</th>
                      <th>Total Reward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {algosAvailable.map(algo => {
                      const s = data.summaries[algo] || {}
                      const naiveCost = data.summaries?.naive?.net_cost ?? 0
                      const savingVsNaive = naiveCost > 0 ? ((naiveCost - s.net_cost) / naiveCost * 100) : 0
                      const isRL = RL_ALGOS.includes(algo)
                      return (
                        <tr key={algo}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[algo] || '#64748b' }} />
                              <strong style={{ color: COLORS[algo] || 'var(--text-primary)', fontSize: 14 }}>{LABELS[algo] || algo}</strong>
                              {isRL && <span style={{ fontSize: 9, fontWeight: 600, background: 'var(--primary-glow)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 99, border: '1px solid var(--border-accent)' }}>RL</span>}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: s.net_cost === Math.min(...algosAvailable.map(a => data.summaries[a]?.net_cost ?? Infinity)) ? 'var(--success)' : 'var(--text-primary)' }}>
                            ${(s.net_cost ?? 0).toFixed(2)}
                          </td>
                          <td style={{ color: savingVsNaive > 0 ? 'var(--success)' : savingVsNaive < 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                            {savingVsNaive > 0 ? '▼' : savingVsNaive < 0 ? '▲' : '–'} {Math.abs(savingVsNaive).toFixed(1)}%
                          </td>
                          <td>{(s.peak_grid_import ?? 0).toFixed(1)}</td>
                          <td style={{ color: (s.total_violations ?? 0) > 0.01 ? 'var(--danger)' : 'var(--success)' }}>
                            ${(s.total_violations ?? 0).toFixed(3)}
                          </td>
                          <td>${(s.total_degradation ?? 0).toFixed(3)}</td>
                          <td style={{ color: (s.renewable_ratio ?? 0) > 0.4 ? 'var(--success)' : 'var(--text-primary)' }}>
                            {((s.renewable_ratio ?? 0) * 100).toFixed(1)}%
                          </td>
                          <td style={{ color: 'var(--primary)' }}>{(s.total_reward ?? 0).toFixed(1)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════════════════
                OUTCOME 3 — Policy Interpretation Under Uncertainty
            ══════════════════════════════════════════════════════════════ */}
            <section>
              <SectionHeader
                icon={Brain} color="var(--secondary)" num={3}
                title="Policy Interpretation Under Uncertainty"
                desc="What does each policy decide to do? When does it charge vs discharge? How does it respond to price signals?"
              />

              {/* Algorithm selector tabs */}
              <div className="glass" style={{ padding: 6, display: 'inline-flex', gap: 4, marginBottom: 20, borderRadius: 10 }}>
                {algosAvailable.filter(a => data.interpretation?.[a]).map(a => (
                  <button key={a} onClick={() => setActiveAlgo(a)}
                    className="btn"
                    style={{
                      padding: '8px 16px', fontSize: 13, fontWeight: 600,
                      background: activeAlgo === a ? COLORS[a] : 'transparent',
                      color: activeAlgo === a ? (a === 'naive' ? '#fff' : '#000') : COLORS[a] || 'var(--text-secondary)',
                      border: `1px solid ${activeAlgo === a ? COLORS[a] : 'transparent'}`,
                      boxShadow: activeAlgo === a ? `0 0 16px ${COLORS[a]}40` : 'none',
                    }}>
                    {LABELS[a] || a}
                  </button>
                ))}
              </div>

              {interp ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div className="grid-2">
                    {/* Hourly action pattern */}
                    <div className="glass" style={{ padding: 22 }}>
                      <div className="section-title">Average Battery Action by Hour (−1=Charge, +1=Discharge)</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={hourlyAvg}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                            label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }} />
                          <YAxis domain={[-1.1, 1.1]} tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                          <Tooltip content={<Tip />} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                          {/* shade peak hours */}
                          <ReferenceLine x={17} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'Peak', fill: 'var(--danger)', fontSize: 9 }} />
                          <ReferenceLine x={22} stroke="var(--danger)" strokeDasharray="4 4" />
                          <Bar dataKey="avg_action" name="Avg Action" radius={[2, 2, 0, 0]}
                            fill={COLORS[activeAlgo] || '#64748b'} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        Red lines = peak price window (17–22h) · Smart agents charge before, discharge during peak
                      </div>
                    </div>

                    {/* Action distribution donut-style bar */}
                    <div className="glass" style={{ padding: 22 }}>
                      <div className="section-title">Action Distribution (% of All Steps)</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={actionDist} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit="%" domain={[0, 100]} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} stroke="var(--text-muted)" width={110} />
                          <Tooltip content={<Tip />} />
                          <Bar dataKey="pct" name="%" radius={[0, 4, 4, 0]} maxBarSize={28}>
                            {actionDist.map((_: any, i: number) => <Cell key={i} fill={distColors[i % distColors.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        RL agents vary action; Rule-Based tends toward binary; Naive = 100% Hold
                      </div>
                    </div>
                  </div>

                  <div className="grid-2">
                    {/* Action vs Price scatter */}
                    <div className="glass" style={{ padding: 22 }}>
                      <div className="section-title">Action vs Electricity Price — Price-Responsive Behaviour</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="price" type="number" name="Price" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                            label={{ value: 'Price ($/kWh)', position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 10 }} />
                          <YAxis dataKey="action" type="number" name="Action" domain={[-1.1, 1.1]} tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                            label={{ value: 'Action', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                          <ZAxis range={[20, 20]} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]?.payload
                            return <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
                              Price: ${d.price?.toFixed(3)}<br />Action: {d.action?.toFixed(2)}<br />SOC: {d.soc?.toFixed(0)}%
                            </div>
                          }} />
                          <Scatter data={actionVsPrice} fill={COLORS[activeAlgo] || '#64748b'} opacity={0.55} />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        Ideal: negative actions (charge) at low prices · positive (discharge) at high prices
                      </div>
                    </div>

                    {/* Action vs SOC scatter */}
                    <div className="glass" style={{ padding: 22 }}>
                      <div className="section-title">Action vs Battery SOC — SOC-Aware Behaviour</div>
                      <ResponsiveContainer width="100%" height={220}>
                        <ScatterChart margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="soc" type="number" name="SOC %" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                            label={{ value: 'Battery SOC (%)', position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 10 }} domain={[0, 100]} />
                          <YAxis dataKey="action" type="number" name="Action" domain={[-1.1, 1.1]} tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                            label={{ value: 'Action', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }} />
                          <ZAxis range={[20, 20]} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                          <ReferenceLine x={10} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'Min SOC', fill: 'var(--danger)', fontSize: 9 }} />
                          <ReferenceLine x={95} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'Max SOC', fill: 'var(--warning)', fontSize: 9 }} />
                          <Tooltip content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0]?.payload
                            return <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11 }}>
                              SOC: {d.soc?.toFixed(0)}%<br />Action: {d.action?.toFixed(2)}<br />Price: ${d.price?.toFixed(3)}
                            </div>
                          }} />
                          <Scatter data={actionVsSoc} fill={COLORS[activeAlgo] || '#64748b'} opacity={0.55} />
                        </ScatterChart>
                      </ResponsiveContainer>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                        Smart: charge when SOC low · discharge when SOC high · avoid extremes (10%–95%)
                      </div>
                    </div>
                  </div>

                  {/* Hourly SOC + cost overlay */}
                  <div className="glass" style={{ padding: 22 }}>
                    <div className="section-title">Hourly SOC Level & Avg Cost — Battery Scheduling Over the Day</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={hourlyAvg}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="var(--text-muted)"
                          label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }} />
                        <YAxis yAxisId="soc" tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit="%" domain={[0, 100]} />
                        <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                        <Tooltip content={<Tip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="soc" dataKey="avg_soc" fill={`${COLORS[activeAlgo] || '#64748b'}55`}
                          stroke={COLORS[activeAlgo] || '#64748b'} strokeWidth={1} name="Avg SOC (%)" radius={[2, 2, 0, 0]} maxBarSize={24} />
                        <Line yAxisId="cost" type="monotone" dataKey="avg_cost" stroke="var(--danger)" strokeWidth={2} dot={false} name="Avg Cost ($)" />
                        <ReferenceLine yAxisId="soc" x={17} stroke="var(--warning)" strokeDasharray="3 3" />
                        <ReferenceLine yAxisId="soc" x={22} stroke="var(--warning)" strokeDasharray="3 3" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
                      A smart policy builds SOC before 17h peak window and depletes it during peak to minimise import cost
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No interpretation data available for {activeAlgo}. Select an algorithm with available policy data.
                </div>
              )}
            </section>

          </div>
        )}
      </main>
    </div>
  )
}
