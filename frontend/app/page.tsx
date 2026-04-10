'use client'
import Link from 'next/link'
import { Zap, Cpu, BarChart3, Play, Activity, Battery, Wind, Sun, TrendingDown } from 'lucide-react'

const features = [
  {
    icon: Cpu,
    color: 'var(--primary)',
    glow: 'var(--primary-glow)',
    title: 'Train RL Agents',
    desc: 'Train SAC, PPO, and DQN algorithms on your microgrid environment with real-time reward curve visualization.',
    href: '/train',
    label: 'Start Training →',
  },
  {
    icon: BarChart3,
    color: 'var(--secondary)',
    glow: 'var(--secondary-glow)',
    title: 'Compare Algorithms',
    desc: 'Side-by-side comparison of all 3 RL algorithms vs rule-based and naive baselines across 8+ metrics.',
    href: '/compare',
    label: 'Run Comparison →',
  },
  {
    icon: Play,
    color: 'var(--success)',
    glow: 'var(--success-glow)',
    title: 'Simulate Dispatch',
    desc: 'Visualize 24h battery dispatch with animated energy flow charts across load, solar, wind, and grid.',
    href: '/simulate',
    label: 'Run Simulation →',
  },
  {
    icon: Activity,
    color: 'var(--warning)',
    glow: 'var(--warning-glow)',
    title: 'Live Dashboard',
    desc: 'Monitor training progress, model registry, and energy metrics in real-time from a unified dashboard.',
    href: '/dashboard',
    label: 'Open Dashboard →',
  },
]

const stats = [
  { value: '3', label: 'RL Algorithms', sub: 'SAC · PPO · DQN' },
  { value: '20', label: 'Observation Dims', sub: 'SOC + forecasts + time' },
  { value: '5', label: 'Policy Actions', sub: 'Discrete control' },
  { value: '8+', label: 'Evaluation Metrics', sub: 'Cost, peak, violations...' },
]

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '100px 60px 80px',
        background: 'linear-gradient(160deg, #020a18 0%, #0a1628 40%, #0d1b2e 100%)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Animated grid bg */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'linear-gradient(rgba(0,212,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.4) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          animation: 'gridFlow 20s linear infinite',
        }} />

        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '10%', right: '15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '20%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 99, padding: '6px 16px', marginBottom: 28, fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
            <Zap size={13} />
            IEEE Project — RL for Energy Management in Smart Grids
          </div>

          <h1 style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.1, marginBottom: 22, letterSpacing: '-0.02em' }}>
            <span className="gradient-text">RL-Powered</span>
            {' '}Smart Grid<br />Energy Optimizer
          </h1>

          <p style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 36px' }}>
            Train <strong style={{ color: 'var(--primary)' }}>SAC</strong>, <strong style={{ color: 'var(--success)' }}>PPO</strong>, and <strong style={{ color: 'var(--warning)' }}>DQN</strong> agents
            on a custom microgrid environment with batteries, solar, wind, and variable demand.
            Minimize energy cost and peak loads in real-time.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/train">
              <button className="btn btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>
                <Cpu size={16} /> Start Training
              </button>
            </Link>
            <Link href="/compare">
              <button className="btn btn-secondary" style={{ fontSize: 15, padding: '13px 28px' }}>
                <BarChart3 size={16} /> Compare Algorithms
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────── */}
      <div style={{ padding: '0 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderRadius: 0, overflow: 'hidden', borderTop: 'none' }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: 'var(--bg-surface)', padding: '24px 28px', textAlign: 'center' }}>
              <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 2px' }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Feature cards ─────────────────────────────────────── */}
      <div style={{ padding: '60px 60px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>Everything You Need</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Four integrated modules. One unified dashboard.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {features.map((f) => {
            const Icon = f.icon
            return (
              <Link key={f.href} href={f.href} style={{ textDecoration: 'none' }}>
                <div className="glass" style={{ padding: 28, cursor: 'pointer', height: '100%', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = f.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 30px ${f.glow}`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = ''; }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.glow}`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <Icon size={22} color={f.color} />
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>{f.desc}</p>
                  <span style={{ fontSize: 13, fontWeight: 600, color: f.color }}>{f.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── Architecture ──────────────────────────────────────── */}
      <div style={{ padding: '40px 60px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 10 }}>System Architecture</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Four integrated layers from simulation to UI.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { icon: Battery,     color: 'var(--warning)',   title: 'Microgrid Env',     items: ['Battery physics', 'Solar + Wind gen', '20-dim observation', '5-action discrete'] },
            { icon: TrendingDown,color: 'var(--primary)',   title: 'RL Training',        items: ['SAC (continuous)', 'PPO (robust)', 'DQN (discrete)', 'Live reward curves'] },
            { icon: Zap,         color: 'var(--success)',   title: 'FastAPI Backend',    items: ['POST /train', 'POST /compare', 'POST /simulate', 'GET /models'] },
            { icon: Activity,    color: 'var(--secondary)', title: 'Next.js Dashboard',  items: ['Recharts charts', 'Live polling', '5-page UI', 'Responsive layout'] },
          ].map((layer, i) => {
            const Icon = layer.icon
            return (
              <div key={layer.title} className="glass" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: layer.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Layer {i + 1}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Icon size={18} color={layer.color} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{layer.title}</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {layer.items.map((item) => (
                    <li key={item} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: layer.color, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
