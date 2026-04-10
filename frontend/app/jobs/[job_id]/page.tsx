'use client'
import { useState, useEffect, use } from 'react'
import Sidebar from '@/components/Sidebar'
import { api, JobStatus, StepData } from '@/lib/api'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import {
  Battery, Zap, DollarSign, TrendingUp, TrendingDown,
  Activity, Sun, Wind, AlertTriangle, CheckCircle,
  Cpu, ArrowLeft, RotateCcw, BarChart3
} from 'lucide-react'
import Link from 'next/link'

const ALGO_COLORS: Record<string, string> = {
  sac: '#00d4ff', ppo: '#10b981', dqn: '#f59e0b',
}

function MetricCard({
  label, value, sub, color, icon
}: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="glass stat-card" style={{ padding: 16 }}>
      <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon}{label}
      </div>
      <div className="value" style={{ fontSize: 22, color: color || 'var(--text-primary)', marginTop: 4 }}>{value}</div>
      {sub && <div className="sub" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function JobDetailPage({ params }: { params: Promise<{ job_id: string }> }) {
  const { job_id } = use(params)

  const [job, setJob] = useState<JobStatus | null>(null)
  const [steps, setSteps] = useState<StepData[]>([])
  const [loading, setLoading] = useState(true)
  const [evalLoading, setEvalLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'energy' | 'battery' | 'reward' | 'training'>('overview')

  async function loadJob() {
    try {
      const j = await api.getJob(job_id)
      setJob(j)
      return j
    } catch (e: any) {
      setError(e.message)
    }
    return null
  }

  async function loadSteps(j: JobStatus) {
    if (j.status !== 'completed') return
    try {
      const data = await api.getJobSteps(job_id)
      setSteps(data.steps || [])
      // Update job summary from live eval
      setJob(prev => prev ? { ...prev, summary: data.summary } : prev)
    } catch {}
  }

  async function handleEvaluate() {
    setEvalLoading(true)
    try {
      const data = await api.evaluateJob(job_id)
      setJob(prev => prev ? { ...prev, summary: data.summary } : prev)
      setSteps(data.steps || [])
    } catch (e: any) {
      setError(e.message)
    }
    setEvalLoading(false)
  }

  useEffect(() => {
    async function init() {
      setLoading(true)
      const j = await loadJob()
      if (j) await loadSteps(j)
      setLoading(false)
    }
    init()
  }, [job_id])

  const algoColor = ALGO_COLORS[job?.algorithm || ''] || 'var(--primary)'
  const s = job?.summary

  // Downsample steps for charts (max 200 points)
  const chartSteps = steps.length > 200 ? steps.filter((_, i) => i % Math.ceil(steps.length / 200) === 0) : steps

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 16px' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading job details...</div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>
            <AlertTriangle size={48} style={{ margin: '0 auto 16px', display: 'block' }} />
            <div>{error || 'Job not found'}</div>
            <Link href="/train" style={{ color: 'var(--primary)', marginTop: 16, display: 'inline-block' }}>← Back to Train</Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ padding: '24px 28px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Link href="/train" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 12 }}>
              <ArrowLeft size={14} /> Back to Training
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: `linear-gradient(135deg, ${algoColor}30, ${algoColor}10)`,
                border: `1px solid ${algoColor}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Cpu size={22} color={algoColor} />
              </div>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: algoColor, margin: 0 }}>
                  {job.algorithm.toUpperCase()} Training Run
                </h1>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'monospace' }}>
                  {job.job_id}
                </div>
              </div>
              <span className={`badge badge-${job.status}`} style={{ marginLeft: 8 }}>
                <CheckCircle size={10} />{job.status}
              </span>
            </div>
          </div>

          {/* Re-evaluate button */}
          {job.status === 'completed' && (
            <button className="btn btn-secondary" onClick={handleEvaluate} disabled={evalLoading} style={{ marginTop: 32 }}>
              {evalLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} />Evaluating...</> : <><RotateCcw size={14} />Re-evaluate</>}
            </button>
          )}
        </div>

        {/* ── Config bar ── */}
        <div className="glass" style={{ padding: '12px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[
            ['Algorithm', job.algorithm.toUpperCase()],
            ['Timesteps', job.config ? `${(job.config.total_timesteps / 1000).toFixed(0)}k` : '—'],
            ['Learning Rate', job.config?.learning_rate ?? '—'],
            ['Batch Size', job.config?.batch_size ?? '—'],
            ['Discount (γ)', job.config?.gamma ?? '—'],
            ['Progress Points', job.progress?.length ?? 0],
            ['Model Path', job.model_path ? job.model_path.split('\\').slice(-2).join('/') : 'none'],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{String(v)}</div>
            </div>
          ))}
        </div>

        {/* ── No summary warning + auto-evaluate prompt ── */}
        {!s && job.status === 'completed' && steps.length === 0 && (
          <div style={{ marginBottom: 20, padding: '14px 20px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <div style={{ flex: 1, fontSize: 13 }}>
              <strong style={{ color: '#f59e0b' }}>Metrics not yet computed.</strong>
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>This job was trained before automatic evaluation was added. Click Re-evaluate to compute all metrics now.</span>
            </div>
            <button className="btn btn-primary" onClick={handleEvaluate} disabled={evalLoading} style={{ padding: '8px 18px', whiteSpace: 'nowrap' }}>
              {evalLoading ? 'Computing...' : '⚡ Compute Metrics'}
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)', width: 'fit-content' }}>
          {([
            { k: 'overview', label: '📊 Overview' },
            { k: 'energy', label: '⚡ Energy' },
            { k: 'battery', label: '🔋 Battery & SOC' },
            { k: 'reward', label: '🎯 Reward' },
            { k: 'training', label: '📈 Training Curve' },
          ] as const).map(t => (
            <button key={t.k} onClick={() => setActiveTab(t.k)} style={{
              padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: activeTab === t.k ? algoColor : 'transparent',
              color: activeTab === t.k ? '#000' : 'var(--text-secondary)',
              transition: 'all 0.15s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ══ TAB: OVERVIEW ══ */}
        {activeTab === 'overview' && (
          <div>
            {s ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                  <MetricCard label="Total Reward" value={s.total_reward?.toFixed(2) ?? '—'} color={s.total_reward >= 0 ? '#10b981' : '#ef4444'} icon={<TrendingUp size={12} />} sub="Sum over all steps" />
                  <MetricCard label="Net Energy Cost" value={`$${s.net_cost?.toFixed(2)}`} color="#ef4444" icon={<DollarSign size={12} />} sub="Cost − Export revenue" />
                  <MetricCard label="Peak Grid Import" value={`${s.peak_grid_import?.toFixed(1)} kW`} color="#f59e0b" icon={<Zap size={12} />} sub="Worst single-hour demand" />
                  <MetricCard label="Avg SOC" value={`${s.avg_soc_pct?.toFixed(1)}%`} color="#00d4ff" icon={<Battery size={12} />} sub="Mean battery level" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                  <MetricCard label="Total Energy Cost" value={`$${s.total_energy_cost?.toFixed(2)}`} color="#f97316" icon={<DollarSign size={12} />} sub="Grid import cost" />
                  <MetricCard label="Export Revenue" value={`$${s.total_export_revenue?.toFixed(2)}`} color="#10b981" icon={<TrendingUp size={12} />} sub="Sold back to grid" />
                  <MetricCard label="SOC Violations" value={`$${s.total_violations?.toFixed(3)}`} color={s.total_violations > 0 ? '#ef4444' : '#10b981'} icon={<AlertTriangle size={12} />} sub="Outside SOC limits" />
                  <MetricCard label="Renewable Ratio" value={`${(s.renewable_ratio * 100)?.toFixed(1)}%`} color="#10b981" icon={<Sun size={12} />} sub="Solar+Wind / Load" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                  <MetricCard label="Battery Degradation" value={`$${s.total_degradation?.toFixed(3)}`} color="#f59e0b" icon={<Battery size={12} />} sub="Wear from cycling" />
                  <MetricCard label="Avg Grid Import" value={`${s.avg_grid_import?.toFixed(1)} kW`} color="#7c3aed" icon={<Activity size={12} />} sub="Per-hour average" />
                  <MetricCard label="Evaluation Steps" value={s.steps?.toFixed(0) ?? steps.length} color="var(--text-primary)" icon={<BarChart3 size={12} />} sub="14-day test period" />
                </div>

                {/* Snapshot chart: cumulative cost */}
                {steps.length > 0 && (
                  <div className="glass" style={{ padding: 20 }}>
                    <div className="section-title"><TrendingDown size={14} /> Cumulative Net Cost over Evaluation Period</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={(() => {
                        let cum = 0
                        return chartSteps.map(st => ({ t: st.t, cum: (cum += (st.energy_cost - st.export_revenue)), price: st.price * 100 }))
                      })()}>
                        <defs>
                          <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} label={{ value: 'Hour', position: 'insideBottom', offset: -3, fill: '#475569', fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                        <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                          formatter={(v: number, name: string) => name === 'cum' ? [`$${v.toFixed(2)}`, 'Cumulative Cost'] : [`${v.toFixed(2)}¢/kWh`, 'Price']} />
                        <Area type="monotone" dataKey="cum" stroke="#ef4444" fill="url(#costGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            ) : (
              <div className="glass empty-state" style={{ padding: 60 }}>
                <div className="icon">📊</div>
                <h3>No Metrics Available</h3>
                <p>Click <strong>Re-evaluate</strong> above to compute all performance metrics for this trained model.</p>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: ENERGY ══ */}
        {activeTab === 'energy' && steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="section-title"><Activity size={14} /> Load, Solar, Wind & Grid Import (kW)</div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartSteps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} label={{ value: 'Hour', position: 'insideBottom', offset: -4, fill: '#475569', fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number, name: string) => [`${v.toFixed(2)} kW`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="load" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Load" />
                  <Line type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Solar" />
                  <Line type="monotone" dataKey="wind" stroke="#00d4ff" strokeWidth={1.5} dot={false} name="Wind" />
                  <Line type="monotone" dataKey="grid_import_kw" stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Grid Import" />
                  <Line type="monotone" dataKey="grid_export_kw" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Grid Export" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title"><DollarSign size={14} /> Electricity Price ($/kWh)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartSteps}>
                    <defs>
                      <linearGradient id="priceG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} domain={[0.05, 0.38]} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`$${v.toFixed(3)}/kWh`, 'Price']} />
                    <ReferenceLine y={0.22} stroke="#ef4444" strokeDasharray="3 2" label={{ value: 'Peak $0.22', fill: '#ef4444', fontSize: 9 }} />
                    <ReferenceLine y={0.15} stroke="#f59e0b" strokeDasharray="3 2" label={{ value: 'Shoulder', fill: '#f59e0b', fontSize: 9 }} />
                    <Area type="monotone" dataKey="price" stroke="#f59e0b" fill="url(#priceG)" strokeWidth={2} dot={false} name="Price" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title"><DollarSign size={14} /> Energy Cost per Step ($)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartSteps}>
                    <defs>
                      <linearGradient id="ecostG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={(v: number) => `$${v.toFixed(1)}`} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, n: string) => [`$${v.toFixed(3)}`, n]} />
                    <Area type="monotone" dataKey="energy_cost" stroke="#f97316" fill="url(#ecostG)" strokeWidth={1.5} dot={false} name="Energy Cost" />
                    <Area type="monotone" dataKey="export_revenue" stroke="#10b981" fill="none" strokeWidth={1.5} dot={false} name="Export Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: BATTERY ══ */}
        {activeTab === 'battery' && steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="section-title"><Battery size={14} /> Battery SOC (%) over Evaluation Period</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartSteps}>
                  <defs>
                    <linearGradient id="socG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} label={{ value: 'Hour', position: 'insideBottom', offset: -4, fill: '#475569', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`${v.toFixed(1)}%`, 'SOC']} />
                  <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Min 10%', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }} />
                  <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: 'Max 95%', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
                  <Area type="monotone" dataKey="soc_pct" stroke="#10b981" fill="url(#socG)" strokeWidth={2} dot={false} name="SOC %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title"><Zap size={14} /> Battery Power (kW) — Positive=Discharge</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartSteps}>
                    <defs>
                      <linearGradient id="battG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v.toFixed(2)} kW`, 'Battery Power']} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                    <Area type="monotone" dataKey="battery_power_kw" stroke="#7c3aed" fill="url(#battG)" strokeWidth={1.5} dot={false} name="Battery Power" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title"><Zap size={14} /> Daily Peak Grid Import (kW)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartSteps}>
                    <defs>
                      <linearGradient id="peakG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [`${v.toFixed(1)} kW`, 'Daily Peak']} />
                    <Area type="monotone" dataKey="daily_peak" stroke="#f97316" fill="url(#peakG)" strokeWidth={1.5} dot={false} name="Daily Peak" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: REWARD ══ */}
        {activeTab === 'reward' && steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="section-title"><TrendingUp size={14} /> Per-Step Reward</div>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartSteps}>
                  <defs>
                    <linearGradient id="rewG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                  <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [v.toFixed(4), 'Reward']} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                  <Area type="monotone" dataKey="reward" stroke="#10b981" fill="url(#rewG)" strokeWidth={2} dot={false} name="Reward" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title">Agent Action over Time</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartSteps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis domain={[-1.1, 1.1]} tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [v.toFixed(3), 'Action (–=charge, +=discharge)']} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Line type="monotone" dataKey="action" stroke={algoColor} strokeWidth={1.5} dot={false} name="Action" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title">Renewable Generation vs Load (kW)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartSteps}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="renewable_gen_kw" stroke="#10b981" fill="#10b98120" strokeWidth={1.5} dot={false} name="Renewables" />
                    <Line type="monotone" dataKey="load" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Load" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: TRAINING CURVE ══ */}
        {activeTab === 'training' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="section-title"><TrendingUp size={14} /> Training Reward Curve</div>
              {(job.progress || []).length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No training checkpoints recorded</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={job.progress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="timestep" tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#475569' }} label={{ value: 'Timestep', position: 'insideBottom', offset: -4, fill: '#475569', fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                    <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number, name: string) => [v.toFixed(2), name === 'mean_reward' ? 'Mean Reward' : 'Std Reward']} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="mean_reward" stroke={algoColor} strokeWidth={2.5} dot={{ r: 3, fill: algoColor }} name="Mean Reward" />
                    <Line type="monotone" dataKey="std_reward" stroke="rgba(255,255,255,0.2)" strokeWidth={1} dot={false} strokeDasharray="4 2" name="Std Dev" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Training stats table */}
            <div className="glass" style={{ padding: 20 }}>
              <div className="section-title">Training Checkpoints</div>
              {(job.progress || []).length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Timestep</th><th>Mean Reward</th><th>Std Dev</th><th>Δ Reward</th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.progress.map((p, i) => {
                        const prev = job.progress[i - 1]
                        const delta = prev ? p.mean_reward - prev.mean_reward : null
                        return (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{i + 1}</td>
                            <td><code style={{ fontSize: 12 }}>{p.timestep.toLocaleString()}</code></td>
                            <td style={{ color: p.mean_reward >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{p.mean_reward.toFixed(2)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{p.std_reward.toFixed(2)}</td>
                            <td style={{ color: delta === null ? 'var(--text-muted)' : delta >= 0 ? '#10b981' : '#ef4444' }}>
                              {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>No checkpoints available</div>
              )}
            </div>
          </div>
        )}

        {/* Prompt to switch tab when steps are empty */}
        {(activeTab === 'energy' || activeTab === 'battery' || activeTab === 'reward') && steps.length === 0 && (
          <div className="glass empty-state" style={{ padding: 60 }}>
            <div className="icon">📉</div>
            <h3>No Evaluation Data</h3>
            <p>Click <strong>Re-evaluate</strong> to run the trained model on the test dataset and generate step-by-step metrics.</p>
            <button className="btn btn-primary" onClick={handleEvaluate} disabled={evalLoading}>
              {evalLoading ? 'Running...' : '⚡ Run Evaluation'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
