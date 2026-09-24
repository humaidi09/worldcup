// View-layer helpers for the World Cup screens. Everything here WRAPS the ported
// engine (src/engine/worldcup.js) — it never re-implements the model (Elo →
// scoreline, tiebreakers, draw rules, knockout resolution all live in the engine).
// What it adds is orchestration + formatting the screens need but the engine's
// top-level helpers don't hand back directly (e.g. the resolved Round-of-32 draw
// and the medalists of a single run).

import {
  TEAMS,
  teamElo,
  drawGroups,
  simulateScoreline,
  orderGroup,
  rankThirdPlaced,
  buildRoundOf32,
  allocateThirds,
  simulateKnockout,
  BEST_THIRDS,
  ROUND_OF_32,
  makeRng,
  winExpectancy,
} from '@/engine/worldcup'

/* ----------------------------------------------------------------- labels -- */

// Full names for the six confederation codes the engine tags teams with.
export const CONFEDERATION_NAMES = {
  UEFA: 'Europe (UEFA)',
  CONMEBOL: 'South America (CONMEBOL)',
  CONCACAF: 'North & Central America (CONCACAF)',
  CAF: 'Africa (CAF)',
  AFC: 'Asia (AFC)',
  OFC: 'Oceania (OFC)',
}

export const POT_LABEL = { 1: 'Pot 1', 2: 'Pot 2', 3: 'Pot 3', 4: 'Pot 4' }

/* ------------------------------------------------------------- formatting -- */

/** A probability already in 0–100 → a compact, honest percentage string. */
export function formatPct(pct) {
  if (!Number.isFinite(pct) || pct <= 0) return '0%'
  if (pct < 0.1) return '<0.1%'
  return `${pct.toFixed(1)}%`
}

/** 1 → "1st", 2 → "2nd", 3 → "3rd", 4 → "4th". */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/** A fresh, human-friendly random text seed (fed to the engine's makeRng). */
export function randomSeed() {
  const words = ['kickoff', 'golazo', 'stoppage', 'extra-time', 'panenka', 'catenaccio', 'tiki-taka', 'nutmeg', 'volley', 'header']
  const w = words[Math.floor(Math.random() * words.length)]
  return `${w}-${Math.random().toString(36).slice(2, 6)}`
}

/* --------------------------------------------------- display-only helpers -- */
// Trivial arithmetic on the engine's own record shape — presentation, not model.

export function pointsOf(r) {
  return r.won * 3 + r.drawn
}
export function goalDiffOf(r) {
  return r.goalsFor - r.goalsAgainst
}

/** The model's favourite for a one-off tie, via the engine's Elo win curve. */
export function tieFavourite(codeA, codeB) {
  const pA = winExpectancy(teamElo(codeA), teamElo(codeB))
  const favouredIsA = pA >= 0.5
  return {
    code: favouredIsA ? codeA : codeB,
    pct: (favouredIsA ? pA : 1 - pA) * 100,
    even: Math.abs(pA - 0.5) < 0.02,
  }
}

/* -------------------------------------------------- one detailed run wrap -- */

// Enumerate a group's six pairings in the engine's fixed order. Pure combinatorics
// (all unordered pairs) — the match outcomes still come from the engine.
function roundRobin(codes) {
  const out = []
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) out.push([codes[i], codes[j]])
  }
  return out
}

const originLabel = ([kind, key], slotToGroup) => {
  if (kind === 'W') return `Winner ${key}`
  if (kind === 'R') return `Runner-up ${key}`
  return `3rd · Grp ${slotToGroup[key] ?? '?'}`
}

/**
 * Play one whole tournament for a seed and hand back the artifacts the Bracket
 * screen needs — the resolved Round-of-32 draw and the medalists — which the
 * engine's playTournament() computes internally but does not return. This mirrors
 * playTournament()'s own composition of the engine's exported building blocks
 * (drawGroups → per-group scorelines → orderGroup → rankThirdPlaced →
 * buildRoundOf32 → simulateKnockout); no model rule is duplicated here.
 */
export function runDetailedTournament(seed) {
  const rng = makeRng(seed)
  const groups = drawGroups(TEAMS, rng)
  const labels = Object.keys(groups)

  const standings = {}
  const groupOrder = {}
  const thirds = []
  for (const label of labels) {
    const codes = groups[label].map((t) => t.code)
    const matches = roundRobin(codes).map(([a, b]) => {
      const [goalsA, goalsB] = simulateScoreline(teamElo(a), teamElo(b), rng)
      return { a, b, goalsA, goalsB }
    })
    const ordered = orderGroup(codes, matches, rng)
    standings[label] = ordered
    groupOrder[label] = ordered.map((r) => r.code)
    thirds.push({ label, record: ordered[2] })
  }

  const ranked = rankThirdPlaced(thirds, rng)
  const bestThirds = new Set(ranked.slice(0, BEST_THIRDS).map((p) => p.record.code))

  const winners = {}
  const runnersUp = {}
  const thirdsByGroup = {}
  for (const label of labels) {
    winners[label] = groupOrder[label][0]
    runnersUp[label] = groupOrder[label][1]
    const thirdCode = groupOrder[label][2]
    if (bestThirds.has(thirdCode)) thirdsByGroup[label] = thirdCode
  }

  const roundOf32 = buildRoundOf32(winners, runnersUp, thirdsByGroup)
  const slotToGroup = allocateThirds(Object.keys(thirdsByGroup))
  const ko = simulateKnockout(roundOf32, rng)

  // Zip the engine's schedule structure with the resolved codes for rich labels.
  const ties = ROUND_OF_32.map(([sideA, sideB], i) => {
    const [codeA, codeB] = roundOf32[i]
    const fav = tieFavourite(codeA, codeB)
    return {
      match: 73 + i,
      a: { code: codeA, origin: originLabel(sideA, slotToGroup), elo: teamElo(codeA) },
      b: { code: codeB, origin: originLabel(sideB, slotToGroup), elo: teamElo(codeB) },
      favourite: fav,
    }
  })

  return { groups, standings, groupOrder, winners, runnersUp, thirdsByGroup, ties, ko, bestThirds }
}
