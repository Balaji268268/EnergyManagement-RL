'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import {
  BookOpen, Battery, Cpu, Zap, BarChart3, Play, Scale,
  Brain, TrendingDown, Sun, Wind, Database, AlertTriangle,
  CheckCircle, Info, ChevronDown, ChevronRight, Activity,
  Target, DollarSign, Layers
} from 'lucide-react'

/* ── Collapsible section ─────────────────────────────────────────────────── */
function Accordion({ title, icon: Icon, color = 'var(--primary)', children, defaultOpen = false }: any) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass" style={{ marginBottom: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', color: 'var(--text-primary)', textAlign: 'left' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 16, flex: 1 }}>{title}</span>
        {open ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
      </button>
      {open && (
        <div style={{ padding: '0 22px 22px', borderTop: '1px solid var(--border)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Term card ───────────────────────────────────────────────────────────── */
function Term({ term, unit, color = 'var(--primary)', children }: any) {
  return (
    <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${color}28`, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color }}>{term}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 99 }}>{unit}</span>}
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}

/* ── Code block ──────────────────────────────────────────────────────────── */
function Code({ children }: { children: string }) {
  return (
    <pre style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '14px 18px', fontSize: 12, color: '#a5f3fc', overflowX: 'auto', lineHeight: 1.7, margin: '12px 0' }}>
      {children}
    </pre>
  )
}

/* ── Info box ────────────────────────────────────────────────────────────── */
function InfoBox({ type = 'info', children }: any) {
  const cfg: Record<string, { color: string; icon: any; bg: string }> = {
    info:    { color: 'var(--primary)',  icon: Info,          bg: 'var(--primary-glow)' },
    warning: { color: 'var(--warning)', icon: AlertTriangle,  bg: 'var(--warning-glow)' },
    success: { color: 'var(--success)', icon: CheckCircle,    bg: 'var(--success-glow)' },
  }
  const { color, icon: Icon, bg } = cfg[type]
  return (
    <div style={{ display: 'flex', gap: 12, padding: '14px 16px', background: bg, border: `1px solid ${color}30`, borderRadius: 10, margin: '12px 0' }}>
      <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{children}</p>
    </div>
  )
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function GuidePage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,212,255,0.06) 0%, rgba(124,58,237,0.06) 100%)',
          border: '1px solid var(--border)', borderRadius: 16, padding: '32px 36px', marginBottom: 28,
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={24} color="#000" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                Smart Grid RL — <span className="gradient-text">Full Guide</span>
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 720 }}>
                Everything you need to understand before running models: what the environment simulates, how RL training works, what every metric means, and how to interpret every chart on this platform.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="glass" style={{ padding: '16px 22px', marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Jump To Section</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              ['#workflow',     '1. Workflow'],
              ['#environment',  '2. Environment'],
              ['#obs-action',   '3. Obs & Action Space'],
              ['#reward',       '4. Reward Function'],
              ['#algorithms',   '5. Algorithms'],
              ['#data',         '6. Data & Accuracy'],
              ['#terms',        '7. Key Terms'],
              ['#charts',       '8. Chart Guide'],
            ].map(([href, label]) => (
              <a key={href} href={href}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-glow)', border: '1px solid var(--border-accent)', borderRadius: 99, padding: '5px 14px', textDecoration: 'none' }}>
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* ══ 1. WORKFLOW ══════════════════════════════════════════════════════ */}
        <div id="workflow">
          <Accordion title="1. How to Use This Platform — Step-by-Step Workflow" icon={Layers} color="var(--primary)" defaultOpen>
            <div style={{ marginTop: 16 }}>
              <InfoBox type="success">
                You can use <strong>Simulate</strong> and <strong>Outcomes</strong> immediately with the Rule-Based baseline — no training required. RL models need to be trained first via the <strong>Train</strong> page.
              </InfoBox>

              {[
                { step: '01', color: 'var(--primary)',   icon: Play,       title: 'Explore the Environment',   desc: 'Go to Simulate → select "Rule-Based" → click Run Simulation. Watch real-time battery dispatch, SOC, energy costs, and grid import without training any model. This shows you what the environment looks like.' },
                { step: '02', color: 'var(--success)',   icon: Cpu,        title: 'Train an RL Agent',          desc: 'Go to Train → choose SAC (recommended first). Set timesteps to 50,000 for a quick run (~2 minutes). Click Start Training and watch the live reward curve. The agent improves as the curve rises.' },
                { step: '03', color: 'var(--warning)',   icon: BarChart3,  title: 'Compare All Algorithms',     desc: 'After training at least one model, go to Compare → click Run Comparison. This benchmarks all saved RL models + Rule-Based + Naive on the same 14-day test dataset.' },
                { step: '04', color: 'var(--secondary)', icon: Target,     title: 'Analyse Expected Outcomes',  desc: 'Go to Outcomes → click Run Full Evaluation. This generates the project brief\'s 3 deliverables: cost savings charts, trade-off Pareto curves, and policy interpretation plots.' },
                { step: '05', color: 'var(--orange)',    icon: Brain,      title: 'Interpret Policy Decisions', desc: 'On the Outcomes page, select different algorithms and study the "Action vs Price" and "Action vs SOC" scatter charts. A well-trained SAC agent should discharge at high prices and charge at low prices.' },
                { step: '06', color: 'var(--primary)',   icon: Activity,   title: 'Monitor via Dashboard',      desc: 'The Dashboard shows all training jobs, the best model per algorithm, and a 24h data preview. It auto-refreshes every 10 seconds.' },
              ].map(s => {
                const Icon = s.icon
                return (
                  <div key={s.step} style={{ display: 'flex', gap: 16, marginBottom: 16, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}18`, border: `1px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={s.color} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>STEP {s.step}</span>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Accordion>
        </div>

        {/* ══ 2. ENVIRONMENT ═══════════════════════════════════════════════════ */}
        <div id="environment">
          <Accordion title="2. The Microgrid Environment — What Is Being Simulated?" icon={Battery} color="var(--warning)">
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                The <strong style={{ color: 'var(--text-primary)' }}>MicrogridEnv</strong> is a custom Gymnasium-compatible reinforcement learning environment that simulates a small electricity grid serving local demand with renewable generation and a controllable battery storage system.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {[
                  { icon: Battery, color: 'var(--warning)',  label: 'Battery Storage',  val: '100 kWh capacity · ±25 kW max power · 95% round-trip efficiency · SOC range 10%–95%' },
                  { icon: Sun,     color: 'var(--success)',  label: 'Solar Generation', val: 'Up to 25 kW peak · bell-curve shape 6am–6pm · cloud cover noise (~±30%)' },
                  { icon: Wind,    color: 'var(--primary)',  label: 'Wind Generation',  val: 'Up to 30 kW · autocorrelated time-series · higher at night · variable with weather' },
                  { icon: Zap,     color: 'var(--danger)',   label: 'Load Demand',      val: '20–120 kW range · morning + evening peaks · weekday/weekend patterns · ±2.5 kW noise' },
                ].map(c => {
                  const Icon = c.icon
                  return (
                    <div key={c.label} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: `1px solid ${c.color}28` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Icon size={16} color={c.color} />
                        <span style={{ fontWeight: 700, fontSize: 14, color: c.color }}>{c.label}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{c.val}</p>
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--warning)', fontSize: 14 }}>Electricity Pricing (Time-of-Use)</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { period: 'Off-Peak (0–9h)',   price: '$0.10/kWh', tip: 'Cheapest — ideal charging window' },
                    { period: 'Shoulder (9–17h)',  price: '$0.15/kWh', tip: 'Moderate — partial charging OK' },
                    { period: 'Peak (17–22h)',     price: '$0.22/kWh', tip: 'Most expensive — discharge here' },
                  ].map(p => (
                    <div key={p.period} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{p.period}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--warning)' }}>{p.price}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{p.tip}</div>
                    </div>
                  ))}
                </div>
              </div>

              <InfoBox type="info">
                <strong>Physics model:</strong> At each hourly timestep, the agent selects a battery charge/discharge level. The grid import fills any remaining unmet demand. Export revenue is earned when surplus renewable + discharge exceeds demand. Battery physically cannot exceed capacity or drop below minimum SOC without penalty.
              </InfoBox>

              <Code>{`# Simplified energy balance at step t:
net_demand = load_t - solar_t - wind_t - battery_power_kw
grid_import  = max(net_demand, 0)      # buy from grid
grid_export  = max(-net_demand, 0)     # sell to grid (at 50% of import price)

energy_cost  = grid_import × price_t
export_rev   = grid_export × price_t × 0.5`}</Code>
            </div>
          </Accordion>
        </div>

        {/* ══ 3. OBSERVATION & ACTION SPACE ════════════════════════════════════ */}
        <div id="obs-action">
          <Accordion title="3. Observation Space & Action Space" icon={Database} color="var(--primary)">
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--primary)' }}>Observation Vector — 20 dimensions</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>
                At each timestep, the agent observes a 20-dimensional vector. All values are normalised so the neural network trains efficiently.
              </p>
              <Code>{`obs = [
  soc_norm,          # [0] Battery SOC normalised to [0,1]
  load / 100,        # [1] Current load demand (kW / 100)
  solar / 30,        # [2] Current solar generation (kW / 30)
  wind / 30,         # [3] Current wind generation (kW / 30)
  price / 0.35,      # [4] Electricity price ($/kWh / 0.35)
  sin(2πh/24),       # [5] Cyclical hour encoding — sine
  cos(2πh/24),       # [6] Cyclical hour encoding — cosine
  f_load_1 / 100,    # [7-9] Load forecasts t+1, t+2, t+3 hours
  f_load_2 / 100,
  f_load_3 / 100,
  f_solar_1 / 30,    # [10-11] Solar forecasts t+1, t+2 hours
  f_solar_2 / 30,
  f_wind_1 / 30,     # [12-13] Wind forecasts t+1, t+2 hours
  f_wind_2 / 30,
  f_price_1 / 0.35,  # [14-15] Price forecasts t+1, t+2 hours
  f_price_2 / 0.35,
  daily_peak / 100,  # [16] Today's highest grid import so far
  renew_ratio,       # [17] Renewable / load ratio
  net_demand / 100,  # [18] Net demand (load - renewables)
  soc_trend,         # [19] Rate of SOC change (last step)
]`}</Code>

              <InfoBox type="info">
                <strong>Why cyclical encoding?</strong> Hour 23 and Hour 0 are adjacent in time but numerically far apart. sin/cos encoding makes them numerically close, so the neural net understands daily patterns correctly.
              </InfoBox>

              <div style={{ fontWeight: 700, margin: '20px 0 10px', color: 'var(--primary)' }}>Action Space</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: 16, background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>SAC & PPO — Continuous Box([-1, 1])</div>
                  <Code>{`action ∈ [-1.0, +1.0]

-1.0  →  Full charge  (25 kW into battery)
-0.5  →  Half charge  (12.5 kW into battery)
 0.0  →  Hold         (no battery movement)
+0.5  →  Half discharge
+1.0  →  Full discharge (25 kW from battery)`}</Code>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Smooth, fine-grained control. Best for battery dispatch which is naturally continuous.</p>
                </div>
                <div style={{ padding: 16, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 8 }}>DQN — Discrete(5)</div>
                  <Code>{`action ∈ {0, 1, 2, 3, 4}

0  →  Full charge    (a = -1.0)
1  →  Partial charge (a = -0.5)
2  →  Hold           (a =  0.0)
3  →  Partial disch. (a = +0.5)
4  →  Full discharge (a = +1.0)`}</Code>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Discretised for Q-value learning. Internally maps to same continuous physics.</p>
                </div>
              </div>
            </div>
          </Accordion>
        </div>

        {/* ══ 4. REWARD FUNCTION ═══════════════════════════════════════════════ */}
        <div id="reward">
          <Accordion title="4. Multi-Objective Reward Function" icon={Scale} color="var(--success)">
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                The reward function has <strong style={{ color: 'var(--text-primary)' }}>6 components</strong> — some to maximise (revenue, renewable use) and some to minimise (cost, peak, violations, degradation). The agent must balance all simultaneously.
              </p>
              <Code>{`reward = (
  - energy_cost           # $/step: grid import × price
  + export_revenue        # $/step: grid export × price × 0.5
  - λ_peak × peak_penalty # penalises daily peak import (peak demand charge)
  - λ_deg  × degradation  # penalises battery cycling (wear cost)
  - λ_viol × violation    # heavy penalty for exceeding SOC limits
  + λ_ren  × renew_bonus  # bonus for utilising renewable generation
)

# Default weights:  λ_peak=0.08, λ_deg=0.005, λ_viol=30.0, λ_ren=0.02`}</Code>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
                {[
                  { color: 'var(--danger)',   term: 'Energy Cost',     why: 'Primary objective. Lower grid import × price = lower bills. Agent learns to use solar/wind and discharge battery during expensive peak hours.' },
                  { color: 'var(--success)',  term: 'Export Revenue',  why: 'Bonus for selling surplus power back to grid at 50% of import rate. Encourages maximising renewable use.' },
                  { color: 'var(--warning)',  term: 'Peak Penalty',    why: 'Penalises the daily maximum grid import. Reduces demand charges. Agent learns to shave peaks by pre-charging battery.' },
                  { color: 'var(--primary)',  term: 'Degradation',     why: 'Small penalty per kWh of battery throughput. Discourages unnecessary cycling that wears the battery.' },
                  { color: 'var(--danger)',   term: 'SOC Violation',   why: 'Heavy penalty (×30) if SOC goes below 10% or above 95%. Protects battery health. Rarely triggered after training.' },
                  { color: 'var(--success)',  term: 'Renewable Bonus', why: 'Positive reward proportional to how much of load is covered by solar+wind. Encourages smarter storage timing.' },
                ].map(r => (
                  <div key={r.term} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${r.color}28`, borderRadius: 10 }}>
                    <div style={{ fontWeight: 700, color: r.color, marginBottom: 6, fontSize: 13 }}>{r.term}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{r.why}</p>
                  </div>
                ))}
              </div>

              <InfoBox type="warning">
                You can tune the reward weights on the Train page. Higher <strong>λ_peak</strong> prioritises peak reduction over cost. Higher <strong>λ_viol</strong> makes the agent more conservative with SOC. This is the "multi-objective reward shaping" required by the project brief.
              </InfoBox>
            </div>
          </Accordion>
        </div>

        {/* ══ 5. ALGORITHMS ════════════════════════════════════════════════════ */}
        <div id="algorithms">
          <Accordion title="5. RL Algorithms — SAC vs PPO vs DQN" icon={Cpu} color="var(--secondary)">
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  {
                    name: 'SAC', color: 'var(--primary)', full: 'Soft Actor-Critic',
                    type: 'Off-policy · Continuous action',
                    desc: 'Learns a policy that maximises reward while maintaining high entropy (randomness). Entropy bonus encourages exploration and leads to robust, adaptable policies.',
                    pros: ['Best sample efficiency', 'Smooth continuous control', 'Handles uncertainty well', 'Usually highest final performance'],
                    cons: ['Slower per step', 'Requires replay buffer memory', 'More hyperparameters'],
                    best: 'Best choice for battery dispatch',
                    lr: '3e-4', bs: '256', buffer: '100k',
                  },
                  {
                    name: 'PPO', color: 'var(--success)', full: 'Proximal Policy Optimization',
                    type: 'On-policy · Continuous action',
                    desc: 'Optimises policy in small "proximal" steps using a clipping mechanism that prevents large destabilising updates. Very stable and reliable across environments.',
                    pros: ['Stable training', 'Simple to tune', 'Works on-policy (no replay)', 'Good generalisation'],
                    cons: ['Lower sample efficiency', 'On-policy means no reuse of old data', 'May need more timesteps'],
                    best: 'Good robust benchmark',
                    lr: '3e-4', bs: '64', buffer: 'n/a (on-policy)',
                  },
                  {
                    name: 'DQN', color: 'var(--warning)', full: 'Deep Q-Network',
                    type: 'Off-policy · Discrete action (5)',
                    desc: 'Learns Q-values (expected future reward) for each discrete action. Uses ε-greedy exploration. Classic deep RL algorithm. Works on discretised battery control.',
                    pros: ['Simple concept', 'Good with discrete actions', 'Replay buffer', 'Easy to explain'],
                    cons: ['Cannot do fine-grained continuous control', 'Exploration decay sensitive', 'Usually lower performance than SAC here'],
                    best: 'Useful discrete baseline',
                    lr: '1e-4', bs: '64', buffer: '100k',
                  },
                ].map(a => (
                  <div key={a.name} style={{ padding: 18, background: `${a.color}08`, border: `1px solid ${a.color}30`, borderRadius: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: a.color }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.full}</div>
                      </div>
                      <span style={{ fontSize: 10, background: `${a.color}20`, color: a.color, border: `1px solid ${a.color}40`, borderRadius: 99, padding: '3px 10px', fontWeight: 600 }}>
                        {a.type.split(' · ')[0]}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 12 }}>{a.desc}</p>
                    <div style={{ marginBottom: 10 }}>
                      {a.pros.map(p => <div key={p} style={{ fontSize: 11, color: 'var(--success)', display: 'flex', gap: 5, marginBottom: 3 }}><span>✓</span>{p}</div>)}
                      {a.cons.map(c => <div key={c} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 5, marginBottom: 3 }}><span>–</span>{c}</div>)}
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, fontSize: 11 }}>
                      <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Default Hyperparams</div>
                      <div>LR: <code style={{ color: a.color }}>{a.lr}</code> · Batch: <code style={{ color: a.color }}>{a.bs}</code><br />Buffer: <code style={{ color: a.color }}>{a.buffer}</code></div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: a.color }}>→ {a.best}</div>
                  </div>
                ))}
              </div>
            </div>
          </Accordion>
        </div>

        {/* ══ 6. DATA ACCURACY ═════════════════════════════════════════════════ */}
        <div id="data">
          <Accordion title="6. Data & Accuracy — Is This Real-World Data?" icon={Database} color="var(--warning)">
            <div style={{ marginTop: 16 }}>
              <InfoBox type="warning">
                <strong>This platform uses synthetic (simulated) data,</strong> not real-world grid measurements. Results are realistic in pattern but not calibrated to a specific real grid. All comparisons between algorithms ARE fair and meaningful because every policy runs on the identical deterministic dataset.
              </InfoBox>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>Training Data</div>
                  <Term term="60 days" color="var(--primary)">Episodes drawn from 60-day synthetic dataset (seed=42). Deterministic — same data every run so results are reproducible.</Term>
                  <Term term="Simulate / Compare" color="var(--warning)">Policies are evaluated on a <strong>separate</strong> 14-day test dataset (seed=99) that was never seen during training. This prevents overfitting bias.</Term>
                  <Term term="Realistic patterns" color="var(--success)">Solar peaks at noon, evening load peak 7–9pm, TOU pricing tiers, correlated wind noise — all modelled from real-world patterns.</Term>
                </div>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>What the Graphs Show</div>
                  <Term term="Simulate page" color="var(--primary)">Runs the selected policy on fresh test data and returns the actual step-by-step simulation result. Every run with the same policy + seed gives identical results.</Term>
                  <Term term="Compare page" color="var(--success)">Runs ALL saved policies on the same 14-day test data. Comparisons are fair — same environment, same conditions.</Term>
                  <Term term="Outcomes page" color="var(--secondary)">Computes aggregate statistics across the entire 14-day period and generates interpretation features from the raw step data.</Term>
                </div>
              </div>

              <InfoBox type="success">
                <strong>Key insight:</strong> The relative ordering of algorithm performance (SAC &#62; Rule-Based &#62; Naive, for example) reflects genuine differences in policy quality on this problem. The absolute dollar values ($X cost) are scaled to realistic ranges but not calibrated to real electricity tariffs.
              </InfoBox>
            </div>
          </Accordion>
        </div>

        {/* ══ 7. KEY TERMS ═════════════════════════════════════════════════════ */}
        <div id="terms">
          <Accordion title="7. Key Terms — Everything You Need to Know" icon={BookOpen} color="var(--secondary)">
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '8px 0 10px' }}>Battery & Physics</div>
                  <Term term="SOC — State of Charge" unit="% or kWh" color="var(--warning)">The amount of energy currently stored in the battery. SOC = 50% means half full. Maintained between 10%–95% to prevent damage. In the 20-dim observation, this is obs[0] = SOC/100.</Term>
                  <Term term="Charge / Discharge" unit="kW" color="var(--primary)">Charging = putting energy into the battery (action &lt; 0). Discharging = drawing energy from battery to serve load (action &gt; 0). Max rate = ±25 kW in this env.</Term>
                  <Term term="Round-trip efficiency" unit="95%" color="var(--success)">Energy lost in the charge/discharge cycle. Charging 100 kWh stores only 95 kWh. Discharging 95 kWh delivers only ~90.25 kWh. This is why pointless cycling is penalised.</Term>
                  <Term term="Peak demand" unit="kW" color="var(--danger)">The maximum power drawn from the grid in a period. Utilities often charge a "demand charge" based on the monthly peak. Reducing peak is a key goal alongside energy cost.</Term>
                  <Term term="Grid import / export" unit="kW" color="var(--primary)">Import = buying from the grid when renewables + battery can't meet demand. Export = selling surplus generation + battery power back to the grid at 50% of import price.</Term>

                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '18px 0 10px' }}>Pricing</div>
                  <Term term="TOU — Time of Use" unit="$/kWh" color="var(--warning)">Variable electricity pricing by time of day. Off-peak (~$0.10), shoulder (~$0.15), peak (~$0.22). The RL agent should learn to charge cheap and discharge expensive.</Term>
                  <Term term="Energy cost" unit="$" color="var(--danger)">grid_import × price per timestep. Summed over the evaluation period, this is the primary metric for cost savings.</Term>
                  <Term term="Net cost" unit="$" color="var(--danger)">energy_cost − export_revenue. The actual money paid to the utility after accounting for sold power.</Term>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '8px 0 10px' }}>RL Concepts</div>
                  <Term term="Episode" color="var(--primary)">One complete run through the environment data (e.g., 60 days = 1440 timesteps). The agent resets SOC to 50% at the start.</Term>
                  <Term term="Timestep" color="var(--primary)">One hour of simulated time. At each timestep the agent observes state, takes an action, and receives a reward.</Term>
                  <Term term="Reward" color="var(--success)">The scalar feedback signal received after each action. Negative (cost) rewards encourage cost minimisation. The agent tries to maximise cumulative reward across an episode.</Term>
                  <Term term="Policy" color="var(--secondary)">The function that maps observations → actions. After training, the policy is deterministic: given the same obs, it always picks the same action.</Term>
                  <Term term="Replay buffer" unit="SAC/DQN" color="var(--primary)">Storage of past (obs, action, reward, next_obs) transitions used to train the neural network. Makes off-policy learning more sample efficient.</Term>
                  <Term term="Timesteps trained" color="var(--primary)">Total number of environment steps used for training. 50k = 50,000 hourly decisions. More timesteps → better policy (up to a point).</Term>
                  <Term term="Mean reward" color="var(--success)">Average episode return over recent episodes. Used in the live training curve. Should trend upward as the agent learns. Negative values are normal — it's the cost function.</Term>
                  <Term term="Exploration" color="var(--warning)">Random actions taken during training to discover better strategies. SAC uses entropy bonus; DQN uses ε-greedy (random with probability ε, decaying from 20% to 5%).</Term>

                  <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '18px 0 10px' }}>Metrics</div>
                  <Term term="Renewable ratio" unit="%" color="var(--success)">How much of load demand is served directly by solar+wind (not grid or battery). Higher = greener operation.</Term>
                  <Term term="SOC violation" unit="$" color="var(--danger)">Cost when battery SOC goes below 10% or above 95% (×30 penalty weight). Near-zero after training converges.</Term>
                  <Term term="Degradation cost" unit="$" color="var(--warning)">Proxy for battery wear: 0.005 × |kWh cycled| per step. Discourages unnecessary charge/discharge cycles.</Term>
                </div>
              </div>
            </div>
          </Accordion>
        </div>

        {/* ══ 8. CHART GUIDE ═══════════════════════════════════════════════════ */}
        <div id="charts">
          <Accordion title="8. How to Read the Charts" icon={BarChart3} color="var(--primary)">
            <div style={{ marginTop: 16 }}>
              {[
                {
                  page: 'Train Page',
                  color: 'var(--primary)',
                  charts: [
                    { name: 'Live Reward Curve', desc: 'X-axis = training timesteps (×1000). Y-axis = mean episode reward. Starts very negative (~−200 to −500) and should trend upward as the agent learns. A flat curve means the agent has converged. Noise is normal.' },
                  ]
                },
                {
                  page: 'Simulate Page',
                  color: 'var(--success)',
                  charts: [
                    { name: 'Energy Flow Chart', desc: 'Multi-axis chart showing Load (what is needed), Solar + Wind (what is available), Grid Import (what was bought), Battery Power (what the battery did). When Battery Power is positive (yellow bars above 0), the battery is discharging to help meet demand.' },
                    { name: 'SOC Chart', desc: 'Battery state over time. Should stay between the red (10%) and orange (95%) reference lines. Dips at peak hours and refills at off-peak. Flat SOC means the battery is idle (Naive policy).' },
                    { name: 'Price & Cost Chart', desc: 'Blue line = electricity price. Orange bars = energy cost per hour. Spikes should coincide with the 17-22h peak window. A smart policy minimises bar height during price spikes.' },
                    { name: 'Action Chart', desc: 'What the battery did each hour. Negative = charging, positive = discharging. Should be correlated with price: negative actions when price low, positive when price high.' },
                  ]
                },
                {
                  page: 'Compare Page',
                  color: 'var(--secondary)',
                  charts: [
                    { name: 'Cost / Peak / Reward Bars', desc: 'Lower bar = better for cost and peak. Higher bar = better for reward. All algorithms evaluated on identical 14-day test data so comparison is fair.' },
                    { name: 'SOC Trajectory', desc: 'All policies\' SOC curves overlaid for the first 48 hours. Divergence shows how each policy manages the battery differently. All start at 50% SOC.' },
                    { name: 'Radar Chart', desc: 'Normalised 0–100 scores across 6 metrics. Larger area = better overall policy. "Higher = better" for all axes (violations axis is inverted: less violations → higher score).' },
                  ]
                },
                {
                  page: 'Outcomes Page',
                  color: 'var(--warning)',
                  charts: [
                    { name: 'Trade-off Scatter', desc: 'Each dot is one policy. X = net cost, Y = violations. Bottom-left is ideal (cheap AND constraint-respecting). RL agents should cluster bottom-left; Naive policy typically sits top-right.' },
                    { name: 'Action vs Price Scatter', desc: 'Each dot = one timestep. X = price, Y = action taken. A price-responsive policy shows negative actions (charging) at low prices and positive (discharging) at high prices — a downward slope from left to right.' },
                    { name: 'Action vs SOC Scatter', desc: 'Each dot = one timestep. X = SOC%, Y = action. A SOC-aware policy shows charging (negative) when SOC is low-left and discharging (positive) when SOC is high-right. The two red lines mark the 10% and 95% constraint boundaries.' },
                    { name: 'Hourly Action Bar', desc: 'Average action the policy takes at each hour of the day (averaged across all 14 days). Should show charging (negative bars) at hours 0–9 and discharging (positive) at 17–22. Rule-Based shows this pattern clearly; RL learns a smoother version.' },
                  ]
                },
              ].map(section => (
                <div key={section.page} style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: section.color }} />
                    <span style={{ fontWeight: 700, color: section.color, fontSize: 15 }}>{section.page}</span>
                  </div>
                  {section.charts.map(c => (
                    <div key={c.name} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{c.name}</div>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </Accordion>
        </div>

        {/* Footer */}
        <div className="glass" style={{ padding: '20px 24px', marginTop: 8, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Ready to start?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Go to Simulate first (no training needed) to see the environment in action, then train your first RL agent.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/simulate"><button className="btn btn-secondary">Run Simulation</button></a>
            <a href="/train"><button className="btn btn-primary"><Cpu size={14} />Start Training</button></a>
          </div>
        </div>

      </main>
    </div>
  )
}
