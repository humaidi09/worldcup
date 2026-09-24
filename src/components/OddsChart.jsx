import { useLayoutEffect, useRef, useState } from 'react'
import { cx } from '@/lib/cx'
import { formatPct } from '@/lib/tournament'

// A hand-rolled SVG lollipop chart of title odds — no chart library. It measures
// its container and draws at real pixels so the labels stay crisp at every width.
// Colour never carries meaning alone: every row is named and shows its exact
// percentage, and the whole series is read out through the SVG's aria-label.

function useMeasure() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

const niceMax = (v) => {
  if (v <= 1) return 1
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

// data: [{ code, name, pct }] already sorted high → low. `pct` is 0–100.
export function OddsChart({ data, className }) {
  const [ref, width] = useMeasure()
  const rows = data.length
  const rowH = 30
  const padT = 8
  const padB = 16
  const labelW = 58
  const valueW = 56
  const height = padT + padB + rows * rowH
  const w = Math.max(width, 0)
  const trackX0 = labelW
  const trackX1 = Math.max(trackX0 + 10, w - valueW)
  const max = niceMax(Math.max(...data.map((d) => d.pct), 1))
  const x = (pct) => trackX0 + (Math.max(0, pct) / max) * (trackX1 - trackX0)

  const summary =
    data.length > 0
      ? `Title odds, most to least likely: ${data
          .slice(0, 6)
          .map((d) => `${d.name} ${formatPct(d.pct)}`)
          .join(', ')}.`
      : 'No results yet.'

  return (
    <div ref={ref} className={cx('w-full', className)}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={summary}>
          {/* vertical scale + ticks — quiet, decorative */}
          <g className="text-muted" fill="currentColor" aria-hidden="true">
            {[0, 0.5, 1].map((f) => {
              const gx = trackX0 + f * (trackX1 - trackX0)
              return (
                <g key={f}>
                  <line x1={gx} y1={padT} x2={gx} y2={height - padB} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
                  <text x={gx} y={height - 2} fontSize={9} textAnchor="middle" className="font-mono" opacity={0.65}>
                    {Math.round(f * max)}%
                  </text>
                </g>
              )
            })}
          </g>

          {/* baseline tracks */}
          <g className="text-muted">
            {data.map((d, i) => {
              const cy = padT + i * rowH + rowH / 2
              return <line key={d.code} x1={trackX0} y1={cy} x2={trackX1} y2={cy} stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} />
            })}
          </g>

          {/* value stems + heads — the single accent */}
          <g className="text-neonCyan">
            {data.map((d, i) => {
              const cy = padT + i * rowH + rowH / 2
              const dotX = x(d.pct)
              return (
                <g key={d.code}>
                  <line x1={trackX0} y1={cy} x2={dotX} y2={cy} stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
                  <circle cx={dotX} cy={cy} r={4} fill="currentColor" />
                </g>
              )
            })}
          </g>

          {/* team codes (left) + percentages (right) */}
          <g className="text-ink" fill="currentColor">
            {data.map((d, i) => {
              const cy = padT + i * rowH + rowH / 2
              return (
                <g key={d.code}>
                  <text x={0} y={cy + 4} className="font-mono" fontSize={12}>
                    {d.code}
                  </text>
                  <text x={w} y={cy + 4} textAnchor="end" className="font-mono tabular-nums" fontSize={12}>
                    {formatPct(d.pct)}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}
