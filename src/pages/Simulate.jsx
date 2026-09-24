import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Square, RotateCcw, Trophy, Activity, AlertTriangle, Info, Loader2 } from 'lucide-react'
import { TEAMS, drawGroups, playTournament, emptyCounts, buildResults, makeRng } from '@/engine/worldcup'
import { Button, Card, Panel, SectionHeading, Stat, Badge, Callout, Field, Input, Select, EmptyState } from '@/components/ui'
import { OddsChart } from '@/components/OddsChart'
import { formatPct, randomSeed } from '@/lib/tournament'
import Reveal from '@/components/Reveal'

const CHART_ROWS = 16
const TABLE_ROWS = 12
const FRAME_BUDGET_MS = 14 // work this long per animation frame, then yield to the UI

const ITERATION_OPTIONS = [2000, 10000, 50000]

// Fold the fixed draw + the per-run finishing positions into per-team, per-group
// advancement percentages (finishing top two = guaranteed passage to the R32).
function buildAdvancement(groups, pos, done) {
  const out = {}
  for (const [label, teams] of Object.entries(groups)) {
    out[label] = teams
      .map((t) => ({
        code: t.code,
        name: t.name,
        winPct: done ? (pos[t.code].first / done) * 100 : 0,
        advPct: done ? (pos[t.code].top2 / done) * 100 : 0,
      }))
      .sort((a, b) => b.advPct - a.advPct)
  }
  return out
}

function AdvancementCard({ label, teams }) {
  return (
    <Card className="p-4">
      <h3 className="font-display text-base font-semibold text-ink">Group {label}</h3>
      <ul className="mt-3 space-y-2.5">
        {teams.map((t) => (
          <li key={t.code}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm text-ink">{t.name}</span>
              <span className="shrink-0 font-mono text-xs text-ink tabular-nums">{formatPct(t.advPct)}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-fill-strong" aria-hidden="true">
              <div className="h-full rounded-full bg-neonCyan" style={{ width: `${t.advPct}%` }} />
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-muted">wins group {formatPct(t.winPct)}</p>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function Simulate() {
  const [seed, setSeed] = useState('kickoff-2026')
  const [target, setTarget] = useState(10000)
  const [status, setStatus] = useState('idle') // idle | running | done
  const [done, setDone] = useState(0)
  const [rows, setRows] = useState([])
  const [advancement, setAdvancement] = useState(null)
  const [error, setError] = useState(null)

  // All the mutable simulation state lives in a ref so the animation-frame loop
  // never reads stale React state and each frame stays cheap.
  const sim = useRef(null)
  const raf = useRef(0)

  const paint = useCallback(() => {
    const s = sim.current
    if (!s) return
    setDone(s.done)
    setRows(buildResults(s.counts, s.done))
    setAdvancement(buildAdvancement(s.groups, s.pos, s.done))
  }, [])

  const tick = useCallback(() => {
    const s = sim.current
    if (!s) return
    const start = performance.now()
    while (s.done < s.target && performance.now() - start < FRAME_BUDGET_MS) {
      const { groupOrder, champion, finalists } = playTournament(s.groups, s.rng)
      s.counts[champion].champion += 1
      s.counts[finalists[0]].final += 1
      s.counts[finalists[1]].final += 1
      for (const label of s.labels) {
        const order = groupOrder[label]
        s.pos[order[0]].first += 1
        s.pos[order[0]].top2 += 1
        s.pos[order[1]].top2 += 1
      }
      s.done += 1
    }
    paint()
    if (s.done >= s.target) {
      setStatus('done')
      return
    }
    raf.current = requestAnimationFrame(tick)
  }, [paint])

  const run = useCallback(() => {
    cancelAnimationFrame(raf.current)
    try {
      const rng = makeRng(seed || 'seed')
      const groups = drawGroups(TEAMS, rng)
      const pos = {}
      for (const t of TEAMS) pos[t.code] = { first: 0, top2: 0 }
      sim.current = { rng, groups, labels: Object.keys(groups), counts: emptyCounts(), pos, done: 0, target }
      setError(null)
      setStatus('running')
      paint()
      raf.current = requestAnimationFrame(tick)
    } catch (e) {
      setError(e?.message || 'The draw could not be completed.')
      setStatus('idle')
    }
  }, [seed, target, tick, paint])

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setStatus((s) => (s === 'running' ? 'done' : s))
  }, [])

  const reset = useCallback(() => {
    cancelAnimationFrame(raf.current)
    sim.current = null
    setStatus('idle')
    setDone(0)
    setRows([])
    setAdvancement(null)
    setError(null)
  }, [])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])

  const running = status === 'running'
  const hasResults = rows.length > 0 && done > 0
  const leader = hasResults ? rows[0] : null
  const chartData = rows.slice(0, CHART_ROWS).map((r) => ({ code: r.code, name: r.name, pct: r.titlePct }))
  const progress = target > 0 ? Math.min(100, (done / target) * 100) : 0

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeading
          eyebrow="// monte carlo"
          title="Tournament simulator"
          sub="Draw the groups once, then replay the whole tournament thousands of times from the seeded Elo model. The share of runs a nation wins is its title probability; the share it clears its group is its advancement probability."
        />
      </Reveal>

      {/* controls */}
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="Seed" htmlFor="sim-seed" hint="Fixes the draw and the run." className="sm:w-52">
              <Input
                id="sim-seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="e.g. kickoff-2026"
                autoComplete="off"
                spellCheck={false}
                disabled={running}
              />
            </Field>
            <Field label="Iterations" htmlFor="sim-iters" className="sm:w-40">
              <Select id="sim-iters" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={running}>
                {ITERATION_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n.toLocaleString()} runs
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {!running && (
              <Button variant="outline" onClick={() => setSeed(randomSeed())} disabled={running}>
                New seed
              </Button>
            )}
            {running ? (
              <Button variant="danger" onClick={stop}>
                <Square className="h-4 w-4" aria-hidden="true" />
                Stop
              </Button>
            ) : (
              <Button onClick={run}>
                <Play className="h-4 w-4" aria-hidden="true" />
                {status === 'done' ? 'Run again' : 'Run simulation'}
              </Button>
            )}
            {status === 'done' && (
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* progress */}
        {(running || done > 0) && (
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between font-mono text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                {running && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {running ? 'Simulating…' : 'Complete'}
              </span>
              <span className="tabular-nums">
                {done.toLocaleString()} / {target.toLocaleString()}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-fill-strong"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={target}
              aria-label="Simulation progress"
            >
              <div className="h-full rounded-full bg-neonCyan transition-[width] duration-150 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </Panel>

      {error && (
        <Reveal>
          <Callout tone="bad" icon={AlertTriangle} title="Could not run">
            {error} Try a different seed.
          </Callout>
        </Reveal>
      )}

      {!hasResults && !error ? (
        <Reveal>
        <EmptyState
          icon={Activity}
          title="No simulation yet"
          action={
            <Button onClick={run}>
              <Play className="h-4 w-4" aria-hidden="true" />
              Run simulation
            </Button>
          }
        >
          Press run to play the tournament thousands of times over one draw and turn the Elo ratings
          into title and advancement odds. Results update live as the runs accumulate.
        </EmptyState>
        </Reveal>
      ) : hasResults ? (
        <Reveal className="space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Runs played" value={done.toLocaleString()} />
            <Stat label="Favourite" value={leader.code} sub={leader.name} />
            <Stat label="Title odds" value={formatPct(leader.titlePct)} sub={`${leader.name} to win it all`} />
            <Stat label="Reaches final" value={formatPct(leader.finalPct)} sub={leader.name} />
          </div>

          <Callout tone="info" icon={Info}>
            These odds are conditional on a single group draw (seed{' '}
            <span className="font-mono text-ink">{seed}</span>). Advancement below is the chance of
            finishing top two; eight of the twelve third-placed teams also go through.{' '}
            <Link to="/" className="text-neonCyan underline-offset-4 hover:underline">
              Explore the draw →
            </Link>
          </Callout>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* chart */}
            <Card className="p-5 sm:p-6 lg:col-span-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-hair bg-fill text-neonCyan">
                  <Trophy className="h-4 w-4" aria-hidden="true" />
                </span>
                <h3 className="font-display text-lg font-semibold text-ink">Title odds</h3>
              </div>
              <p className="mt-1.5 text-sm text-muted">Top {CHART_ROWS} nations by share of simulated titles.</p>
              <div className="mt-4">
                <OddsChart data={chartData} />
              </div>
            </Card>

            {/* table */}
            <Card className="p-5 sm:p-6 lg:col-span-2">
              <h3 className="font-display text-lg font-semibold text-ink">Most likely champions</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hair text-left font-mono text-[11px] text-muted">
                      <th scope="col" className="pb-2 pr-2 font-medium">#</th>
                      <th scope="col" className="pb-2 pr-2 font-medium">Team</th>
                      <th scope="col" className="pb-2 pl-2 text-right font-medium">Title</th>
                      <th scope="col" className="pb-2 pl-2 text-right font-medium">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, TABLE_ROWS).map((r, i) => (
                      <tr key={r.code} className="border-b border-hair/60 last:border-0">
                        <td className="py-2 pr-2 font-mono text-xs text-muted tabular-nums">{i + 1}</td>
                        <td className="py-2 pr-2 text-ink">
                          <span className="font-mono text-xs text-muted">{r.code}</span> <span className="text-ink">{r.name}</span>
                        </td>
                        <td className="py-2 pl-2 text-right font-mono text-ink tabular-nums">{formatPct(r.titlePct)}</td>
                        <td className="py-2 pl-2 text-right font-mono text-muted tabular-nums">{formatPct(r.finalPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* advancement */}
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-ink">Group advancement</h3>
              <Badge tone="neutral">advance = top 2</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {advancement &&
                Object.entries(advancement).map(([label, teams]) => (
                  <AdvancementCard key={label} label={label} teams={teams} />
                ))}
            </div>
          </div>
        </Reveal>
      ) : null}
    </div>
  )
}
