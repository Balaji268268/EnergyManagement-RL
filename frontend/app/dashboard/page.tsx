'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { api, JobStatus, ModelMeta } from '@/lib/api'
import { Activity, Cpu, BarChart3, RefreshCw, Zap, Battery, TrendingDown, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const ALGO_COLORS: Record<string, string> = {
  sac: '#00d4ff', ppo: '#10b981', dqn: '#f59e0b',
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass stat-card">
      <div className="label">{label}</div>
      <div className="value" style={{ color: color || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobStatus[]>([])
  const [models, setModels] = useState<ModelMeta[]>([])
  const [preview, setPreview] = useState<Record<string, number>[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function load() {
    setLoading(true)
    try {
      const [j, m, p] = await Promise.all([
        api.listJobs(),
        api.listModels(),
        api.dataPreview(1),
      ])
      setJobs(j)
      setModels(m)
      setPreview(p.records)
    } catch {}
    setLoading(false)
    setLastRefresh(new Date())
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [])

  const completedJobs = jobs.filter(j => j.status === 'completed')
  const runningJobs = jobs.filter(j => j.status === 'running')
  const algosTrained = [...new Set(completedJobs.map(j => j.algorithm))]

  // Best model per algorithm
  const bestByAlgo = completedJobs.reduce((acc: Record<string, JobStatus>, j) => {
    if (!acc[j.algorithm] || (j.summary?.total_reward ?? 0) > (acc[j.algorithm].summary?.total_reward ?? 0)) {
      acc[j.algorithm] = j
    }
    return acc
  }, {})

  // All training curves (completed jobs, most recent 3)
  const recentCompleted = [...completedJobs].slice(-3)

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>System <span className="gradient-text">Dashboard</span></h1>
              <p>Training registry, model performance, and live data preview.</p>
            </div>
            <button className="btn btn-secondary" onClick={load} disabled={loading}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard label="Total Jobs" value={jobs.length} sub="All time" color="var(--primary)" />
          <StatCard label="Completed" value={completedJobs.length} sub="Successful runs" color="var(--success)" />
          <StatCard label="Models Saved" value={models.length} sub="On disk" color="var(--warning)" />
          <StatCard label="Algorithms" value={algosTrained.length || '—'} sub={algosTrained.join(', ') || 'None trained'} color="var(--secondary)" />
        </div>

        {/* Running jobs alert */}
        {runningJobs.length > 0 && (
          <div style={{ marginBottom: 20, padding: '14px 20px', background: 'var(--primary-glow)', border: '1px solid var(--border-accent)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="pulse-dot primary" />
            <div>
              <strong>{runningJobs.length} training job{runningJobs.length > 1 ? 's' : ''} running</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                {runningJobs.map(j => j.algorithm?.toUpperCase()).join(', ')}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: Best models comparison */}
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title"><Cpu size={14} />Best Model per Algorithm</div>
            {Object.keys(bestByAlgo).length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', textAlign: 'center' }}>
                No completed training runs yet. <a href="/train" style={{ color: 'var(--primary)' }}>Start training →</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(bestByAlgo).map(([algo, job]) => {
                  const color = ALGO_COLORS[algo] || 'var(--text-primary)'
                  return (
                    <div key={algo} className="glass" style={{ padding: '16px 18px', borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, color, fontSize: 16 }}>{algo.toUpperCase()}</span>
                        <span className="badge badge-completed"><CheckCircle size={10} />Completed</span>
                      </div>
                      {job.summary && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                          {[
                            { l: 'Net Cost', v: `$${job.summary.net_cost?.toFixed(2)}` },
                            { l: 'Peak', v: `${job.summary.peak_grid_import?.toFixed(1)}kW` },
                            { l: 'Reward', v: job.summary.total_reward?.toFixed(1) },
                          ].map(m => (
                            <div key={m.l} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{m.l}</div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{m.v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: 24h data preview */}
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title"><Activity size={14} />24h Synthetic Data Preview</div>
            {preview.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={preview.slice(0, 24)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="var(--text-muted)" label={{ value: 'Hour', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit=" kW" />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="load"  stroke="#ef4444" fill="#ef444415" strokeWidth={1.5} dot={false} name="Load (kW)" />
                    <Area type="monotone" dataKey="solar" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={1.5} dot={false} name="Solar (kW)" />
                    <Area type="monotone" dataKey="wind"  stroke="#10b981" fill="#10b98115" strokeWidth={1.5} dot={false} name="Wind (kW)" />
                  </AreaChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={80} style={{ marginTop: 8 }}>
                  <LineChart data={preview.slice(0, 24)}>
                    <XAxis dataKey="hour" hide />
                    <YAxis hide domain={[0.05, 0.35]} />
                    <Line type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2} dot={false} name="Price $/kWh" />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  {[['#ef4444', 'Load'], ['#f59e0b', 'Solar'], ['#10b981', 'Wind'], ['#7c3aed', 'Price']].map(([c, l]) => (
                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <div style={{ width: 10, height: 2, background: c, borderRadius: 99 }} /> {l}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 40 }}>Loading...</div>
            )}
          </div>
        </div>

        {/* Training reward curves */}
        {recentCompleted.length > 0 && (
          <div className="glass" style={{ padding: 24, marginTop: 24 }}>
            <div className="section-title"><TrendingDown size={14} />Recent Training Curves</div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="timestep" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                {recentCompleted.map(job => (
                  <Line key={job.job_id} data={job.progress} type="monotone" dataKey="mean_reward"
                    stroke={ALGO_COLORS[job.algorithm] || '#64748b'} strokeWidth={2} dot={false}
                    name={`${job.algorithm?.toUpperCase()} (${job.job_id.slice(0, 6)})`} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Full jobs table */}
        <div className="glass" style={{ padding: 24, marginTop: 24, overflow: 'auto' }}>
          <div className="section-title"><Zap size={14} />All Training Jobs</div>
          {jobs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No jobs yet — start training to see runs here.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job ID</th><th>Algorithm</th><th>Status</th>
                  <th>Net Cost</th><th>Peak (kW)</th><th>Reward</th><th>Steps</th>
                </tr>
              </thead>
              <tbody>
                {[...jobs].reverse().map(j => (
                  <tr key={j.job_id}>
                    <td><code style={{ fontSize: 11, color: 'var(--text-muted)' }}>{j.job_id.slice(0, 12)}…</code></td>
                    <td><strong style={{ color: ALGO_COLORS[j.algorithm] || 'var(--text-primary)' }}>{j.algorithm?.toUpperCase()}</strong></td>
                    <td><span className={`badge badge-${j.status}`}>{j.status}</span></td>
                    <td>{j.summary ? `$${j.summary.net_cost?.toFixed(2)}` : '—'}</td>
                    <td>{j.summary ? `${j.summary.peak_grid_import?.toFixed(1)}` : '—'}</td>
                    <td>{j.summary ? j.summary.total_reward?.toFixed(1) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{j.progress?.length || 0} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
