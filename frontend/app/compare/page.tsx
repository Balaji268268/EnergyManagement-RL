'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { api } from '@/lib/api'
import { BarChart3, Play, CheckCircle, Loader, AlertCircle, TrendingDown } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts'

const ALGO_COLORS: Record<string, string> = {
  sac: '#00d4ff',
  ppo: '#10b981',
  dqn: '#f59e0b',
  rule_based: '#7c3aed',
  naive: '#475569',
}
const ALGO_LABELS: Record<string, string> = {
  sac: 'SAC', ppo: 'PPO', dqn: 'DQN',
  rule_based: 'Rule-Based', naive: 'Naive',
}

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => <div key={p.name} style={{ color: p.fill || p.stroke }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</strong></div>)}
    </div>
  )
}

function MetricBar({ data, dataKey, label, unit = '', color }: { data: any[]; dataKey: string; label: string; unit?: string; color?: string }) {
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div className="section-title">{label}</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="algo" tick={{ fontSize: 11 }} stroke="var(--text-muted)" />
          <YAxis tick={{ fontSize: 11 }} stroke="var(--text-muted)" unit={unit} />
          <Tooltip content={<Tip />} />
          {data.map(d => (
            <Bar key={d.algo} dataKey={dataKey} fill={ALGO_COLORS[d.algo] || '#64748b'} radius={[4, 4, 0, 0]} maxBarSize={50} />
          ))}
          <Bar dataKey={dataKey} fill="transparent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function ComparePage() {
  const [compareId, setCompareId] = useState('')
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [results, setResults] = useState<Record<string, any> | null>(null)
  const [error, setError] = useState('')

  async function handleRun() {
    setError('')
    setStatus('running')
    try {
      const r = await api.startCompare({ days: 14 })
      setCompareId(r.compare_id)

      const poll = setInterval(async () => {
        const cmp = await api.getCompare(r.compare_id)
        if (cmp.status === 'completed') {
          setResults(cmp.results)
          setStatus('completed')
          clearInterval(poll)
        } else if (cmp.status === 'failed') {
          setError('Comparison failed')
          setStatus('failed')
          clearInterval(poll)
        }
      }, 2500)
    } catch (e: any) {
      setError(e.message)
      setStatus('failed')
    }
  }

  // Build flat metric rows for charts
  const metricRows = results
    ? Object.entries(results).map(([algo, d]: [string, any]) => ({
        algo,
        label: ALGO_LABELS[algo] || algo,
        net_cost: d.summary?.net_cost ?? 0,
        peak_import: d.summary?.peak_grid_import ?? 0,
        total_reward: d.summary?.total_reward ?? 0,
        renewable_ratio: (d.summary?.renewable_ratio ?? 0) * 100,
        avg_soc: d.summary?.avg_soc_pct ?? 0,
        violations: d.summary?.total_violations ?? 0,
      }))
    : []

  // Radar data
  const radarAlgos = ['sac', 'ppo', 'dqn', 'rule_based']
  const radarData = results
    ? [
        { metric: 'Low Cost', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) { const v = results[a].summary?.net_cost ?? 0; const best = Math.max(...radarAlgos.map(x => results[x]?.summary?.net_cost ?? 0)); acc[a] = Math.max(0, 100 - (v / (best || 1)) * 100); } return acc; }, {}) },
        { metric: 'Low Peak', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) { const v = results[a].summary?.peak_grid_import ?? 0; const best = Math.max(...radarAlgos.map(x => results[x]?.summary?.peak_grid_import ?? 0)); acc[a] = Math.max(0, 100 - (v / (best || 1)) * 100); } return acc; }, {}) },
        { metric: 'Reward', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) { const vals = radarAlgos.map(x => results[x]?.summary?.total_reward ?? 0); const mn = Math.min(...vals), mx = Math.max(...vals); const v = results[a].summary?.total_reward ?? 0; acc[a] = mx > mn ? ((v - mn) / (mx - mn)) * 100 : 50; } return acc; }, {}) },
        { metric: 'Renewable', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) acc[a] = (results[a].summary?.renewable_ratio ?? 0) * 100; return acc }, {}) },
        { metric: 'Low Violations', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) { const v = results[a].summary?.total_violations ?? 0; const best = Math.max(...radarAlgos.map(x => results[x]?.summary?.total_violations ?? 0)); acc[a] = Math.max(0, 100 - (v / (best || 1)) * 100); } return acc; }, {}) },
        { metric: 'SOC Stability', ...radarAlgos.reduce((acc: any, a) => { if (results[a]) acc[a] = Math.min(100, (results[a].summary?.avg_soc_pct ?? 50)); return acc }, {}) },
      ]
    : []

  // SOC time series (first 48 steps)
  const socSeries = results
    ? Object.entries(results)
        .filter(([a]) => ['sac', 'ppo', 'dqn', 'rule_based'].includes(a))
        .reduce((acc: any[], [algo, d]: [string, any]) => {
          const steps: any[] = (d.steps || []).slice(0, 48)
          steps.forEach((s: any, i: number) => {
            if (!acc[i]) acc[i] = { t: i }
            acc[i][algo] = s.soc_pct
          })
          return acc
        }, [])
    : []

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Algorithm <span className="gradient-text">Comparison</span></h1>
          <p>Compare SAC, PPO, DQN vs Rule-Based and Naive baselines on 14-day test data.</p>
        </div>

        {/* Run button */}
        <div className="glass" style={{ padding: 20, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Run Full Comparison</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Evaluates all saved RL models + rule-based + naive baseline on 14-day test data (seed=99).
              Trains require completed jobs in <strong>/train</strong> first.
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleRun} disabled={status === 'running'} style={{ marginLeft: 'auto', flexShrink: 0 }}>
            {status === 'running'
              ? <><span className="spinner" /> Running...</>
              : <><Play size={15} /> Run Comparison</>}
          </button>
          {status === 'completed' && <span className="badge badge-completed"><CheckCircle size={10} />Done</span>}
          {status === 'failed' && <span className="badge badge-failed"><AlertCircle size={10} />Failed: {error}</span>}
        </div>

        {status === 'running' && (
          <div className="glass" style={{ padding: 32, textAlign: 'center', marginBottom: 24 }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
            <div style={{ fontWeight: 600 }}>Evaluating all policies...</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Running 5 policies × 14 days × 24 steps each</div>
          </div>
        )}

        {status === 'completed' && results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary table */}
            <div className="glass" style={{ padding: 20, overflow: 'auto' }}>
              <div className="section-title"><BarChart3 size={14} />Metric Summary</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Policy</th>
                    <th>Net Cost ($)</th>
                    <th>Peak Import (kW)</th>
                    <th>Total Reward</th>
                    <th>Renewable (%)</th>
                    <th>Avg SOC (%)</th>
                    <th>Violations ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map(row => (
                    <tr key={row.algo}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: ALGO_COLORS[row.algo] || '#475569' }} />
                          <strong style={{ color: ALGO_COLORS[row.algo] || 'var(--text-primary)' }}>{row.label}</strong>
                        </div>
                      </td>
                      <td style={{ color: row.algo === metricRows.reduce((a, b) => a.net_cost < b.net_cost ? a : b).algo ? 'var(--success)' : 'var(--text-primary)' }}>
                        {row.net_cost.toFixed(2)}
                      </td>
                      <td>{row.peak_import.toFixed(1)}</td>
                      <td>{row.total_reward.toFixed(1)}</td>
                      <td>{row.renewable_ratio.toFixed(1)}%</td>
                      <td>{row.avg_soc.toFixed(1)}%</td>
                      <td style={{ color: row.violations > 0 ? 'var(--danger)' : 'var(--success)' }}>{row.violations.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bar charts row */}
            <div className="grid-3">
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title"><TrendingDown size={14} />Net Energy Cost ($)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="net_cost" radius={[4,4,0,0]} maxBarSize={40}
                      fill="var(--danger)"
                      label={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title">Peak Grid Import (kW)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="peak_import" radius={[4,4,0,0]} maxBarSize={40} fill="var(--warning)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title">Total Reward</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="total_reward" radius={[4,4,0,0]} maxBarSize={40} fill="var(--success)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SOC Trajectory + Radar */}
            <div className="grid-2">
              {socSeries.length > 0 && (
                <div className="glass" style={{ padding: 20 }}>
                  <div className="section-title">SOC Trajectory (first 48h)</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={socSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" label={{ value: 'Hour', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit="%" domain={[0, 100]} />
                      <Tooltip content={<Tip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {radarAlgos.map(a => results[a] && (
                        <Line key={a} type="monotone" dataKey={a} stroke={ALGO_COLORS[a]} dot={false} strokeWidth={2} name={ALGO_LABELS[a]} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {radarData.length > 0 && (
                <div className="glass" style={{ padding: 20 }}>
                  <div className="section-title">Multi-Metric Radar (higher = better)</div>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                      {radarAlgos.map(a => results[a] && (
                        <Radar key={a} name={ALGO_LABELS[a]} dataKey={a}
                          stroke={ALGO_COLORS[a]} fill={ALGO_COLORS[a]} fillOpacity={0.12} strokeWidth={2} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip content={<Tip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="empty-state glass" style={{ padding: 60 }}>
            <BarChart3 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3>No Comparison Yet</h3>
            <p>Train at least one RL model in the Training console, then click Run Comparison above to benchmark all algorithms.</p>
            <a href="/train"><button className="btn btn-primary" style={{ margin: '0 auto' }}>Go to Training</button></a>
          </div>
        )}
      </main>
    </div>
  )
}
