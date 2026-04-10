import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SmartGrid RL — Microgrid Energy Optimizer',
  description: 'Full-stack reinforcement learning system for smart grid control: SAC, PPO, and DQN algorithms for battery dispatch and peak load reduction.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
