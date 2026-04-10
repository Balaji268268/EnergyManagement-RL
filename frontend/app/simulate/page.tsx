'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { api, StepData, ModelMeta } from '@/lib/api'
import { Play, Battery, Sun, Wind, Zap, TrendingUp } from 'lucide-react'
import {
  ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'

const ALGOS = [
  { id: 'rule_based', label: 'Rule-Based', color: '#7c3aed', noModel: true },
  { id: 'naive',      label: 'Naive (Hold)', color: '#475569', noModel: true },
  { id: 'sac',        label: 'SAC',       color: '#00d4ff', noModel: false },
  { id: 'ppo',        label: 'PPO',       color: '#10b981', noModel: false },
  { id: 'dqn',        label: 'DQN',       color: '#f59e0b', noModel: false },
]

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'rgba(13,27,46,0.97)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Step {label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color || p.fill }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</strong></div>
      ))}
    </div>
  )
}

function SummaryCard({ steps }: { steps: StepData[] }) {
  if (!steps?.length) return null
  const totalCost = steps.reduce((s, r) => s + r.energy_cost, 0)
  const totalRev = steps.reduce((s, r) => s + r.export_revenue, 0)
  const peakImport = Math.max(...steps.map(r => r.grid_import_kw))
  const avgSoc = steps.reduce((s, r) => s + r.soc_pct, 0) / steps.length
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 16 }}>
      {[
        { label: 'Total Cost',    value: `$${totalCost.toFixed(2)}`,    color: 'var(--danger)' },
        { label: 'Export Revenue',value: `$${totalRev.toFixed(2)}`,     color: 'var(--success)' },
        { label: 'Peak Import',   value: `${peakImport.toFixed(1)} kW`, color: 'var(--warning)' },
        { label: 'Avg SOC',       value: `${avgSoc.toFixed(1)}%`,       color: 'var(--primary)' },
      ].map(m => (
        <div key={m.label} className="glass stat-card">
          <div className="label">{m.label}</div>
          <div className="value" style={{ fontSize: 20, color: m.color }}>{m.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function SimulatePage() {
  const [selectedAlgo, setSelectedAlgo] = useState('rule_based')
  const [modelPath, setModelPath] = useState('')
  const [days, setDays] = useState(3)
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<StepData[]>([])
  const [error, setError] = useState('')

  const selectedDef = ALGOS.find(a => a.id === selectedAlgo)!

  async function handleSimulate() {
    setError('')
    setLoading(true)
    setSteps([])
    try {
      const res = await api.simulate({
        algorithm: selectedAlgo,
        model_path: modelPath || undefined,
        days,
        seed: 99,
      })
      setSteps(res.steps)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Downsample for chart performance
  const chartData = steps.length > 200
    ? steps.filter((_, i) => i % Math.ceil(steps.length / 200) === 0)
    : steps

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1>Energy <span className="gradient-text">Simulation</span></h1>
          <p>Visualize battery dispatch, energy flows, and costs over a selected period.</p>
        </div>

        {/* Config */}
        <div className="glass" style={{ padding: 24, marginBottom: 24 }}>
          <div className="section-title"><Zap size={14} />Simulation Configuration</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) auto', gap: 16, alignItems: 'end' }}>
            <div className="field">
              <label>Policy</label>
              <select value={selectedAlgo} onChange={e => { setSelectedAlgo(e.target.value); setModelPath('') }}>
                {ALGOS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            {!selectedDef.noModel && (
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Model Path (.zip)</label>
                <input type="text" value={modelPath} placeholder="models/JOB_ID/sac_model.zip"
                  onChange={e => setModelPath(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label>Days</label>
              <select value={days} onChange={e => setDays(+e.target.value)}>
                {[1, 3, 7, 14].map(d => <option key={d} value={d}>{d} day{d > 1 ? 's' : ''}</option>)}
              </select>
            </div>
            <button className="btn btn-success" onClick={handleSimulate} disabled={loading}>
              {loading ? <span className="spinner" /> : <Play size={15} />}
              {loading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
          {error && <div style={{ marginTop: 12, color: 'var(--danger)', fontSize: 13 }}>{error}</div>}
        </div>

        {loading && (
          <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 14px' }} />
            <div style={{ fontWeight: 600 }}>Running simulation...</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{days} days × 24 steps = {days * 24} timesteps</div>
          </div>
        )}

        {steps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <SummaryCard steps={steps} />

            {/* Energy flow chart */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="section-title"><Sun size={14} />Energy Flow (Load · Solar · Wind · Battery · Grid Import)</div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" label={{ value: 'Timestep', position: 'insideBottom', offset: -5, fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit=" kW" />
                  <Tooltip content={<Tip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="load" fill="#ef444420" stroke="#ef4444" strokeWidth={1.5} name="Load" dot={false} />
                  <Area type="monotone" dataKey="solar" fill="#f59e0b20" stroke="#f59e0b" strokeWidth={1.5} name="Solar" dot={false} />
                  <Area type="monotone" dataKey="wind" fill="#10b98120" stroke="#10b981" strokeWidth={1.5} name="Wind" dot={false} />
                  <Line type="monotone" dataKey="grid_import_kw" stroke="#00d4ff" strokeWidth={2} dot={false} name="Grid Import" />
                  <Line type="monotone" dataKey="battery_power_kw" stroke="#7c3aed" strokeWidth={1.5} dot={false} name="Battery Power" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* SOC + Price row */}
            <div className="grid-2">
              <div className="glass" style={{ padding: 24 }}>
                <div className="section-title"><Battery size={14} />Battery State of Charge (%)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit="%" domain={[0, 100]} />
                    <Tooltip content={<Tip />} />
                    <ReferenceLine y={10} stroke="var(--danger)" strokeDasharray="4 4" label={{ value: 'Min 10%', fill: 'var(--danger)', fontSize: 10 }} />
                    <ReferenceLine y={95} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'Max 95%', fill: 'var(--warning)', fontSize: 10 }} />
                    <Area type="monotone" dataKey="soc_pct" stroke={selectedDef.color} fill={`${selectedDef.color}25`} strokeWidth={2} dot={false} name="SOC %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="glass" style={{ padding: 24 }}>
                <div className="section-title"><TrendingUp size={14} />Electricity Price ($/kWh) & Cost</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                    <YAxis yAxisId="price" tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit=" $/kWh" />
                    <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 10 }} stroke="var(--text-muted)" unit=" $" />
                    <Tooltip content={<Tip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="price" type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={2} dot={false} name="Price" />
                    <Bar yAxisId="cost" dataKey="energy_cost" fill="#ef444430" name="Cost" radius={[2,2,0,0]} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Action histogram */}
            <div className="glass" style={{ padding: 24 }}>
              <div className="section-title">Battery Action Over Time (+1=Discharge, -1=Charge)</div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="var(--text-muted)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="var(--text-muted)" domain={[-1.1, 1.1]} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                  <Bar dataKey="action" fill={selectedDef.color} opacity={0.7} name="Action" radius={[2,2,0,0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {steps.length === 0 && !loading && (
          <div className="empty-state glass" style={{ padding: 60 }}>
            <Play size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <h3>No Simulation Data</h3>
            <p>Select a policy above and click Run Simulation. Rule-Based and Naive don't require a trained model.</p>
          </div>
        )}
      </main>
    </div>
  )
}
