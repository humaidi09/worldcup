import { useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown, Search, MapPin, Info, SearchX } from 'lucide-react'
import { TEAMS, PROVENANCE } from '@/engine/worldcup'
import { Card, Panel, SectionHeading, Stat, Badge, Callout, Field, Input, Select, Button, EmptyState } from '@/components/ui'
import { cx } from '@/lib/cx'
import { CONFEDERATION_NAMES } from '@/lib/tournament'
import Reveal from '@/components/Reveal'

const ELO_MIN = Math.min(...TEAMS.map((t) => t.elo))
const ELO_MAX = Math.max(...TEAMS.map((t) => t.elo))
const eloFraction = (elo) => (elo - ELO_MIN) / (ELO_MAX - ELO_MIN)

const CONFEDERATIONS = [...new Set(TEAMS.map((t) => t.confederation))].sort()
const TOP_RATED = [...TEAMS].sort((a, b) => b.elo - a.elo)[0]

const DEFAULT_DIR = { team: 'asc', confederation: 'asc', pot: 'asc', elo: 'desc' }
const COMPARE = {
  team: (a, b) => a.name.localeCompare(b.name),
  confederation: (a, b) => a.confederation.localeCompare(b.confederation) || a.name.localeCompare(b.name),
  pot: (a, b) => a.pot - b.pot || b.elo - a.elo,
  elo: (a, b) => a.elo - b.elo,
}

function SortHeader({ label, colKey, sortKey, sortDir, onSort, className }) {
  const active = sortKey === colKey
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className={className}>
      <button
        type="button"
        onClick={() => onSort(colKey)}
        className={cx(
          'inline-flex items-center gap-1 rounded-md font-mono text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neonCyan',
          active ? 'text-ink' : 'text-muted hover:text-ink',
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden="true" />
      </button>
    </th>
  )
}

export default function Ratings() {
  const [sortKey, setSortKey] = useState('elo')
  const [sortDir, setSortDir] = useState('desc')
  const [conf, setConf] = useState('all')
  const [query, setQuery] = useState('')

  const onSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(DEFAULT_DIR[key])
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = TEAMS.filter((t) => {
      if (conf !== 'all' && t.confederation !== conf) return false
      if (q && !t.name.toLowerCase().includes(q) && !t.code.toLowerCase().includes(q)) return false
      return true
    })
    const cmp = COMPARE[sortKey]
    filtered.sort((a, b) => (sortDir === 'asc' ? cmp(a, b) : -cmp(a, b)))
    return filtered
  }, [sortKey, sortDir, conf, query])

  const clearFilters = () => {
    setConf('all')
    setQuery('')
  }
  const filtering = conf !== 'all' || query.trim() !== ''

  return (
    <div className="space-y-8">
      <Reveal>
        <SectionHeading
          eyebrow="// ratings"
          title="Team ratings"
          sub="The dated World Football Elo snapshot the whole model reads. Higher is stronger; the gap between two teams is what the match engine turns into a scoreline. Sort or filter to explore the field."
        />
      </Reveal>

      <Reveal>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Teams" value="48" />
          <Stat label="Top rated" value={TOP_RATED.code} sub={`${TOP_RATED.name} · ${TOP_RATED.elo}`} />
          <Stat label="Confederations" value={CONFEDERATIONS.length} />
          <Stat label="Elo as of" value={PROVENANCE.eloAsOf} sub="Fixed snapshot" />
        </div>
      </Reveal>

      <Reveal>
        <Callout tone="info" icon={Info}>
          Ratings come from {PROVENANCE.eloSource}. {PROVENANCE.note}
        </Callout>
      </Reveal>

      <Panel className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <Field label="Search" htmlFor="rt-search" className="sm:w-64">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input
                id="rt-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Team name or code"
                className="pl-9"
                autoComplete="off"
              />
            </div>
          </Field>
          <Field label="Confederation" htmlFor="rt-conf" className="sm:w-64">
            <Select id="rt-conf" value={conf} onChange={(e) => setConf(e.target.value)}>
              <option value="all">All confederations</option>
              {CONFEDERATIONS.map((c) => (
                <option key={c} value={c}>
                  {CONFEDERATION_NAMES[c] ?? c}
                </option>
              ))}
            </Select>
          </Field>
          <p className="font-mono text-xs text-muted sm:pb-2.5">
            {rows.length} of {TEAMS.length}
          </p>
        </div>
      </Panel>

      <Reveal>
      {rows.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No teams match"
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        >
          Nothing matches those filters. Widen the search or pick a different confederation.
        </EmptyState>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Team Elo ratings, sortable by team, confederation, pot and rating.
              </caption>
              <thead>
                <tr className="border-b border-hair text-left">
                  <th scope="col" className="px-4 py-3 font-mono text-[11px] font-medium text-muted">#</th>
                  <SortHeader label="Team" colKey="team" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-left" />
                  <SortHeader label="Confed." colKey="confederation" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden px-4 py-3 text-left sm:table-cell" />
                  <SortHeader label="Pot" colKey="pot" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="hidden px-4 py-3 text-left sm:table-cell" />
                  <SortHeader label="Elo" colKey="elo" sortKey={sortKey} sortDir={sortDir} onSort={onSort} className="px-4 py-3 text-right [&>button]:flex-row-reverse" />
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr key={t.code} className="border-b border-hair/50 transition-colors last:border-0 hover:bg-fill">
                    <td className="px-4 py-3 font-mono text-xs text-muted tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted">{t.code}</span>
                        <span className="text-ink">{t.name}</span>
                        {t.host && (
                          <Badge tone="accent" className="shrink-0">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            Host
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell" title={CONFEDERATION_NAMES[t.confederation]}>
                      <span className="font-mono text-xs text-muted">{t.confederation}</span>
                    </td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-muted tabular-nums sm:table-cell">{t.pot}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-fill-strong sm:block" aria-hidden="true">
                          <div className="h-full rounded-full bg-neonCyan" style={{ width: `${Math.max(4, eloFraction(t.elo) * 100)}%` }} />
                        </div>
                        <span className="font-mono text-sm text-ink tabular-nums">{t.elo}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </Reveal>
    </div>
  )
}
