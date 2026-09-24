import { Routes, Route, Navigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { ThemeProvider } from '@/theme/ThemeContext'
import { AppShell } from '@/components/AppShell'
import Draw from '@/pages/Draw'
import Simulate from '@/pages/Simulate'
import Bracket from '@/pages/Bracket'
import Ratings from '@/pages/Ratings'
import Method from '@/pages/Method'

// A standalone World Cup 2026 predictor: draw the groups, simulate the tournament
// thousands of times for odds, and read the knockout bracket — all from a faithful
// port of an offline Elo + Monte Carlo engine.
const NAV = [
  { to: '/', label: 'Draw', end: true },
  { to: '/simulate', label: 'Simulate' },
  { to: '/bracket', label: 'Bracket' },
  { to: '/ratings', label: 'Ratings' },
  { to: '/method', label: 'Method' },
]

export default function App() {
  return (
    <ThemeProvider>
      {/* All framer-motion honours the OS "reduce motion" setting. */}
      <MotionConfig reducedMotion="user">
        <Routes>
          <Route element={<AppShell title="World Cup 2026" mark={Trophy} nav={NAV} />}>
            <Route index element={<Draw />} />
            <Route path="simulate" element={<Simulate />} />
            <Route path="bracket" element={<Bracket />} />
            <Route path="ratings" element={<Ratings />} />
            <Route path="method" element={<Method />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </MotionConfig>
    </ThemeProvider>
  )
}
