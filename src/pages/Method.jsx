import { Link } from 'react-router-dom'
import {
  Database,
  Shuffle,
  Sigma,
  ListOrdered,
  Trophy,
  Repeat,
  KeyRound,
  TriangleAlert,
  ArrowRight,
} from 'lucide-react'
import { PROVENANCE, BASE_GOALS, GOAL_TILT, BEST_THIRDS, WIN_POINTS, DRAW_POINTS } from '@/engine/worldcup'
import { Card, Callout, SectionHeading, Badge, Button } from '@/components/ui'
import Reveal from '@/components/Reveal'

function Chip({ children }) {
  return <code className="rounded bg-fill px-1.5 py-0.5 font-mono text-[13px] text-ink">{children}</code>
}

export default function Method() {
  const SECTIONS = [
    {
      icon: Database,
      title: 'Data and ratings',
      body: (
        <>
          Everything starts from one input: a dated snapshot of World Football Elo ratings for the 48
          qualified nations, taken from {PROVENANCE.eloSource} on <Chip>{PROVENANCE.eloAsOf}</Chip>. Elo
          is a single number for current strength — the gap between two teams, not their absolute
          values, is what drives every result. The snapshot is deliberately fixed, not live, so a
          given seed reproduces the same tournament on every machine.
        </>
      ),
    },
    {
      icon: Shuffle,
      title: 'The draw',
      body: (
        <>
          Teams are seeded into four pots of twelve by rating, with the three hosts in Pot 1. The draw
          fills the twelve groups pot by pot — one team from each pot per group — under the real
          constraints: no group may hold two teams from the same confederation, except UEFA, which with
          sixteen European sides may have up to two. Mexico, Canada and the United States are
          pre-placed into Groups A, B and D, exactly as the real draw fixed them. A seeded shuffle plus
          backtracking guarantees a valid, reproducible result.
        </>
      ),
    },
    {
      icon: Sigma,
      title: 'From ratings to a scoreline',
      body: (
        <>
          A match is not a weighted coin — it is a scoreline. The Elo gap becomes a win expectancy on
          the standard logistic curve, and that expectancy tilts a neutral baseline of{' '}
          <Chip>{BASE_GOALS}</Chip> expected goals per side (tilt strength <Chip>{GOAL_TILT}</Chip>).
          Each side&rsquo;s goals are then drawn independently from a Poisson distribution. The result
          is wins, draws and the goal differences the group tiebreakers actually need — not just a
          verdict.
        </>
      ),
    },
    {
      icon: ListOrdered,
      title: 'Group stage and tiebreakers',
      body: (
        <>
          Each group is a round robin of six matches — <Chip>{WIN_POINTS}</Chip> points for a win,{' '}
          <Chip>{DRAW_POINTS}</Chip> for a draw. Teams are ranked by the official FIFA key: points,
          then goal difference, then goals scored. Sides still level are separated by their
          head-to-head results among only the tied teams, and anything that remains even is settled by
          drawing of lots. FIFA&rsquo;s fair-play criterion is omitted — the model books no cards.
        </>
      ),
    },
    {
      icon: Trophy,
      title: 'Best thirds and the knockouts',
      body: (
        <>
          The twelve group winners and twelve runners-up advance, joined by the{' '}
          <Chip>{BEST_THIRDS}</Chip> best third-placed teams. They fill the real, published Round of
          32; the eight &ldquo;winner versus third&rdquo; slots honour FIFA&rsquo;s actual eligibility
          rules through a deterministic solver. From there it is straight single elimination. A tie
          still level after regulation is decided by an Elo-weighted coin flip — the model&rsquo;s
          stand-in for extra time and penalties.
        </>
      ),
    },
    {
      icon: Repeat,
      title: 'Monte Carlo',
      body: (
        <>
          Any single tournament is one roll of the dice. To turn ratings into odds, the simulator draws
          the groups once and then replays the entire tournament thousands of times, tallying how often
          each nation lifts the trophy or reaches the final. Divide by the number of runs and you have a
          probability; more runs make that estimate steadier.
        </>
      ),
    },
    {
      icon: KeyRound,
      title: 'Reproducibility',
      body: (
        <>
          All randomness flows through one seeded generator. A text seed hashes to a starting state, so
          the same seed reproduces the exact same draw and the exact same runs, on any machine and
          every reload. That is why every screen here exposes its seed — change it and you get a
          genuinely different, but equally repeatable, tournament.
        </>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeading
          eyebrow="// methodology"
          title="How the model works"
          sub="A faithful in-browser port of an offline World Cup engine: real teams, real Elo ratings, the real draw rules and the real knockout bracket, with a Monte Carlo layer that turns all of it into odds. Here is every step, in order."
        />
      </Reveal>

      <Reveal>
      <Card glow className="p-6 sm:p-8">
        <p className="eyebrow">// the one-line version</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
          Ratings become scorelines; scorelines become a tournament; thousands of tournaments become
          odds.
        </h2>
        <p className="mt-3 max-w-2xl text-muted">
          No result is hand-tuned. Feed the same Elo snapshot and the same seed into the same rules and
          you get the same World Cup — every time.
        </p>
      </Card>
      </Reveal>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.title} delay={(i % 3) * 0.06}>
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-hair bg-fill text-neonCyan">
                <s.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
                </div>
                <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
              </div>
            </div>
          </Card>
          </Reveal>
        ))}
      </div>

      <Reveal>
      <Callout tone="warn" icon={TriangleAlert} title="What the model does not know">
        Form, injuries, tactics, weather, travel and home advantage beyond a neutral baseline are all
        outside it. The ratings are a fixed snapshot, fair play is ignored, and the third-place slot
        allocation is a documented simplification of FIFA&rsquo;s full 495-row table. Read every figure
        as a prediction from one model — never a claim of fact.
      </Callout>
      </Reveal>

      <Reveal>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">Prediction, not prophecy</Badge>
        <span className="text-sm text-muted">Python engine, ported to JavaScript — the rules are unchanged.</span>
        <Button as={Link} to="/simulate" variant="outline" size="sm" className="ml-auto">
          Run the simulator
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      </Reveal>
    </div>
  )
}
