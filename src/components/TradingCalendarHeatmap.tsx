import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { DailyCalendarStats, getHeatmapTier } from '../core/analytics';
import { Trade, TradingAccount } from '../core/types';
import { formatSignedCurrency, formatTimeUtc } from './Formatters';

interface TradingCalendarHeatmapProps {
  dailyCalendar: Record<string, DailyCalendarStats>;
  trades: Trade[];
  account: TradingAccount | null;
  onInspectTrade: (trade: Trade) => void;
}

const PROFIT_TIER_CLASSES: Record<number, string> = {
  1: 'bg-emerald-500/14 border-emerald-500/32 text-emerald-200',
  2: 'bg-emerald-500/24 border-emerald-500/48 text-emerald-100',
  3: 'bg-emerald-500/36 border-emerald-400/62 text-[#FAF6EE]',
  4: 'bg-emerald-500/50 border-emerald-400/82 text-[#FAF6EE] shadow-[0_0_22px_-6px_rgba(16,185,129,0.52)]',
};

const LOSS_TIER_CLASSES: Record<number, string> = {
  1: 'bg-rose-500/14 border-rose-500/32 text-rose-200',
  2: 'bg-rose-500/24 border-rose-500/48 text-rose-100',
  3: 'bg-rose-500/36 border-rose-400/62 text-[#FAF6EE]',
  4: 'bg-rose-500/50 border-rose-400/82 text-[#FAF6EE] shadow-[0_0_22px_-6px_rgba(244,63,94,0.48)]',
};

export function TradingCalendarHeatmap({
  dailyCalendar,
  trades,
  account,
  onInspectTrade,
}: TradingCalendarHeatmapProps) {
  const currency = account?.currency || 'USD';

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
    const maxL = allStats.reduce(
      (m, s) => (s.pnl < 0 && Math.abs(s.pnl) > m ? Math.abs(s.pnl) : m),
      0
    );

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
    const startWeekday = (firstDay.getUTCDay() + 6) % 7;
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
    if (!selectedDate || !account) return [];
    return trades
      .filter(
        (t) =>
          t.accountId === account.id &&
          t.status === 'Closed' &&
          (t.exitTime || t.entryTime).slice(0, 10) === selectedDate
      )
      .sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
  }, [selectedDate, trades, account]);

  return (
    <section className="lg:col-span-8 glass-surface rounded-[28px] p-5 sm:p-7 space-y-5">
      {/* Header & Liquid Glass Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#E8D7A8]/14">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#FAF6EE]">Trading Calendar</h2>
          <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] mt-0.5">
            Daily profitability heatmap — select any session day to inspect executed trades
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="glass-control p-2.5 rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 text-[#B7FF00]" />
          </button>
          <span className="text-xs sm:text-sm font-mono font-extrabold text-[#FAF6EE] min-w-[140px] text-center">
            {monthTitle}
          </span>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="glass-control p-2.5 rounded-xl"
          >
            <ChevronRight className="w-4 h-4 text-[#B7FF00]" />
          </button>
        </div>
      </div>

      {/* Month Summary Strip & Heatmap Scale Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-3 font-mono tabular-nums">
          <span
            className={`text-base font-extrabold ${
              monthNetPnL > 0
                ? 'text-emerald-400'
                : monthNetPnL < 0
                ? 'text-rose-400'
                : 'text-[#FAF6EE]'
            }`}
          >
            {formatSignedCurrency(monthNetPnL, currency)}
          </span>
          <span className="text-[#E8D7A8]/30" aria-hidden="true">
            ·
          </span>
          <span className="font-bold text-[#C9BA9E]">
            <span className="text-emerald-400">{greenDays}G</span> /{' '}
            <span className="text-rose-400">{redDays}L</span> ({activeDays} active days)
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 text-xs font-bold text-[#C9BA9E]"
          aria-label="Heatmap intensity legend"
        >
          <span>Loss</span>
          <span className="w-3.5 h-3.5 rounded-md bg-rose-500/50 border border-rose-400/80" />
          <span className="w-3.5 h-3.5 rounded-md bg-rose-500/24 border border-rose-500/48" />
          <span className="w-3.5 h-3.5 rounded-md bg-[#160F0A] border border-[#E8D7A8]/15" />
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/24 border border-emerald-500/48" />
          <span className="w-3.5 h-3.5 rounded-md bg-emerald-500/50 border border-emerald-400/80" />
          <span>Profit</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 sm:gap-2.5 text-center text-xs font-mono font-bold text-[#9C8C72]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="py-1 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Spacious Liquid Glass Heatmap Grid */}
      <div
        className="grid grid-cols-7 gap-2 sm:gap-2.5"
        role="grid"
        aria-label={`Trading calendar for ${monthTitle}`}
      >
        {calendarCells.map((cell, idx) => {
          if (!cell.day || !cell.dateKey) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[68px] sm:min-h-[82px] rounded-2xl bg-[#140D09]/35 border border-[#E8D7A8]/[0.05]"
              />
            );
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
              ? 'bg-[#24180F]/65 border-[#E8D7A8]/28 text-[#FAF6EE]'
              : 'glass-well text-[#9C8C72] hover:border-[#B7FF00]/55 hover:text-[#E8D7A8]';

          const accessibleLabel = stat
            ? `${cell.dateKey}: ${formatSignedCurrency(stat.pnl, currency)}, ${stat.tradesCount} trades`
            : `${cell.dateKey}: No trades`;

          return (
            <button
              key={cell.dateKey}
              type="button"
              onClick={() => setSelectedDate(isSelected ? null : cell.dateKey!)}
              aria-label={accessibleLabel}
              aria-pressed={isSelected}
              data-heatmap-tier={`${intensity.direction}-${intensity.tier}`}
              className={`min-h-[68px] sm:min-h-[82px] p-2 sm:p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all hover:scale-[1.015] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B7FF00] ${cellTone} ${
                isSelected ? 'ring-2 ring-[#B7FF00] ring-offset-2 ring-offset-[#050505]' : ''
              }`}
            >
              <span className="text-xs font-mono font-bold opacity-90">{cell.day}</span>
              {stat && (
                <div className="leading-tight space-y-0.5">
                  <div className="text-xs font-mono font-extrabold tabular-nums truncate">
                    {stat.pnl >= 0 ? '+' : '-'}$
                    {Math.abs(Math.round(stat.pnl)).toLocaleString('en-US')}
                  </div>
                  <div className="hidden sm:block text-[11px] font-mono font-semibold opacity-85">
                    {stat.tradesCount} {stat.tradesCount === 1 ? 'trade' : 'trades'}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Drill-Down Summary (Unboxed hairline rows) */}
      {selectedDate && (
        <div
          className="mt-2 pt-5 border-t border-[#E8D7A8]/14 space-y-3"
          data-testid="calendar-day-summary"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono font-bold">
              <span className="text-[#B7FF00] font-extrabold">{selectedDate}</span>
              <span className="text-[#E8D7A8]/30" aria-hidden="true">
                ·
              </span>
              {selectedDayStat ? (
                <>
                  <span
                    className={
                      selectedDayStat.pnl >= 0
                        ? 'text-emerald-400 font-extrabold'
                        : 'text-rose-400 font-extrabold'
                    }
                  >
                    {formatSignedCurrency(selectedDayStat.pnl, currency)}
                  </span>
                  <span className="text-[#E8D7A8]/30" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#C9BA9E]">
                    {selectedDayStat.wins}W {selectedDayStat.losses}L ({selectedDayStat.tradesCount} total)
                  </span>
                </>
              ) : (
                <span className="text-[#C9BA9E]">No closed trades</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              aria-label="Close day summary"
              className="glass-control p-2 rounded-xl"
            >
              <X className="w-3.5 h-3.5 text-[#B7FF00]" />
            </button>
          </div>

          {selectedDayTrades.length === 0 ? (
            <p className="text-xs font-semibold text-[#9C8C72]">
              No closed executions recorded on {selectedDate}.
            </p>
          ) : (
            <div className="divide-y divide-[#E8D7A8]/12 border-t border-[#E8D7A8]/12">
              {selectedDayTrades.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onInspectTrade(t)}
                  className="w-full py-3.5 flex items-center justify-between gap-3 text-left text-xs sm:text-sm hover:bg-[#B7FF00]/[0.05] px-2 -mx-2 rounded-xl transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="text-[#FAF6EE] font-extrabold">{t.instrument}</span>
                      <span
                        className={t.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'}
                      >
                        {t.direction}
                      </span>
                      <span className="text-[#9C8C72]">{formatTimeUtc(t.entryTime)}</span>
                    </div>
                    <div className="text-xs font-semibold text-[#C9BA9E] truncate mt-0.5">
                      {t.setupType} · {t.session} · {t.lotSize.toFixed(2)} lots · Grade {t.setupQuality}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div
                      className={`font-extrabold ${
                        t.actualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatSignedCurrency(t.actualPnL, currency)}
                    </div>
                    <div className="text-xs font-semibold text-[#9C8C72]">
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
