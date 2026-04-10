'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '@/components/Sidebar'
import { api, TrainConfig, JobStatus } from '@/lib/api'
import Link from 'next/link'
import { Cpu, Zap, TrendingUp, CheckCircle, AlertCircle, Loader, Info } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

const ALGORITHMS = [
  {
    id: 'sac', label: 'SAC', full: 'Soft Actor-Critic',
    color: 'var(--primary)', glow: 'var(--primary-glow)',
    desc: 'Off-policy continuous control. Best fine-grained battery dispatch. Maximizes entropy for robust exploration.',
    tags: ['Continuous', 'Off-policy', 'Best performance'],
    tagColors: ['var(--primary)', 'var(--text-muted)', 'var(--success)'],
    defaults: { learning_rate: 3e-4, batch_size: 256, gamma: 0.99 },
  },
  {
    id: 'ppo', label: 'PPO', full: 'Proximal Policy Optimization',
    color: 'var(--success)', glow: 'var(--success-glow)',
    desc: 'On-policy robust baseline. Stable training across diverse environments. Great for policy gradient benchmarking.',
    tags: ['Continuous', 'On-policy', 'Stable'],
    tagColors: ['var(--primary)', 'var(--text-muted)', 'var(--warning)'],
    defaults: { learning_rate: 3e-4, batch_size: 64, gamma: 0.99 },
  },
  {
    id: 'dqn', label: 'DQN', full: 'Deep Q-Network',
    color: 'var(--warning)', glow: 'var(--warning-glow)',
    desc: 'Off-policy discrete control. Uses 5-action space: full/partial charge, hold, partial/full discharge.',
    tags: ['Discrete (5)', 'Off-policy', 'Classic'],
    tagColors: ['var(--warning)', 'var(--text-muted)', 'var(--secondary)'],
    defaults: { learning_rate: 1e-4, batch_size: 64, gamma: 0.99 },
  },
]

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    idle:      { cls: 'badge-queued',    icon: null,                     label: 'Idle' },
    queued:    { cls: 'badge-queued',    icon: null,                     label: 'Queued' },
    running:   { cls: 'badge-running',   icon: <Loader size={10} style={{ animation: 'spin 1s linear infinite' }} />, label: 'Training' },
    completed: { cls: 'badge-completed', icon: <CheckCircle size={10} />, label: 'Completed' },
    failed:    { cls: 'badge-failed',    icon: <AlertCircle size={10} />, label: 'Failed' },
  }
  const c = cfg[status] || cfg.idle
  return <span className={`badge ${c.cls}`}>{c.icon}{c.label}</span>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Step {label?.toLocaleString()}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {Number(p.value).toFixed(2)}</div>
      ))}
    </div>
  )
}

export default function TrainPage() {
  const [selected, setSelected] = useState('sac')
  const [timesteps, setTimesteps] = useState(50000)
  const [lr, setLr] = useState(3e-4)
  const [batchSize, setBatchSize] = useState(256)
  const [gamma, setGamma] = useState(0.99)
  const [nSteps, setNSteps] = useState(2048)
  const [peakW, setPeakW] = useState(0.08)
  const [violW, setViolW] = useState(30.0)

  const [jobId, setJobId] = useState('')
  const [job, setJob] = useState<JobStatus | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [allJobs, setAllJobs] = useState<JobStatus[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const algo = ALGORITHMS.find(a => a.id === selected)!

  // Load previous jobs on mount
  useEffect(() => {
    api.listJobs().then(setAllJobs).catch(() => {})
  }, [])

  // Update defaults when algo changes
  useEffect(() => {
    setLr(algo.defaults.learning_rate)
    setBatchSize(algo.defaults.batch_size)
    setGamma(algo.defaults.gamma)
  }, [selected])

  async function handleStart() {
    setErrorMsg('')
    try {
      const config: TrainConfig = {
        algorithm: selected,
        total_timesteps: timesteps,
        learning_rate: lr,
        batch_size: batchSize,
        gamma,
        n_steps: nSteps,
        peak_penalty_weight: peakW,
        violation_penalty_weight: violW,
        degradation_weight: 0.005,
        renewable_bonus_weight: 0.02,
      }
      const res = await api.startTraining(config)
      setJobId(res.job_id)
      setJob({ job_id: res.job_id, algorithm: selected, status: 'queued', progress: [], model_path: null, summary: null, error: null })

      pollRef.current = setInterval(async () => {
        const s = await api.getJob(res.job_id)
        setJob(s)
        if (s.status === 'completed' || s.status === 'failed') {
          clearInterval(pollRef.current!)
          api.listJobs().then(setAllJobs).catch(() => {})
        }
      }, 2000)
    } catch (e: any) {
      setErrorMsg(e.message)
    }
  }

  const isRunning = job?.status === 'running' || job?.status === 'queued'
  const progress = job?.status === 'running' && timesteps > 0
    ? Math.min(100, ((job.progress?.at(-1)?.timestep || 0) / timesteps) * 100)
    : (job?.status === 'completed' ? 100 : 0)

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Train RL Agent <span className="gradient-text">{algo.label}</span></h1>
          <p>Select algorithm, configure hyperparameters, and watch the live reward curve.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Algorithm selector */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="section-title"><Cpu size={14} />Choose Algorithm</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {ALGORITHMS.map((a) => (
                  <div key={a.id} className={`algo-card glass ${selected === a.id ? 'selected' : ''}`}
                    onClick={() => setSelected(a.id)}
                    style={{ borderColor: selected === a.id ? a.color : 'var(--border)', boxShadow: selected === a.id ? `0 0 20px ${a.glow}` : 'none' }}>
                    <div className="algo-name" style={{ color: a.color }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>{a.full}</div>
                    <p className="algo-desc">{a.desc}</p>
                    <div className="algo-tags">
                      {a.tags.map((t, i) => (
                        <span key={t} className="algo-tag" style={{ background: `${a.tagColors[i]}18`, color: a.tagColors[i], border: `1px solid ${a.tagColors[i]}30` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hyperparameters */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="section-title"><Zap size={14} />Hyperparameters</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                <div className="field">
                  <label>Total Timesteps</label>
                  <input type="number" value={timesteps} min={1000} max={2000000} step={5000}
                    onChange={e => setTimesteps(Math.max(1000, +e.target.value))} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>1k–2M • ~2min per 50k</div>
                </div>
                <div className="field">
                  <label>Learning Rate</label>
                  <input type="number" value={lr} step={1e-5} min={1e-5} max={1e-2}
                    onChange={e => setLr(+e.target.value)} />
                </div>
                <div className="field">
                  <label>Batch Size</label>
                  <select value={batchSize} onChange={e => setBatchSize(+e.target.value)}>
                    {[32, 64, 128, 256, 512].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Discount (γ)</label>
                  <input type="number" value={gamma} min={0.9} max={0.999} step={0.001}
                    onChange={e => setGamma(+e.target.value)} />
                </div>
                {selected === 'ppo' && (
                  <div className="field">
                    <label>N Steps (PPO)</label>
                    <input type="number" value={nSteps} min={128} max={8192} step={128}
                      onChange={e => setNSteps(+e.target.value)} />
                  </div>
                )}
                <div className="field">
                  <label>Peak Penalty Weight</label>
                  <input type="number" value={peakW} min={0} max={1} step={0.01}
                    onChange={e => setPeakW(+e.target.value)} />
                </div>
                <div className="field">
                  <label>Violation Penalty</label>
                  <input type="number" value={violW} min={0} max={100} step={1}
                    onChange={e => setViolW(+e.target.value)} />
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn btn-primary" onClick={handleStart} disabled={isRunning}>
                  {isRunning ? <><span className="spinner" /> Training...</> : <><Cpu size={15} /> Start Training</>}
                </button>
                {job && <StatusBadge status={job.status} />}
                {errorMsg && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{errorMsg}</span>}
              </div>
            </div>

            {/* Live reward curve */}
            {job && (
              <div className="glass" style={{ padding: 24 }}>
                <div className="section-title"><TrendingUp size={14} />Live Training Reward</div>

                {/* Progress bar */}
                {isRunning && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>Timestep {(job.progress?.at(-1)?.timestep || 0).toLocaleString()} / {timesteps.toLocaleString()}</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {(job.progress || []).length === 0 ? (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    {isRunning ? 'Waiting for first checkpoint...' : 'No data yet'}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={job.progress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="timestep" tickFormatter={(v: number) => `${(v/1000).toFixed(0)}k`} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="mean_reward" stroke={algo.color} strokeWidth={2} dot={false} name="Mean Reward" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}

            {/* Post-training summary */}
            {job?.status === 'completed' && job.summary && (
              <div className="glass fade-in" style={{ padding: 24 }}>
                <div className="section-title"><CheckCircle size={14} color="var(--success)" />Training Complete — Evaluation Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {[
                    { label: 'Net Energy Cost', value: `$${job.summary.net_cost?.toFixed(2)}`, color: 'var(--danger)' },
                    { label: 'Peak Grid Import', value: `${job.summary.peak_grid_import?.toFixed(1)} kW`, color: 'var(--warning)' },
                    { label: 'Total Reward', value: job.summary.total_reward?.toFixed(1), color: 'var(--success)' },
                    { label: 'Avg SOC', value: `${job.summary.avg_soc_pct?.toFixed(1)}%`, color: 'var(--primary)' },
                    { label: 'Renewable Ratio', value: `${(job.summary.renewable_ratio * 100)?.toFixed(1)}%`, color: 'var(--success)' },
                    { label: 'Violations', value: `$${job.summary.total_violations?.toFixed(2)}`, color: 'var(--danger)' },
                  ].map(m => (
                    <div key={m.label} className="glass stat-card">
                      <div className="label">{m.label}</div>
                      <div className="value" style={{ fontSize: 20, color: m.color }}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 14, padding: '12px 16px', background: 'var(--success-glow)', borderRadius: 9, fontSize: 13, color: 'var(--success)', display: 'flex', gap: 8 }}>
                  <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  Model saved. Go to <strong>Compare</strong> to benchmark against other algorithms.
                </div>
              </div>
            )}

            {job?.status === 'failed' && (
              <div className="glass" style={{ padding: 20, border: '1px solid var(--danger)30', background: 'var(--danger-glow)' }}>
                <div style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Training Failed</div>
                <code style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{job.error}</code>
              </div>
            )}
          </div>

          {/* Right column — job history */}
          <div>
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div className="section-title" style={{ margin: 0 }}>Recent Jobs</div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{allJobs.length} total</span>
              </div>
              {allJobs.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>No jobs yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...allJobs].reverse().slice(0, 8).map(j => {
                    const a = ALGORITHMS.find(x => x.id === j.algorithm)
                    return (
                      <div key={j.job_id} style={{ position: 'relative' }}>
                        <Link 
                          href={`/jobs/${j.job_id}`} 
                          className="glass" 
                          style={{ 
                            display: 'block', padding: '16px', textDecoration: 'none', 
                            transition: 'all 0.2s', border: '1px solid transparent' 
                          }} 
                          onMouseEnter={e => e.currentTarget.style.borderColor = a?.color || 'rgba(255,255,255,0.2)'} 
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, color: a?.color || 'var(--text-primary)', fontSize: 16 }}>{j.algorithm?.toUpperCase()}</span>
                            <StatusBadge status={j.status} />
                          </div>
                          
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 12 }}>
                            Job ID: {j.job_id.slice(0, 18)}...
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, fontWeight: 600, color: a?.color || 'var(--primary)' }}>
                            <span>View Detailed Metrics ➔</span>
                            {j.config && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{(j.config.total_timesteps / 1000).toFixed(0)}k steps</span>}
                          </div>
                        </Link>
                        
                        <button
                          title="Remove from history"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await api.deleteJob(j.job_id)
                              setAllJobs(prev => prev.filter(x => x.job_id !== j.job_id))
                            } catch {}
                          }}
                          style={{ 
                            position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.2)', 
                            border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', 
                            color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, zIndex: 10 
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}

                </div>
              )}
            </div>


            {/* Quick reference */}
            <div className="glass" style={{ padding: 20, marginTop: 16 }}>
              <div className="section-title">Reward Function</div>
              <pre style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
{`r = -energy_cost
  + export_revenue
  - peak_penalty
  - degradation
  - soc_violation
  + renewable_bonus`}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
