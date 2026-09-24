import { useMemo, useState } from 'react'
import { Shuffle, MapPin, Users, AlertTriangle, Info } from 'lucide-react'
import { TEAMS, drawGroups, makeRng, PROVENANCE } from '@/engine/worldcup'
import { Button, Card, Panel, SectionHeading, Stat, Badge, Callout, Field, Input, Toggle } from '@/components/ui'
import Reveal from '@/components/Reveal'
import { CONFEDERATION_NAMES, randomSeed } from '@/lib/tournament'

// Fixed Elo band across the whole field, so a team's bar means the same thing in
// every group card (not autoscaled per group).
const ELO_MIN = Math.min(...TEAMS.map((t) => t.elo))
const ELO_MAX = Math.max(...TEAMS.map((t) => t.elo))
const eloFraction = (elo) => (elo - ELO_MIN) / (ELO_MAX - ELO_MIN)

function TeamRow({ team }) {
  return (
    <li className="rounded-xl border border-hair bg-fill px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-hair bg-fill font-mono text-[11px] text-muted" title={`Pot ${team.pot}`}>
            {team.pot}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm text-ink">{team.name}</span>
              {team.host && (
                <Badge tone="accent" className="shrink-0">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  Host
                </Badge>
              )}
            </div>
            <span className="font-mono text-[10px] text-muted" title={CONFEDERATION_NAMES[team.confederation]}>
              {team.confederation}
            </span>
          </div>
        </div>
        <span className="shrink-0 font-mono text-xs text-ink tabular-nums" aria-label={`Elo rating ${team.elo}`}>
          {team.elo}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-fill-strong" aria-hidden="true">
        <div className="h-full rounded-full bg-neonCyan" style={{ width: `${Math.max(4, eloFraction(team.elo) * 100)}%` }} />
      </div>
    </li>
  )
}

function GroupCard({ label, teams }) {
  const avg = Math.round(teams.reduce((s, t) => s + t.elo, 0) / teams.length)
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-neonCyan to-neonPurple font-display text-lg font-bold text-void">
            {label}
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">Group {label}</h3>
        </div>
        <span className="font-mono text-[11px] text-muted" title="Average Elo of the four teams">
          avg {avg}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {teams.map((t) => (
          <TeamRow key={t.code} team={t} />
        ))}
      </ul>
    </Card>
  )
}

export default function Draw() {
  const [seed, setSeed] = useState('kickoff-2026')
  const [realHosts, setRealHosts] = useState(true)

  const result = useMemo(() => {
    try {
      return { groups: drawGroups(TEAMS, makeRng(seed || 'seed'), realHosts), error: null }
    } catch (e) {
      return { groups: null, error: e?.message || 'The draw could not be completed.' }
    }
  }, [seed, realHosts])

  const labels = result.groups ? Object.keys(result.groups) : []

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeading
          eyebrow="// the draw"
          title="Group draw explorer"
          sub="All 48 qualified nations drawn into twelve groups of four, pot by pot, under the real FIFA constraints — one team per pot per group, and no group with two teams from the same confederation (bar UEFA, which may have two). Every draw is reproducible from its seed."
        />
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Teams" value="48" />
          <Stat label="Groups" value="12" />
          <Stat label="Ratings" value="Elo" sub={`as of ${PROVENANCE.eloAsOf}`} />
          <Stat label="Draw" value="Seeded" sub="Reproducible" />
        </div>
      </Reveal>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Field label="Draw seed" htmlFor="draw-seed" hint="Same seed → same draw, every time." className="sm:w-64">
              <Input
                id="draw-seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="e.g. kickoff-2026"
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            <Button variant="outline" onClick={() => setSeed(randomSeed())} className="shrink-0">
              <Shuffle className="h-4 w-4" aria-hidden="true" />
              Draw again
            </Button>
          </div>
          <div className="md:pb-2">
            <Toggle
              id="real-hosts"
              checked={realHosts}
              onChange={setRealHosts}
              label="Pre-place the three hosts"
            />
          </div>
        </div>
      </Panel>

      {realHosts && !result.error && (
        <Reveal>
          <Callout tone="info" icon={Info}>
            As in the real draw, the hosts are seeded to fixed groups — Mexico to Group A, Canada to
            Group B, and the United States to Group D. Turn the switch off for a fully open draw.
          </Callout>
        </Reveal>
      )}

      {result.error ? (
        <Reveal>
          <Callout tone="bad" icon={AlertTriangle} title="Draw failed">
            {result.error} Try a different seed.
          </Callout>
        </Reveal>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {labels.map((label, i) => (
            <Reveal key={label} delay={(i % 3) * 0.06}>
              <GroupCard label={label} teams={result.groups[label]} />
            </Reveal>
          ))}
        </div>
      )}

      <Reveal>
        <Callout tone="info" icon={Users} title="How to read a group">
          The number badge is a team&rsquo;s seeding pot (1 is top-seeded, 4 is lowest). The bar under
          each team scales its Elo rating against the whole field, so you can eyeball how balanced — or
          lopsided — a group came out.
        </Callout>
      </Reveal>
    </div>
  )
}
