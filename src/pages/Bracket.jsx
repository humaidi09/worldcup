import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Shuffle, Trophy, Medal, AlertTriangle, Info } from 'lucide-react'
import { teamOf } from '@/engine/worldcup'
import { Button, Card, Panel, SectionHeading, Badge, Callout, Field, Input } from '@/components/ui'
import { runDetailedTournament, randomSeed } from '@/lib/tournament'
import Reveal from '@/components/Reveal'

const name = (code) => teamOf(code)?.name ?? code

function TeamLine({ side }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">
          <span className="font-mono text-[11px] text-muted">{side.code}</span> {name(side.code)}
        </p>
        <p className="font-mono text-[10px] text-muted">{side.origin}</p>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{side.elo}</span>
    </div>
  )
}

function TieCard({ tie, index }) {
  const reduce = useReducedMotion()
  const fav = tie.favourite
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.24) }}
    >
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] text-muted">Match {tie.match}</span>
          <Badge tone="accent">{fav.even ? 'Coin toss' : `${fav.code} ${Math.round(fav.pct)}%`}</Badge>
        </div>
        <div className="mt-3 space-y-2">
          <TeamLine side={tie.a} />
          <div className="rule-gradient" aria-hidden="true" />
          <TeamLine side={tie.b} />
        </div>
      </Card>
    </motion.div>
  )
}

const PODIUM = [
  { key: 'champion', label: 'Champion', tone: 'accent' },
  { key: 'runnerUp', label: 'Runner-up', tone: 'neutral' },
  { key: 'third', label: 'Third place', tone: 'neutral' },
  { key: 'fourth', label: 'Fourth place', tone: 'neutral' },
]

export default function Bracket() {
  const [seed, setSeed] = useState('kickoff-2026')

  const result = useMemo(() => {
    try {
      return { data: runDetailedTournament(seed || 'seed'), error: null }
    } catch (e) {
      return { data: null, error: e?.message || 'The bracket could not be resolved.' }
    }
  }, [seed])

  const { data, error } = result
  const ko = data?.ko

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeading
          eyebrow="// knockouts"
          title="Knockout bracket"
          sub="One full tournament from a seed: the group stage feeds the real, published Round of 32 — thirty-two nations, sixteen ties — and the model plays it out to a champion. Re-seed to draw a different tournament."
        />
      </Reveal>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Field label="Tournament seed" htmlFor="bracket-seed" hint="Same seed → same bracket." className="sm:w-64">
            <Input
              id="bracket-seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. kickoff-2026"
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <Button variant="outline" onClick={() => setSeed(randomSeed())} className="shrink-0">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            Re-seed bracket
          </Button>
        </div>
      </Panel>

      {error ? (
        <Reveal>
          <Callout tone="bad" icon={AlertTriangle} title="Bracket failed">
            {error} Try a different seed.
          </Callout>
        </Reveal>
      ) : (
        <>
          {/* result */}
          <Reveal>
          <Card glow className="p-6 sm:p-8">
            <p className="eyebrow">// how it finished</p>
            <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-neonCyan to-neonPurple text-void">
                  <Trophy className="h-7 w-7" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-mono text-xs text-muted">Champion</p>
                  <p className="font-display text-3xl font-bold tracking-tight text-ink">{name(ko.champion)}</p>
                  <p className="mt-1 text-sm text-muted">
                    beat {name(ko.runnerUp)} in the final
                  </p>
                </div>
              </div>

              {/* the final pairing */}
              <div className="rounded-2xl border border-hair bg-fill p-4 sm:min-w-[15rem]">
                <p className="font-mono text-[11px] text-muted">The final</p>
                <div className="mt-2 space-y-1.5">
                  {ko.finalists.map((code) => {
                    const won = code === ko.champion
                    return (
                      <div key={code} className="flex items-center justify-between gap-2">
                        <span className={won ? 'text-sm font-semibold text-ink' : 'text-sm text-muted'}>{name(code)}</span>
                        {won && <Badge tone="accent">Winner</Badge>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* podium */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PODIUM.map((p) => (
                <div key={p.key} className="rounded-xl border border-hair bg-fill p-4">
                  <div className="flex items-center gap-1.5">
                    <Medal className={p.tone === 'accent' ? 'h-3.5 w-3.5 text-neonCyan' : 'h-3.5 w-3.5 text-muted'} aria-hidden="true" />
                    <span className="font-mono text-[11px] text-muted">{p.label}</span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-lg font-semibold text-ink">{name(ko[p.key])}</p>
                </div>
              ))}
            </div>
          </Card>
          </Reveal>

          {/* round of 32 */}
          <Reveal>
          <div>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-xl font-semibold text-ink">Round of 32</h3>
              <Badge tone="neutral">16 ties · matches 73–88</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.ties.map((tie, i) => (
                <TieCard key={tie.match} tie={tie} index={i} />
              ))}
            </div>
          </div>
          </Reveal>

          <Reveal>
          <Callout tone="info" icon={Info} title="What the model reports">
            The Round of 32 above is the real published bracket, resolved from this run&rsquo;s group
            winners, runners-up and eight best third-placed teams. Each tie&rsquo;s badge is the
            model&rsquo;s favourite by Elo. The interior ties are settled inside the engine — it
            reports the two finalists and the four medalists shown above.{' '}
            <Link to="/simulate" className="text-neonCyan underline-offset-4 hover:underline">
              Run it thousands of times →
            </Link>
          </Callout>
          </Reveal>
        </>
      )}
    </div>
  )
}
