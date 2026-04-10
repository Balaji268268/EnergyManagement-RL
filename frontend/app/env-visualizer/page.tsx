'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  Play, Pause, RotateCcw, StepForward, Zap, Battery,
  Sun, Wind, TrendingUp, TrendingDown, Minus, AlertTriangle,
  DollarSign, Activity, Cpu, Info
} from 'lucide-react'

// ─── Synthetic data generator (mirrors Python data_utils.py) ────────────────
function generateData(days = 7, seed = 42) {
  // Simple seeded random
  let s = seed
  const rand = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
  const randn = () => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

  const hours = days * 24
  const rows = []

  let windNoise = randn() * 2
  for (let i = 0; i < hours; i++) {
    const h = i % 24
    const dow = Math.floor(i / 24) % 7

    // Load
    const baseLoad = 50 + 8 * Math.sin(2 * Math.PI * (h - 7) / 24)
    const eveningPeak = 15 * Math.exp(-Math.pow(h - 19, 2) / 8)
    const morningPeak = 8 * Math.exp(-Math.pow(h - 8, 2) / 6)
    const weekFactor = dow < 5 ? 1.0 : 0.75
    const load = Math.max(20, Math.min(120, (baseLoad + eveningPeak + morningPeak) * weekFactor + randn() * 2.5))

    // Solar
    const solarBase = Math.max(0, Math.sin(Math.PI * (h - 6) / 12))
    const cloudFactor = Math.max(0.3, Math.min(1.0, 1.0 - 0.4 * rand()))
    const solar = Math.max(0, 25 * solarBase * cloudFactor + randn() * 0.5)

    // Wind
    const windBase = 8 + 4 * Math.cos(2 * Math.PI * h / 24 + Math.PI)
    windNoise = 0.85 * windNoise + randn()
    const wind = Math.max(0, Math.min(30, windBase + windNoise))

    // Price (Time-of-Use)
    let priceBase = 0.10
    if (h >= 17 && h <= 22) priceBase = 0.22
    else if (h >= 9 && h < 17) priceBase = 0.15
    const price = Math.max(0.05, Math.min(0.35, priceBase + (rand() - 0.5) * 0.03 + 0.03 * (load / 120)))

    rows.push({ t: i, hour: h, day: Math.floor(i / 24), load, solar, wind, price })
  }
  return rows
}

// ─── Env constants ────────────────────────────────────────────────────────────
const CAPACITY = 100
const MAX_CHARGE = 25
const MAX_DISCHARGE = 25
const CHARGE_EFF = 0.95
const DISCHARGE_EFF = 0.95
const SOC_MIN = 10  // 10 kWh = 10%
const SOC_MAX = 95  // 95 kWh = 95%
const PEAK_W = 0.08
const VIOL_W = 30.0
const DEG_W = 0.005
const RENEW_W = 0.02

const DISCRETE_ACTIONS = [
  { label: 'Full Charge',      value: -1.0,  color: '#00d4ff' },
  { label: 'Partial Charge',   value: -0.5,  color: '#7c3aed' },
  { label: 'Hold',             value:  0.0,  color: '#94a3b8' },
  { label: 'Partial Discharge',value:  0.5,  color: '#f59e0b' },
  { label: 'Full Discharge',   value:  1.0,  color: '#ef4444' },
]

// ─── Step physics ─────────────────────────────────────────────────────────────
function stepEnv(row: Record<string,number>, soc: number, prevSoc: number, action: number, dailyPeak: number) {
  const a = Math.max(-1, Math.min(1, action))
  let newSoc = soc

  if (a < 0) {
    const deltaKwh = Math.abs(a) * MAX_CHARGE * 1 * CHARGE_EFF
    newSoc = Math.min(soc + deltaKwh, CAPACITY)
  } else {
    const deltaKwh = a * MAX_DISCHARGE * 1 / DISCHARGE_EFF
    newSoc = Math.max(soc - deltaKwh, 0)
  }

  let violation = 0
  if (newSoc < SOC_MIN) { violation += SOC_MIN - newSoc; newSoc = SOC_MIN }
  if (newSoc > SOC_MAX) { violation += newSoc - SOC_MAX; newSoc = SOC_MAX }

  const actualDelta = newSoc - soc
  const batteryPow = -actualDelta / 1

  const { load, solar, wind, price } = row
  const renewable = solar + wind
  const netLoad = load - renewable - batteryPow
  const gridImport = Math.max(netLoad, 0)
  const gridExport = Math.max(-netLoad, 0)

  const newPeak = Math.max(dailyPeak, gridImport)
  const renewableUsed = Math.min(renewable, load)
  const renewableRatio = renewableUsed / (load + 1e-6)

  const energyCost = gridImport * price
  const exportRev = gridExport * price * 0.5
  const peakPenalty = PEAK_W * newPeak
  const degradation = DEG_W * Math.abs(actualDelta)
  const violCost = VIOL_W * violation
  const renewBonus = RENEW_W * renewableRatio

  const reward = -energyCost + exportRev - peakPenalty - degradation - violCost + renewBonus

  return {
    newSoc,
    newPeak,
    batteryPow,
    gridImport,
    gridExport,
    energyCost,
    exportRev,
    peakPenalty,
    degradation,
    violCost,
    renewBonus,
    reward,
    renewableRatio,
    renewable,
  }
}

// ─── Auto-policy (simple heuristic for demo) ─────────────────────────────────
function heuristicAction(row: Record<string,number>, soc: number, envType: string): number {
  const { price, solar, wind, load } = row
  const renewable = solar + wind
  const netLoad = load - renewable
  const socPct = soc / CAPACITY

  if (envType === 'discrete') {
    // DQN discrete: pick from 0-4
    if (price <= 0.10 && socPct < 0.85) return 0   // Cheap → full charge
    if (price <= 0.13 && socPct < 0.70) return 1   // Cheap-ish → partial charge
    if (price >= 0.20 && socPct > 0.30) return 4   // Expensive → full discharge
    if (price >= 0.16 && socPct > 0.40) return 3   // Pricey → partial discharge
    return 2  // Hold
  } else {
    // Continuous: smooth charge/discharge
    if (price <= 0.10 && socPct < 0.85) return -1.0 * (1 - socPct / 0.85)
    if (price <= 0.14 && renewable > load * 0.6 && socPct < 0.9) return -0.6
    if (price >= 0.22 && socPct > 0.3) return 1.0 * (socPct - 0.3) / 0.65
    if (price >= 0.16 && socPct > 0.5) return 0.5
    return 0.05 * netLoad / 50  // small correction
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnvVisualizer() {
  const [envType, setEnvType] = useState<'continuous' | 'discrete'>('continuous')
  const [data] = useState(() => generateData(7, 42))
  const [step, setStep] = useState(0)
  const [soc, setSoc] = useState(50)
  const [prevSoc, setPrevSoc] = useState(50)
  const [dailyPeak, setDailyPeak] = useState(0)
  const [history, setHistory] = useState<Record<string, number>[]>([])
  const [cumulativeReward, setCumulativeReward] = useState(0)
  const [cumulativeCost, setCumulativeCost] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(800) // ms per step
  const [manualAction, setManualAction] = useState(0)
  const [policyMode, setPolicyMode] = useState<'auto' | 'manual'>('auto')
  const [lastResult, setLastResult] = useState<ReturnType<typeof stepEnv> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const maxSteps = data.length - 1

  const getAction = useCallback(() => {
    if (policyMode === 'manual') {
      if (envType === 'discrete') return DISCRETE_ACTIONS[manualAction].value
      return manualAction / 2  // -2..2 → -1..1
    }
    const row = data[step]
    if (envType === 'discrete') {
      const di = heuristicAction(row, soc, 'discrete')
      return DISCRETE_ACTIONS[di].value
    }
    return heuristicAction(row, soc, 'continuous')
  }, [policyMode, manualAction, envType, data, step, soc])

  const doStep = useCallback(() => {
    if (step >= maxSteps) { setPlaying(false); return }

    const row = data[step]
    const action = getAction()

    // Reset daily peak at midnight
    const dp = (step > 0 && step % 24 === 0) ? 0 : dailyPeak

    const result = stepEnv(row, soc, prevSoc, action, dp)
    setLastResult(result)

    const entry = {
      t: step,
      hour: row.hour,
      soc: result.newSoc,
      socPct: result.newSoc / CAPACITY * 100,
      load: row.load,
      solar: row.solar,
      wind: row.wind,
      price: row.price,
      gridImport: result.gridImport,
      gridExport: result.gridExport,
      reward: result.reward,
      energyCost: result.energyCost,
      renewableRatio: result.renewableRatio * 100,
      action,
    }

    setHistory(h => [...h.slice(-47), entry])
    setCumulativeReward(r => r + result.reward)
    setCumulativeCost(c => c + result.energyCost - result.exportRev)
    setPrevSoc(soc)
    setSoc(result.newSoc)
    setDailyPeak(result.newPeak)
    setStep(s => s + 1)
  }, [step, maxSteps, data, soc, prevSoc, dailyPeak, getAction])

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(doStep, speed)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [playing, doStep, speed])

  const reset = () => {
    setPlaying(false)
    setStep(0); setSoc(50); setPrevSoc(50); setDailyPeak(0)
    setHistory([]); setCumulativeReward(0); setCumulativeCost(0)
    setLastResult(null)
  }

  const row = data[Math.min(step, maxSteps - 1)]
  const socPct = soc / CAPACITY * 100
  const socColor = socPct < 15 ? '#ef4444' : socPct < 30 ? '#f59e0b' : '#10b981'

  // Current action info
  const curActionVal = policyMode === 'auto'
    ? (envType === 'discrete' ? DISCRETE_ACTIONS[heuristicAction(row, soc, 'discrete')].value : heuristicAction(row, soc, 'continuous'))
    : (envType === 'discrete' ? DISCRETE_ACTIONS[manualAction].value : manualAction / 2)

  const actionLabel = envType === 'discrete'
    ? (DISCRETE_ACTIONS.find(a => a.value === curActionVal) || DISCRETE_ACTIONS[2]).label
    : curActionVal < -0.1 ? `Charging (${Math.abs(curActionVal * 100).toFixed(0)}%)`
      : curActionVal > 0.1 ? `Discharging (${(curActionVal * 100).toFixed(0)}%)`
      : 'Holding'

  const priceColor = row.price >= 0.20 ? '#ef4444' : row.price >= 0.15 ? '#f59e0b' : '#10b981'

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 className="gradient-text" style={{ fontSize: 24, fontWeight: 800 }}>
              🔋 Environment Visualizer
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
              Watch the microgrid simulation step-by-step — SOC, prices, energy flows and reward calculations
            </p>
          </div>
          {/* Env Type Toggle */}
          <div style={{ display: 'flex', gap: 8, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            {(['continuous', 'discrete'] as const).map(t => (
              <button key={t} onClick={() => { setEnvType(t); reset() }} style={{
                padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: envType === t ? (t === 'continuous' ? 'var(--primary)' : 'var(--warning)') : 'transparent',
                color: envType === t ? '#000' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
                {t === 'continuous' ? '🌊 SAC/PPO (Continuous)' : '🎯 DQN (Discrete)'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Controls Row ── */}
        <div className="glass" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => setPlaying(p => !p)} disabled={step >= maxSteps} style={{ padding: '8px 18px' }}>
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button className="btn btn-secondary" onClick={doStep} disabled={playing || step >= maxSteps} style={{ padding: '8px 14px' }}>
              <StepForward size={15} /> Step
            </button>
            <button className="btn btn-secondary" onClick={reset} style={{ padding: '8px 14px' }}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          {/* Speed */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: 13 }}>
            <span>Speed:</span>
            {[{ l: '0.5×', v: 1600 }, { l: '1×', v: 800 }, { l: '2×', v: 400 }, { l: '5×', v: 160 }].map(s => (
              <button key={s.v} onClick={() => setSpeed(s.v)} style={{
                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer',
                background: speed === s.v ? 'var(--primary)' : 'transparent',
                color: speed === s.v ? '#000' : 'var(--text-secondary)',
              }}>{s.l}</button>
            ))}
          </div>

          {/* Policy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', fontSize: 13 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Policy:</span>
            {(['auto', 'manual'] as const).map(p => (
              <button key={p} onClick={() => setPolicyMode(p)} style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer',
                background: policyMode === p ? 'var(--secondary)' : 'transparent',
                color: policyMode === p ? '#fff' : 'var(--text-secondary)',
              }}>{p === 'auto' ? '🤖 Auto (Heuristic)' : '🎮 Manual'}</button>
            ))}
          </div>

          {/* Step counter */}
          <div style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>Hour {step}</span>
            <span> / {maxSteps}</span>
            &nbsp;•&nbsp;Day {Math.floor(step / 24) + 1}
          </div>
        </div>

        {/* ── Manual Action Control ── */}
        {policyMode === 'manual' && (
          <div className="glass" style={{ padding: '14px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              🎮 Manual Action Control
            </div>
            {envType === 'discrete' ? (
              <div style={{ display: 'flex', gap: 10 }}>
                {DISCRETE_ACTIONS.map((a, i) => (
                  <button key={i} onClick={() => setManualAction(i)} style={{
                    padding: '8px 16px', borderRadius: 8, border: `2px solid ${manualAction === i ? a.color : 'var(--border)'}`,
                    background: manualAction === i ? `${a.color}20` : 'transparent',
                    color: manualAction === i ? a.color : 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                  }}>{a.label}</button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                <span style={{ color: '#00d4ff', fontSize: 13, width: 120 }}>Charge (−1.0)</span>
                <input type="range" min={-20} max={20} value={manualAction}
                  onChange={e => setManualAction(parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--primary)' }} />
                <span style={{ color: '#ef4444', fontSize: 13, width: 140, textAlign: 'right' }}>Discharge (+1.0)</span>
                <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 16, width: 60, textAlign: 'center' }}>
                  {(manualAction / 20).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── TOP SECTION: Grid Flow Diagram + Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Energy Flow Diagram */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title"><Activity size={14} /> Live Energy Flow</div>
            <EnergyFlowDiagram
              load={row.load}
              solar={row.solar}
              wind={row.wind}
              soc={soc}
              socPct={socPct}
              gridImport={lastResult?.gridImport ?? 0}
              gridExport={lastResult?.gridExport ?? 0}
              batteryPow={lastResult?.batteryPow ?? 0}
              renewable={lastResult?.renewable ?? (row.solar + row.wind)}
            />
          </div>

          {/* Key Metrics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* SOC Bar */}
            <div className="glass" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Battery size={16} color={socColor} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Battery SOC</span>
                </div>
                <span style={{ fontSize: 22, fontWeight: 800, color: socColor }}>{socPct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: `${SOC_MIN}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ position: 'absolute', left: `${SOC_MAX}%`, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div style={{ height: '100%', width: `${socPct}%`, background: `linear-gradient(90deg, ${socColor}, ${socColor}cc)`, borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Min 10%</span>
                <span>{soc.toFixed(1)} kWh / {CAPACITY} kWh</span>
                <span>Max 95%</span>
              </div>
              {socPct <= 15 && <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', color: '#ef4444', fontSize: 12 }}><AlertTriangle size={12} /> Critical — charge immediately!</div>}
            </div>

            {/* Price & Action */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="glass stat-card" style={{ padding: 14 }}>
                <div className="label"><DollarSign size={11} />Price</div>
                <div className="value" style={{ fontSize: 24, color: priceColor }}>${row.price.toFixed(3)}</div>
                <div className="sub">per kWh •&nbsp;
                  <span style={{ color: priceColor }}>
                    {row.price >= 0.20 ? '🔴 Peak' : row.price >= 0.15 ? '🟡 Shoulder' : '🟢 Off-peak'}
                  </span>
                </div>
              </div>
              <div className="glass stat-card" style={{ padding: 14 }}>
                <div className="label"><Cpu size={11} />Action</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: curActionVal < -0.05 ? '#00d4ff' : curActionVal > 0.05 ? '#f59e0b' : '#94a3b8' }}>
                  {actionLabel}
                </div>
                <div className="sub" style={{ marginTop: 4 }}>raw: {curActionVal.toFixed(2)}</div>
              </div>
            </div>

            {/* Reward breakdown */}
            {lastResult && (
              <div className="glass" style={{ padding: 14 }}>
                <div className="section-title" style={{ marginBottom: 10, fontSize: 12 }}>Reward Breakdown (last step)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: '−Energy Cost', val: -lastResult.energyCost, color: '#ef4444' },
                    { label: '+Export Revenue', val: lastResult.exportRev, color: '#10b981' },
                    { label: '−Peak Penalty', val: -lastResult.peakPenalty, color: '#f59e0b' },
                    { label: '−Degradation', val: -lastResult.degradation, color: '#f97316' },
                    { label: '−Violation', val: -lastResult.violCost, color: '#ef4444' },
                    { label: '+Renewable Bonus', val: lastResult.renewBonus, color: '#10b981' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span style={{ fontWeight: 600, color: item.color }}>{item.val >= 0 ? '+' : ''}{item.val.toFixed(4)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                    <span>= Total Reward</span>
                    <span style={{ color: lastResult.reward >= 0 ? '#10b981' : '#ef4444' }}>
                      {lastResult.reward >= 0 ? '+' : ''}{lastResult.reward.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Cumulative stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Cumulative Reward', val: cumulativeReward.toFixed(2), color: cumulativeReward >= 0 ? '#10b981' : '#ef4444', icon: <TrendingUp size={16}/> },
            { label: 'Net Energy Cost', val: `$${cumulativeCost.toFixed(2)}`, color: '#f59e0b', icon: <DollarSign size={16}/> },
            { label: 'Daily Peak Import', val: `${dailyPeak.toFixed(1)} kW`, color: '#f97316', icon: <Zap size={16}/> },
            { label: 'Renewable Ratio', val: `${((lastResult?.renewableRatio ?? 0) * 100).toFixed(1)}%`, color: '#10b981', icon: <Sun size={16}/> },
          ].map(s => (
            <div key={s.label} className="glass stat-card" style={{ padding: 14 }}>
              <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>{s.icon}{s.label}</div>
              <div className="value" style={{ fontSize: 22, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* ── Charts ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* SOC over time */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title"><Battery size={14} /> Battery SOC (%)</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="socGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'SOC']} />
                <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} />
                <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
                <Area type="monotone" dataKey="socPct" stroke="#10b981" fill="url(#socGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Price over time */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title"><DollarSign size={14} /> Electricity Price ($/kWh)</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis domain={[0.05, 0.38]} tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toFixed(3)}`, 'Price']} />
                <ReferenceLine y={0.20} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1} label={{ value: 'Peak $0.20', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={0.15} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1} />
                <Area type="monotone" dataKey="price" stroke="#f59e0b" fill="url(#priceGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Load, Solar, Wind */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title"><Activity size={14} /> Power Generation & Load (kW)</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="load" stroke="#ef4444" strokeWidth={2} dot={false} name="Load" />
                <Line type="monotone" dataKey="solar" stroke="#f59e0b" strokeWidth={2} dot={false} name="Solar" />
                <Line type="monotone" dataKey="wind" stroke="#00d4ff" strokeWidth={2} dot={false} name="Wind" />
                <Line type="monotone" dataKey="gridImport" stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Grid Import" />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              {[['Load', '#ef4444'], ['Solar', '#f59e0b'], ['Wind', '#00d4ff'], ['Grid Import', '#7c3aed']].map(([l, c]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
                  <div style={{ width: 16, height: 2, background: c as string, borderRadius: 1 }} />{l}
                </div>
              ))}
            </div>
          </div>

          {/* Reward history */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title"><TrendingUp size={14} /> Step Reward History</div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="rewGradPos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="t" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} />
                <Tooltip contentStyle={{ background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [v.toFixed(4), 'Reward']} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Area type="monotone" dataKey="reward" stroke="#10b981" fill="url(#rewGradPos)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Formula explainer ── */}
        <FormulaPanel envType={envType} />
      </main>
    </div>
  )
}

// ─── Energy Flow Diagram ──────────────────────────────────────────────────────
function EnergyFlowDiagram({ load, solar, wind, soc, socPct, gridImport, gridExport, batteryPow, renewable }: {
  load: number, solar: number, wind: number, soc: number, socPct: number,
  gridImport: number, gridExport: number, batteryPow: number, renewable: number
}) {
  const socColor = socPct < 15 ? '#ef4444' : socPct < 30 ? '#f59e0b' : '#10b981'
  const battIsCharging = batteryPow < -0.1
  const battIsDischarging = batteryPow > 0.1

  return (
    <div style={{ position: 'relative', height: 240 }}>
      <svg width="100%" height="100%" viewBox="0 0 460 240">
        {/* Grid (top-left) */}
        <g transform="translate(20, 20)">
          <rect width={80} height={44} rx={8} fill="rgba(124,58,237,0.15)" stroke="#7c3aed" strokeWidth={1.5} />
          <text x={40} y={18} textAnchor="middle" fill="#7c3aed" fontSize={10} fontWeight={700}>⚡ GRID</text>
          <text x={40} y={32} textAnchor="middle" fill="#a78bfa" fontSize={11} fontWeight={600}>
            {gridImport > 0.1 ? `↓ ${gridImport.toFixed(1)} kW` : gridExport > 0.1 ? `↑ ${gridExport.toFixed(1)} kW` : 'Balanced'}
          </text>
        </g>

        {/* Solar (top-center) */}
        <g transform="translate(190, 10)">
          <rect width={80} height={44} rx={8} fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth={1.5} />
          <text x={40} y={18} textAnchor="middle" fill="#f59e0b" fontSize={10} fontWeight={700}>☀️ SOLAR</text>
          <text x={40} y={32} textAnchor="middle" fill="#fcd34d" fontSize={11} fontWeight={600}>{solar.toFixed(1)} kW</text>
        </g>

        {/* Wind (top-right) */}
        <g transform="translate(360, 20)">
          <rect width={80} height={44} rx={8} fill="rgba(0,212,255,0.15)" stroke="#00d4ff" strokeWidth={1.5} />
          <text x={40} y={18} textAnchor="middle" fill="#00d4ff" fontSize={10} fontWeight={700}>💨 WIND</text>
          <text x={40} y={32} textAnchor="middle" fill="#67e8f9" fontSize={11} fontWeight={600}>{wind.toFixed(1)} kW</text>
        </g>

        {/* Load (center) */}
        <g transform="translate(190, 100)">
          <rect width={80} height={50} rx={8} fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth={1.5} />
          <text x={40} y={18} textAnchor="middle" fill="#ef4444" fontSize={10} fontWeight={700}>🏭 LOAD</text>
          <text x={40} y={33} textAnchor="middle" fill="#fca5a5" fontSize={12} fontWeight={700}>{load.toFixed(1)} kW</text>
          <text x={40} y={46} textAnchor="middle" fill="#94a3b8" fontSize={9}>demand</text>
        </g>

        {/* Battery (bottom-center) */}
        <g transform="translate(190, 178)">
          <rect width={80} height={50} rx={8} fill={`${socColor}15`} stroke={socColor} strokeWidth={1.5} />
          <text x={40} y={16} textAnchor="middle" fill={socColor} fontSize={10} fontWeight={700}>🔋 BATTERY</text>
          <text x={40} y={30} textAnchor="middle" fill={socColor} fontSize={12} fontWeight={700}>{socPct.toFixed(0)}%</text>
          <text x={40} y={44} textAnchor="middle" fill="#94a3b8" fontSize={9}>{soc.toFixed(0)} kWh</text>
        </g>

        {/* Arrows */}
        {/* Grid → Load */}
        {gridImport > 0.5 && (
          <line x1={100} y1={42} x2={190} y2={120} stroke="#7c3aed" strokeWidth={Math.max(1, Math.min(4, gridImport / 10))} strokeDasharray="5,3" markerEnd="url(#arrowP)" opacity={0.7} />
        )}
        {/* Load → Grid (export) */}
        {gridExport > 0.5 && (
          <line x1={190} y1={120} x2={100} y2={42} stroke="#10b981" strokeWidth={Math.max(1, Math.min(4, gridExport / 10))} strokeDasharray="5,3" opacity={0.7} />
        )}
        {/* Solar → Load */}
        {solar > 0.5 && (
          <line x1={230} y1={54} x2={230} y2={100} stroke="#f59e0b" strokeWidth={Math.max(1, Math.min(4, solar / 8))} opacity={0.8} />
        )}
        {/* Wind → Load */}
        {wind > 0.5 && (
          <line x1={360} y1={42} x2={270} y2={120} stroke="#00d4ff" strokeWidth={Math.max(1, Math.min(4, wind / 8))} opacity={0.7} />
        )}
        {/* Battery ↔ Load */}
        {battIsCharging && (
          <line x1={230} y1={150} x2={230} y2={178} stroke="#00d4ff" strokeWidth={2} strokeDasharray="4,2" opacity={0.8} />
        )}
        {battIsDischarging && (
          <line x1={230} y1={178} x2={230} y2={150} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4,2" opacity={0.8} />
        )}

        <defs>
          <marker id="arrowP" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed" />
          </marker>
        </defs>
      </svg>
    </div>
  )
}

// ─── Formula Explainer Panel ──────────────────────────────────────────────────
function FormulaPanel({ envType }: { envType: string }) {
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div className="section-title"><Info size={14} /> How Calculations Work ({envType === 'discrete' ? 'DQN Discrete' : 'SAC/PPO Continuous'})</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, fontSize: 12 }}>
        <div style={{ background: 'rgba(0,212,255,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(0,212,255,0.15)' }}>
          <div style={{ color: '#00d4ff', fontWeight: 700, marginBottom: 8 }}>🔋 SOC Update</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            Charge: SOC += action × 25kW × 0.95<br/>
            Discharge: SOC −= action × 25kW / 0.95<br/>
            Clamp: SOC ∈ [10, 95] kWh
          </code>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(16,185,129,0.15)' }}>
          <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 8 }}>⚡ Energy Balance</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            net = load − solar − wind − batt<br/>
            import = max(net, 0)<br/>
            export = max(−net, 0)
          </code>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(245,158,11,0.15)' }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>💰 Price (TOU)</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            Off-peak (22–09h): $0.10/kWh<br/>
            Shoulder (09–17h): $0.15/kWh<br/>
            Peak (17–22h):     $0.22/kWh
          </code>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(239,68,68,0.15)' }}>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>📊 Reward Formula</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            r = −(import×price)<br/>
            + export×price×0.5<br/>
            − 0.08×peak − 0.005×|ΔSOC|<br/>
            − 30×violation + 0.02×renew%
          </code>
        </div>
        <div style={{ background: 'rgba(124,58,237,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(124,58,237,0.15)' }}>
          <div style={{ color: '#a78bfa', fontWeight: 700, marginBottom: 8 }}>🎯 {envType === 'discrete' ? 'DQN Actions' : 'SAC/PPO Action'}</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            {envType === 'discrete'
              ? '0: Full Charge (−1.0)\n1: Half Charge (−0.5)\n2: Hold (0.0)\n3: Half Discharge (+0.5)\n4: Full Discharge (+1.0)'
              : 'Continuous ∈ [−1, +1]\n−1 → charge at 25 kW\n 0 → hold/idle\n+1 → discharge at 25 kW'}
          </code>
        </div>
        <div style={{ background: 'rgba(249,115,22,0.05)', borderRadius: 8, padding: 12, border: '1px solid rgba(249,115,22,0.15)' }}>
          <div style={{ color: '#f97316', fontWeight: 700, marginBottom: 8 }}>📈 Peak Penalty</div>
          <code style={{ color: 'var(--text-secondary)', lineHeight: 1.8, display: 'block' }}>
            Tracks max grid import today<br/>
            Resets every 24 hours<br/>
            Penalty = 0.08 × daily_peak<br/>
            → Agent avoids demand spikes
          </code>
        </div>
      </div>
    </div>
  )
}
