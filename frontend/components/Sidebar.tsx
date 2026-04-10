'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap, BarChart3, Play, Activity, Home, ChevronRight,
  Battery, Cpu, TrendingUp, Target, BookOpen
} from 'lucide-react'

const navItems = [
  { href: '/',          label: 'Home',       icon: Home },
  { href: '/guide',     label: 'Guide',      icon: BookOpen },
  { href: '/train',     label: 'Train',      icon: Cpu },
  { href: '/compare',   label: 'Compare',    icon: BarChart3 },
  { href: '/simulate',       label: 'Simulate',    icon: Play },
  { href: '/env-visualizer', label: 'Env Viewer',  icon: Battery },
  { href: '/outcomes',       label: 'Outcomes',    icon: Target },
  { href: '/dashboard', label: 'Dashboard',  icon: Activity },
]

const algoColors: Record<string, string> = {
  SAC: 'var(--primary)',
  PPO: 'var(--success)',
  DQN: 'var(--warning)',
}

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={18} color="#000" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>SmartGrid RL</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>v2.0 • Energy AI</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 12px 6px' }}>
          Navigation
        </div>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px',
                borderRadius: 9,
                margin: '2px 0',
                background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: active ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                transition: 'all 0.15s',
                position: 'relative',
              }}>
                <Icon size={16} />
                <span>{label}</span>
                {active && (
                  <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                )}
              </div>
            </Link>
          )
        })}

        {/* Algorithm legend */}
        <div style={{ margin: '16px 0 6px', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 12px 8px' }}>
            Algorithms
          </div>
          {Object.entries(algoColors).map(([algo, color]) => (
            <div key={algo} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{algo}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
                {algo === 'SAC' ? 'Continuous' : algo === 'PPO' ? 'Continuous' : 'Discrete'}
              </span>
            </div>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div className="pulse-dot" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Backend connected</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          FastAPI • Stable-Baselines3 • PyTorch
        </div>
      </div>
    </aside>
  )
}
