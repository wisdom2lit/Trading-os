import { useMemo, useState } from 'react';
import { EquityPoint } from '../core/analytics';
import { formatCurrency, formatShortDate, formatSignedCurrency } from './Formatters';

interface EquityCurveChartProps {
  points: EquityPoint[];
  startingBalance: number;
  currency: 'USD' | 'EUR' | 'GBP';
}

export function EquityCurveChart({
  points,
  startingBalance,
  currency,
}: EquityCurveChartProps) {
  const [mode, setMode] = useState<'equity' | 'drawdown'>('equity');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const width = 760;
  const height = 270;
  const padLeft = 68;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const chartData = useMemo(() => {
    if (points.length === 0) return null;

    const values =
      mode === 'equity'
        ? points.map((p) => p.balance)
        : points.map((p) => -p.drawdownPct);

    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (mode === 'equity') {
      minVal = Math.min(minVal, startingBalance);
      maxVal = Math.max(maxVal, startingBalance);
    } else {
      maxVal = 0;
      minVal = Math.min(minVal, -1);
    }

    const span = maxVal - minVal || 1;
    const paddedMin = mode === 'equity' ? minVal - span * 0.08 : minVal - span * 0.1;
    const paddedMax = mode === 'equity' ? maxVal + span * 0.08 : 0;
    const totalSpan = paddedMax - paddedMin || 1;

    const coords = points.map((pt, i) => {
      const x =
        points.length === 1
          ? padLeft + innerW / 2
          : padLeft + (i / (points.length - 1)) * innerW;
      const val = mode === 'equity' ? pt.balance : -pt.drawdownPct;
      const y = padTop + ((paddedMax - val) / totalSpan) * innerH;
      return { x, y, pt, val };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    const baselineY =
      mode === 'equity'
        ? padTop + ((paddedMax - startingBalance) / totalSpan) * innerH
        : padTop;

    const areaPath =
      coords.length > 0
        ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(
            1
          )} L ${coords[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
        : '';

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = paddedMax - t * totalSpan;
      const y = padTop + t * innerH;
      return { val, y };
    });

    return { coords, linePath, areaPath, baselineY, yTicks };
  }, [points, mode, startingBalance, innerW, innerH]);

  const activePoint =
    hoveredIdx !== null && chartData?.coords[hoveredIdx]
      ? chartData.coords[hoveredIdx]
      : chartData?.coords[chartData.coords.length - 1] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">
            {mode === 'equity' ? 'Account Equity Curve' : 'Drawdown Depth (%)'}
          </h2>
          {activePoint ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums">
              <span className="text-slate-300">
                {formatShortDate(activePoint.pt.dateIso)}
              </span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-white font-semibold">
                {formatCurrency(activePoint.pt.balance, currency)}
              </span>
              {activePoint.pt.index > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span
                    className={
                      activePoint.pt.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }
                  >
                    {activePoint.pt.instrument}{' '}
                    {formatSignedCurrency(activePoint.pt.pnl, currency)}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span className="text-slate-400">
                    DD{' '}
                    {activePoint.pt.drawdownPct > 0
                      ? `-${activePoint.pt.drawdownPct.toFixed(2)}%`
                      : '0.00%'}
                  </span>
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Hover over data points to inspect equity progression
            </p>
          )}
        </div>

        <div className="inline-flex items-center p-1 rounded-lg bg-[#050505] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMode('equity')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              mode === 'equity'
                ? 'bg-gradient-to-r from-[#8A2BE2]/30 to-[#00BFFF]/30 text-white border border-[#00BFFF]/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Equity
          </button>
          <button
            type="button"
            onClick={() => setMode('drawdown')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              mode === 'drawdown'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Drawdown
          </button>
        </div>
      </div>

      {!chartData || points.length <= 1 ? (
        <div className="h-[240px] flex items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-xs text-slate-400">
          Record closed trades to generate your live equity curve.
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none"
            role="img"
            aria-label="Interactive account equity curve chart"
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <defs>
              <linearGradient id="axiomEquityStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8A2BE2" />
                <stop offset="100%" stopColor="#00BFFF" />
              </linearGradient>
              <linearGradient id="axiomEquityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.24" />
                <stop offset="65%" stopColor="#8A2BE2" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#050505" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="axiomDdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#050505" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Horizontal grid lines & Y-axis labels */}
            {chartData.yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={width - padRight}
                  y2={tick.y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {mode === 'equity'
                    ? `$${Math.round(tick.val).toLocaleString('en-US')}`
                    : `${tick.val.toFixed(1)}%`}
                </text>
              </g>
            ))}

            {/* Starting balance reference line */}
            {mode === 'equity' && (
              <line
                x1={padLeft}
                y1={chartData.baselineY}
                x2={width - padRight}
                y2={chartData.baselineY}
                stroke="rgba(255,255,255,0.16)"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            )}

            {/* Area Fill */}
            <path
              d={chartData.areaPath}
              fill={mode === 'equity' ? 'url(#axiomEquityFill)' : 'url(#axiomDdFill)'}
            />

            {/* Main Line */}
            <path
              d={chartData.linePath}
              fill="none"
              stroke={mode === 'equity' ? 'url(#axiomEquityStroke)' : '#F43F5E'}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Crosshair for hovered point */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1={padTop}
                  x2={activePoint.x}
                  y2={padTop + innerH}
                  stroke="rgba(0,191,255,0.35)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="6"
                  fill={mode === 'equity' ? 'rgba(0,191,255,0.22)' : 'rgba(244,63,94,0.25)'}
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="3.2"
                  fill={mode === 'equity' ? '#00BFFF' : '#F43F5E'}
                  stroke="#050505"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* X-axis sparse labels */}
            {chartData.coords.map((c, idx) => {
              const showLabel =
                idx === 0 ||
                idx === chartData.coords.length - 1 ||
                (chartData.coords.length > 5 &&
                  idx === Math.floor(chartData.coords.length / 2));
              if (!showLabel) return null;
              return (
                <text
                  key={c.pt.tradeId}
                  x={c.x}
                  y={height - 10}
                  textAnchor={
                    idx === 0
                      ? 'start'
                      : idx === chartData.coords.length - 1
                      ? 'end'
                      : 'middle'
                  }
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {idx === 0 ? 'Start' : formatShortDate(c.pt.dateIso)}
                </text>
              );
            })}

            {/* Interactive Hover Targets */}
            {chartData.coords.map((c, idx) => {
              const sliceW =
                chartData.coords.length > 1
                  ? innerW / (chartData.coords.length - 1)
                  : innerW;
              return (
                <rect
                  key={`hit-${c.pt.tradeId}`}
                  x={c.x - sliceW / 2}
                  y={padTop}
                  width={Math.max(18, sliceW)}
                  height={innerH}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onFocus={() => setHoveredIdx(idx)}
                />
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}
