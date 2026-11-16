import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DailyCalendarStats, getHeatmapTier } from '../core/analytics';
import { Trade, TradingAccount } from '../core/types';
import { formatSignedCurrency, formatTimeUtc } from './Formatters';

interface TradingCalendarHeatmapProps {
  dailyCalendar: Record<string, DailyCalendarStats>;
  trades: Trade[];
  account: TradingAccount;
  onInspectTrade: (trade: Trade) => void;
}

const PROFIT_TIER_CLASSES: Record<number, string> = {
  1: 'bg-emerald-500/12 border-emerald-500/25 text-emerald-200',
  2: 'bg-emerald-500/22 border-emerald-500/40 text-emerald-200',
  3: 'bg-emerald-500/34 border-emerald-400/55 text-emerald-100',
  4: 'bg-emerald-500/48 border-emerald-400/75 text-white',
};

const LOSS_TIER_CLASSES: Record<number, string> = {
  1: 'bg-rose-500/12 border-rose-500/25 text-rose-200',
  2: 'bg-rose-500/22 border-rose-500/40 text-rose-200',
  3: 'bg-rose-500/34 border-rose-400/55 text-rose-100',
  4: 'bg-rose-500/48 border-rose-400/75 text-white',
};

export function TradingCalendarHeatmap({
  dailyCalendar,
  trades,
  account,
  onInspectTrade,
}: TradingCalendarHeatmapProps) {
  const defaultMonth = useMemo(() => {
    const keys = Object.keys(dailyCalendar).sort();
    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      return { year: Number(lastKey.slice(0, 4)), month: Number(lastKey.slice(5, 7)) - 1 };
    }
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  }, [dailyCalendar]);

  const [calMonth, setCalMonth] = useState<{ year: number; month: number }>(defaultMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthPrefix = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, '0')}`;

  const { maxProfit, maxLossAbs, monthNetPnL, greenDays, redDays, activeDays } = useMemo(() => {
    const allStats = Object.values(dailyCalendar);
    const maxP = allStats.reduce((m, s) => (s.pnl > m ? s.pnl : m), 0);
    const maxL = allStats.reduce((m, s) => (s.pnl < 0 && Math.abs(s.pnl) > m ? Math.abs(s.pnl) : m), 0);

    const monthStats = allStats.filter((s) => s.date.startsWith(monthPrefix));
    const net = monthStats.reduce((acc, s) => acc + s.pnl, 0);
    const greens = monthStats.filter((s) => s.pnl > 0).length;
    const reds = monthStats.filter((s) => s.pnl < 0).length;

    return {
      maxProfit: maxP,
      maxLossAbs: maxL,
      monthNetPnL: Number(net.toFixed(2)),
      greenDays: greens,
      redDays: reds,
      activeDays: monthStats.length,
    };
  }, [dailyCalendar, monthPrefix]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(Date.UTC(calMonth.year, calMonth.month, 1));
    const startWeekday = (firstDay.getUTCDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(Date.UTC(calMonth.year, calMonth.month + 1, 0)).getUTCDate();
    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ day: null, dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const mm = String(calMonth.month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, dateKey: `${calMonth.year}-${mm}-${dd}` });
    }
    return cells;
  }, [calMonth]);

  const monthTitle = new Date(Date.UTC(calMonth.year, calMonth.month, 1)).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: 'UTC' }
  );

  const shiftMonth = (delta: number) => {
    setCalMonth((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  };

  const selectedDayStat = selectedDate ? dailyCalendar[selectedDate] || null : null;

  const selectedDayTrades = useMemo(() => {
    if (!selectedDate) return [];
    return trades
      .filter(
        (t) =>
          t.accountId === account.id &&
          t.status === 'Closed' &&
          (t.exitTime || t.entryTime).slice(0, 10) === selectedDate
      )
      .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
  }, [selectedDate, trades, account.id]);

  return (
    <section className="lg:col-span-6 glass-panel rounded-xl p-6 space-y-4">
      {/* Header & Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Trading Calendar</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily P&amp;L heatmap — click any day to review trade breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-white min-w-[112px] text-center">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month Summary Strip & Heatmap Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span
            className={`font-semibold ${
              monthNetPnL > 0
                ? 'text-emerald-400'
                : monthNetPnL < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {formatSignedCurrency(monthNetPnL, account.currency)}
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-400">
            <span className="text-emerald-400">{greenDays}G</span> /{' '}
            <span className="text-rose-400">{redDays}L</span> ({activeDays}d)
          </span>
        </div>

        {/* Intensity Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400" aria-label="Heatmap intensity legend">
          <span>Loss</span>
          <span className="w-3 h-3 rounded-sm bg-rose-500/48 border border-rose-400/75" />
          <span className="w-3 h-3 rounded-sm bg-rose-500/22 border border-rose-500/40" />
          <span className="w-3 h-3 rounded-sm bg-white/[0.03] border border-white/[0.08]" />
          <span className="w-3 h-3 rounded-sm bg-emerald-500/22 border border-emerald-500/40" />
          <span className="w-3 h-3 rounded-sm bg-emerald-500/48 border border-emerald-400/75" />
          <span>Profit</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-mono text-slate-500">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label={`Trading calendar for ${monthTitle}`}>
        {calendarCells.map((cell, idx) => {
          if (!cell.day || !cell.dateKey) {
            return <div key={`empty-${idx}`} className="h-14 rounded-lg bg-white/[0.01]" />;
          }

          const stat = dailyCalendar[cell.dateKey];
          const isSelected = selectedDate === cell.dateKey;
          const intensity = stat
            ? getHeatmapTier(stat.pnl, maxProfit, maxLossAbs)
            : { direction: 'flat' as const, tier: 0 as const };

          const cellTone =
            intensity.direction === 'profit'
              ? PROFIT_TIER_CLASSES[intensity.tier]
              : intensity.direction === 'loss'
              ? LOSS_TIER_CLASSES[intensity.tier]
              : stat
              ? 'bg-white/[0.06] border-white/[0.15] text-slate-200'
              : 'bg-white/[0.02] border-white/[0.05] text-slate-500';

          const accessibleLabel = stat
            ? `${cell.dateKey}: ${formatSignedCurrency(stat.pnl, account.currency)}, ${stat.tradesCount} trades`
            : `${cell.dateKey}: No trades`;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : cell.dateKey!)}
              aria-label={accessibleLabel}
              aria-pressed={isSelected}
              data-heatmap-tier={`${intensity.direction}-${intensity.tier}`}
              className={`h-14 p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all hover:border-[#00BFFF]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF] ${cellTone} ${
                isSelected ? 'ring-2 ring-[#00BFFF] ring-offset-1 ring-offset-[#050505]' : ''
              }`}
            >
              <span className="text-[10px] font-mono opacity-85">{cell.day}</span>
              {stat && (
                <div className="leading-tight">
                  <div className="text-[11px] font-mono font-semibold tabular-nums truncate">
                    {stat.pnl >= 0 ? '+' : '-'}$
                    {Math.abs(Math.round(stat.pnl)).toLocaleString('en-US')}
                  </div>
                  <div className="text-[9px] font-mono opacity-80">
                    {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Drill-Down Summary */}
      {selectedDate && (
        <div
          className="mt-2 pt-4 border-t border-white/[0.08] space-y-3"
          data-testid="calendar-day-summary"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-white font-semibold">{selectedDate}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                {selectedDayStat ? (
                  <>
                    <span
                      className={
                        selectedDayStat.pnl >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'
                      }
                    >
                      {formatSignedCurrency(selectedDayStat.pnl, account.currency)}
                    </span>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-slate-400">
                      {selectedDayStat.wins}W {selectedDayStat.losses}L ({selectedDayStat.tradesCount} total)
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">No closed trades</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Close day summary"
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedDayTrades.length === 0 ? (
            <p className="text-xs text-slate-500">
              No closed executions recorded on {selectedDate}.
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06] rounded-lg bg-[#050505]/70 border border-white/[0.06] px-3">
              {selectedDayTrades.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onInspectTrade(t)}
                  className="w-full py-2.5 flex items-center justify-between gap-3 text-left text-xs hover:bg-white/[0.03] -mx-3 px-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-semibold">{t.instrument}</span>
                      <span
                        className={
                          t.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {t.direction}
                      </span>
                      <span className="text-slate-500">{formatTimeUtc(t.entryTime)}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {t.setupType} · {t.session} · {t.lotSize.toFixed(2)} lots · Grade {t.setupQuality}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div
                      className={`font-semibold ${
                        t.actualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatSignedCurrency(t.actualPnL, account.currency)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {t.riskAmount > 0 ? `${(t.actualPnL / t.riskAmount).toFixed(2)}R` : '—'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
