import { useMemo, useState } from 'react';
import { ArrowDownUp, CalendarRange, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
import { PerformanceAnalytics } from '../core/analytics';
import { Trade, TradingAccount } from '../core/types';
import { EquityCurveChart } from './EquityCurveChart';
import {
  formatCurrency,
  formatDurationMinutes,
  formatSignedCurrency,
} from './Formatters';
import { TradingCalendarHeatmap } from './TradingCalendarHeatmap';

interface DashboardViewProps {
  account: TradingAccount | null;
  accounts: TradingAccount[];
  onSwitchAccount: (accountId: string) => void;
  analytics: PerformanceAnalytics;
  trades: Trade[];
  onInspectTrade: (trade: Trade) => void;
  onOpenAccountSettings: () => void;
}

export function DashboardView({
  account,
  accounts,
  onSwitchAccount,
  analytics,
  trades,
  onInspectTrade,
  onOpenAccountSettings,
}: DashboardViewProps) {
  const [breakdownTab, setBreakdownTab] = useState<
    'session' | 'instrument' | 'strategy' | 'direction'
  >('session');

  const currency = account?.currency || 'USD';
  const fp = analytics.fundedProgress;

  const activeBreakdownRows =
    breakdownTab === 'session'
      ? analytics.bySession
      : breakdownTab === 'instrument'
      ? analytics.byInstrument
      : breakdownTab === 'strategy'
      ? analytics.byStrategy
      : analytics.byDirection;

  const calendarSummary = useMemo(() => {
    const days = Object.values(analytics.dailyCalendar);
    if (days.length === 0) {
      return { bestDay: null, worstDay: null, greenDays: 0, redDays: 0, avgDay: 0 };
    }
    const sorted = [...days].sort((a, b) => b.pnl - a.pnl);
    const greenDays = days.filter((d) => d.pnl > 0).length;
    const redDays = days.filter((d) => d.pnl < 0).length;
    const total = days.reduce((acc, d) => acc + d.pnl, 0);
    return {
      bestDay: sorted[0],
      worstDay: sorted[sorted.length - 1],
      greenDays,
      redDays,
      avgDay: total / days.length,
    };
  }, [analytics.dailyCalendar]);

  return (
    <div className="space-y-14">
      {/* Command Header, Account Selector & Open Unboxed Performance & Risk Strip */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-mono font-bold text-[#B7FF00] mb-1.5">
              {account
                ? `${account.broker} · ${account.currency} · ${analytics.closedTrades} closed executions`
                : 'No account connected · Zero-state ledger'}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#FAF6EE]">
              Performance &amp; Risk Command
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {accounts.length > 0 && account ? (
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#C9BA9E]">
                <span>Account</span>
                <select
                  value={account.id}
                  onChange={(e) => onSwitchAccount(e.target.value)}
                  className="tos-input px-4 py-2.5 text-xs sm:text-sm font-bold"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.startingBalance, acc.currency)})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button
              type="button"
              onClick={onOpenAccountSettings}
              className={
                account
                  ? 'glass-control inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl'
                  : 'glass-gold-cta inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl'
              }
            >
              {account ? (
                <>
                  <ArrowDownUp className="w-4 h-4 text-[#FFD36A]" />
                  <span>Accounts &amp; Cash Flow</span>
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 stroke-[2.5]" />
                  <span>Connect Account</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Open Floating Performance & Risk Metrics (Zero Enclosing Box) */}
        <div className="py-7 border-y border-[#E8D7A8]/16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-7 gap-x-5 lg:gap-y-0 lg:divide-x lg:divide-[#E8D7A8]/14">
          <div className="lg:pr-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Balance / Equity</div>
            <div
              data-testid="dashboard-account-balance"
              className="mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold text-[#FAF6EE] tabular-nums"
            >
              {formatCurrency(analytics.currentBalance, currency)}
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums">
              Eq {formatCurrency(analytics.currentEquity, currency)}
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Monthly P&amp;L</div>
            <div
              className={`mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold tabular-nums ${
                analytics.monthlyPnL > 0
                  ? 'text-emerald-400'
                  : analytics.monthlyPnL < 0
                  ? 'text-rose-400'
                  : 'text-[#FAF6EE]'
              }`}
            >
              {formatSignedCurrency(analytics.monthlyPnL, currency)}
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums flex flex-wrap gap-x-2">
              <span className="whitespace-nowrap">D {formatSignedCurrency(analytics.dailyPnL, currency)}</span>
              <span className="whitespace-nowrap">W {formatSignedCurrency(analytics.weeklyPnL, currency)}</span>
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Win Rate &amp; Exp</div>
            <div className="mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold text-[#B7FF00] tabular-nums">
              {analytics.winRate}%
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums">
              Exp {formatSignedCurrency(analytics.expectancy, currency)}/t
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Profit Factor</div>
            <div className="mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold text-[#FFD36A] tabular-nums">
              {analytics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums">
              Real {analytics.averageRealizedR > 0 ? '+' : ''}
              {analytics.averageRealizedR}R · Plan {analytics.averagePlannedRR}R
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Max Drawdown</div>
            <div
              className={`mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold tabular-nums ${
                analytics.maxDrawdownPct > 0 ? 'text-rose-400' : 'text-[#FAF6EE]'
              }`}
            >
              {analytics.maxDrawdownPct > 0
                ? `-${analytics.maxDrawdownPct.toFixed(2)}%`
                : '0.00%'}
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums">
              {formatCurrency(analytics.maxDrawdownAbs, currency)} peak-trough
            </div>
          </div>

          <div className="lg:pl-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Consistency</div>
            <div className="mt-1.5 font-mono text-2xl sm:text-[1.7rem] font-extrabold text-[#FAF6EE] tabular-nums">
              {analytics.consistencyScore}%
            </div>
            <div className="mt-1 text-xs text-[#9C8C72] font-mono font-bold tabular-nums">
              Avg {formatDurationMinutes(analytics.averageHoldMinutes)} · {analytics.currentStreak.count}
              {analytics.currentStreak.type === 'Win'
                ? 'W'
                : analytics.currentStreak.type === 'Loss'
                ? 'L'
                : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Equity Curve Chart Container (8 cols) + Open Funded Account Tracker (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <section className="lg:col-span-8 glass-surface rounded-[28px] p-5 sm:p-7">
          <EquityCurveChart
            points={analytics.equityCurve}
            startingBalance={analytics.startingBalance}
            currency={currency}
          />
        </section>

        <section className="lg:col-span-4 flex flex-col justify-between py-1 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#E8D7A8]/14">
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#FAF6EE]">
                  Funded Account Tracker
                </h2>
                <p className="text-xs font-bold text-[#C9BA9E] mt-0.5">
                  {fp.firmName} · {fp.phaseName}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-bold shrink-0 ${
                  fp.status === 'Target Reached' || fp.status === 'Active'
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {fp.status === 'Active' || fp.status === 'Target Reached' ? (
                  <ShieldCheck className="w-4 h-4" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                <span>{fp.status}</span>
              </span>
            </div>

            {!account ? (
              <div className="py-10 px-2 text-center space-y-4">
                <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] leading-relaxed">
                  No account is connected. Create an account to monitor profit targets, daily loss caps, and drawdown thresholds.
                </p>
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="glass-gold-cta px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl"
                >
                  Create Account
                </button>
              </div>
            ) : !fp.enabled ? (
              <div className="py-10 px-2 text-center space-y-4">
                <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] leading-relaxed">
                  Prop-firm challenge rules are disabled for this personal live account.
                </p>
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="glass-control px-4 py-2.5 text-xs font-bold rounded-xl"
                >
                  Enable Funded Challenge Rules
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-[#E8D7A8]">
                      Profit Target ({account.fundedRules.profitTargetPct}%)
                    </span>
                    <span className="font-mono font-bold text-[#FAF6EE] tabular-nums">
                      {formatSignedCurrency(fp.currentProfitAmount, currency)} /{' '}
                      {formatCurrency(fp.profitTargetAmount, currency)}
                    </span>
                  </div>
                  <div className="h-3 glass-well overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0F513D] via-[#10B981] to-[#B7FF00]"
                      style={{ width: `${fp.profitTargetProgressPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-mono font-bold text-[#B7FF00] text-right tabular-nums">
                    {fp.profitTargetProgressPct}% achieved
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-[#E8D7A8]">
                      Daily Loss Limit ({account.fundedRules.maxDailyLossPct}%)
                    </span>
                    <span className="font-mono font-bold text-[#FAF6EE] tabular-nums">
                      {formatCurrency(fp.dailyLossRemaining, currency)} left
                    </span>
                  </div>
                  <div className="h-3 glass-well overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        fp.dailyLossUsedPct > 70
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-[#E8D7A8] to-[#FFD36A]'
                      }`}
                      style={{ width: `${fp.dailyLossUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold text-[#9C8C72] tabular-nums">
                    Limit {formatCurrency(fp.maxDailyLossAmount, currency)} · Today{' '}
                    {formatSignedCurrency(fp.todayPnL, currency)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-[#E8D7A8]">
                      Max Drawdown ({account.fundedRules.maxTotalDrawdownPct}%)
                    </span>
                    <span className="font-mono font-bold text-[#FAF6EE] tabular-nums">
                      {formatCurrency(fp.totalDrawdownRemaining, currency)} left
                    </span>
                  </div>
                  <div className="h-3 glass-well overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-rose-500/85"
                      style={{ width: `${fp.totalDrawdownUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-mono font-semibold text-[#9C8C72] tabular-nums">
                    Used {formatCurrency(fp.currentDrawdownFromStartOrPeak, currency)} of{' '}
                    {formatCurrency(fp.maxTotalDrawdownAmount, currency)}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E8D7A8]/14 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-[#E8D7A8]">Minimum Profitable Days</div>
                    <div className="text-xs text-[#9C8C72] font-mono font-semibold">
                      &ge; {formatCurrency(fp.profitableDayThresholdAmount, currency)}/day
                    </div>
                  </div>
                  <div className="font-mono text-xl font-extrabold text-emerald-400 tabular-nums">
                    {fp.profitableDaysAchieved} / {fp.minProfitableDays}
                  </div>
                </div>
              </div>
            )}

            {/* Capital & Cash Flow Summary */}
            <div className="mt-6 pt-4 border-t border-[#E8D7A8]/14 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-[#C9BA9E]">Capital &amp; Cash Activity</div>
                <div className="text-xs font-mono font-bold text-[#9C8C72] tabular-nums mt-0.5">
                  Start {formatCurrency(analytics.startingBalance, currency)} · +
                  {formatCurrency(analytics.totalDeposits, currency)} / -
                  {formatCurrency(analytics.totalWithdrawals, currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="glass-control px-3.5 py-2 text-xs font-bold rounded-xl shrink-0"
              >
                Ledger
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Expanded Trading Calendar (8 cols) + Open Calendar Telemetry Column (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <TradingCalendarHeatmap
          dailyCalendar={analytics.dailyCalendar}
          trades={trades}
          account={account}
          onInspectTrade={onInspectTrade}
        />

        <aside className="lg:col-span-4 space-y-6 py-1">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8D7A8]/14">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#FAF6EE]">
                Calendar Telemetry
              </h2>
              <p className="text-xs font-bold text-[#C9BA9E] mt-0.5">
                Daily distribution &amp; session cadence
              </p>
            </div>
            <CalendarRange className="w-5 h-5 text-[#B7FF00]" />
          </div>

          <div className="divide-y divide-[#E8D7A8]/12 text-xs sm:text-sm">
            <div className="py-4 flex items-center justify-between gap-3">
              <span className="font-bold text-[#C9BA9E]">Best Trading Day</span>
              <div className="text-right font-mono tabular-nums">
                <div
                  className={`font-extrabold ${
                    calendarSummary.bestDay && calendarSummary.bestDay.pnl > 0
                      ? 'text-emerald-400'
                      : 'text-[#FAF6EE]'
                  }`}
                >
                  {calendarSummary.bestDay
                    ? formatSignedCurrency(calendarSummary.bestDay.pnl, currency)
                    : formatCurrency(0, currency)}
                </div>
                <div className="text-xs font-semibold text-[#9C8C72]">
                  {calendarSummary.bestDay ? calendarSummary.bestDay.date : '—'}
                </div>
              </div>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <span className="font-bold text-[#C9BA9E]">Worst Trading Day</span>
              <div className="text-right font-mono tabular-nums">
                <div
                  className={`font-extrabold ${
                    calendarSummary.worstDay && calendarSummary.worstDay.pnl < 0
                      ? 'text-rose-400'
                      : 'text-[#FAF6EE]'
                  }`}
                >
                  {calendarSummary.worstDay
                    ? formatSignedCurrency(calendarSummary.worstDay.pnl, currency)
                    : formatCurrency(0, currency)}
                </div>
                <div className="text-xs font-semibold text-[#9C8C72]">
                  {calendarSummary.worstDay ? calendarSummary.worstDay.date : '—'}
                </div>
              </div>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <span className="font-bold text-[#C9BA9E]">Average Active Day</span>
              <div
                className={`font-mono font-extrabold tabular-nums ${
                  calendarSummary.avgDay > 0
                    ? 'text-emerald-400'
                    : calendarSummary.avgDay < 0
                    ? 'text-rose-400'
                    : 'text-[#FAF6EE]'
                }`}
              >
                {formatSignedCurrency(calendarSummary.avgDay, currency)}
              </div>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <span className="font-bold text-[#C9BA9E]">Green vs Red Days</span>
              <div className="font-mono font-extrabold tabular-nums">
                <span className="text-emerald-400">{calendarSummary.greenDays}W</span>
                <span className="text-[#E8D7A8]/30 mx-1.5">/</span>
                <span className="text-rose-400">{calendarSummary.redDays}L</span>
              </div>
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <span className="font-bold text-[#C9BA9E]">Top Instrument</span>
              <div className="text-right font-mono tabular-nums">
                <div className="text-[#B7FF00] font-extrabold">
                  {analytics.mostProfitableInstrument
                    ? analytics.mostProfitableInstrument.key
                    : '—'}
                </div>
                <div
                  className={`text-xs font-bold ${
                    analytics.mostProfitableInstrument &&
                    analytics.mostProfitableInstrument.netPnL > 0
                      ? 'text-emerald-400'
                      : 'text-[#9C8C72]'
                  }`}
                >
                  {analytics.mostProfitableInstrument
                    ? formatSignedCurrency(analytics.mostProfitableInstrument.netPnL, currency)
                    : formatCurrency(0, currency)}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Full-Width Open Performance Breakdown */}
      <section className="pt-8 border-t border-[#E8D7A8]/14 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#FAF6EE]">
              Performance Breakdown
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] mt-0.5">
              Computed live from your recorded execution history across sessions, instruments, and models
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'session', label: 'Session' },
                { id: 'instrument', label: 'Symbol' },
                { id: 'strategy', label: 'Strategy' },
                { id: 'direction', label: 'Buy/Sell' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBreakdownTab(tab.id)}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  breakdownTab === tab.id
                    ? 'glass-control-active text-[#FFD36A]'
                    : 'glass-control text-[#C9BA9E] hover:text-[#FAF6EE]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Open Summary Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 py-5 border-y border-[#E8D7A8]/14 text-xs sm:text-sm">
          <div>
            <div className="font-bold text-[#9C8C72]">Strongest Session</div>
            <div className="mt-1 font-extrabold text-[#FAF6EE] truncate">
              {analytics.strongestSession ? analytics.strongestSession.key : '—'}
            </div>
            <div
              className={`mt-0.5 font-mono font-extrabold tabular-nums ${
                analytics.strongestSession && analytics.strongestSession.netPnL > 0
                  ? 'text-emerald-400'
                  : 'text-[#C9BA9E]'
              }`}
            >
              {analytics.strongestSession
                ? formatSignedCurrency(analytics.strongestSession.netPnL, currency)
                : formatCurrency(0, currency)}
            </div>
          </div>

          <div>
            <div className="font-bold text-[#9C8C72]">Weakest Session</div>
            <div className="mt-1 font-extrabold text-[#FAF6EE] truncate">
              {analytics.weakestSession ? analytics.weakestSession.key : '—'}
            </div>
            <div
              className={`mt-0.5 font-mono font-extrabold tabular-nums ${
                analytics.weakestSession && analytics.weakestSession.netPnL < 0
                  ? 'text-rose-400'
                  : 'text-[#C9BA9E]'
              }`}
            >
              {analytics.weakestSession
                ? formatSignedCurrency(analytics.weakestSession.netPnL, currency)
                : formatCurrency(0, currency)}
            </div>
          </div>

          <div>
            <div className="font-bold text-[#9C8C72]">Most Active Instrument</div>
            <div className="mt-1 font-mono font-extrabold text-[#B7FF00] truncate">
              {analytics.mostProfitableInstrument
                ? analytics.mostProfitableInstrument.key
                : '—'}
            </div>
            <div
              className={`mt-0.5 font-mono font-extrabold tabular-nums ${
                analytics.mostProfitableInstrument && analytics.mostProfitableInstrument.netPnL > 0
                  ? 'text-emerald-400'
                  : 'text-[#C9BA9E]'
              }`}
            >
              {analytics.mostProfitableInstrument
                ? formatSignedCurrency(analytics.mostProfitableInstrument.netPnL, currency)
                : formatCurrency(0, currency)}
            </div>
          </div>
        </div>

        {activeBreakdownRows.length === 0 ? (
          <div className="py-10 text-center text-xs sm:text-sm font-bold text-[#9C8C72]">
            No closed trades available for breakdown analysis.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[#E8D7A8]/16 text-[#C9BA9E]">
                  <th className="py-3 text-left font-bold">Segment</th>
                  <th className="py-3 text-right font-bold">Trades</th>
                  <th className="py-3 text-right font-bold">Win %</th>
                  <th className="py-3 text-right font-bold">PF</th>
                  <th className="py-3 text-right font-bold">Avg R</th>
                  <th className="py-3 text-right font-bold">Net P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8D7A8]/10 font-mono tabular-nums">
                {activeBreakdownRows.map((row) => (
                  <tr key={row.key} className="hover:bg-[#E8D7A8]/[0.04] transition-colors">
                    <td className="py-4 pr-3 font-sans font-bold text-[#FAF6EE]">
                      {row.key}
                    </td>
                    <td className="py-4 text-right font-bold text-[#E8D7A8]">{row.trades}</td>
                    <td className="py-4 text-right font-bold text-[#E8D7A8]">{row.winRate}%</td>
                    <td className="py-4 text-right font-extrabold text-[#FFD36A]">
                      {row.profitFactor.toFixed(2)}
                    </td>
                    <td className="py-4 text-right font-bold text-[#E8D7A8]">
                      {row.avgRR > 0 ? '+' : ''}
                      {row.avgRR}R
                    </td>
                    <td
                      className={`py-4 text-right font-extrabold ${
                        row.netPnL > 0
                          ? 'text-emerald-400'
                          : row.netPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EE]'
                      }`}
                    >
                      {formatSignedCurrency(row.netPnL, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Open Psychology, Discipline & Edge Leakage (Zero Enclosing Box) */}
      <section className="pt-8 border-t border-[#E8D7A8]/14 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-extrabold text-[#FAF6EE]">
              Psychology, Discipline &amp; Edge Leakage
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] mt-0.5">
              Behavioral adherence, emotional states, and recurring execution mistakes.
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs sm:text-sm font-mono font-bold tabular-nums">
            <span className="text-[#C9BA9E]">
              Max Win Streak:{' '}
              <strong className="text-emerald-400 font-extrabold">{analytics.longestWinStreak}</strong>
            </span>
            <span className="text-[#C9BA9E]">
              Max Loss Streak:{' '}
              <strong className="text-rose-400 font-extrabold">{analytics.longestLossStreak}</strong>
            </span>
          </div>
        </div>

        {/* Open Floating Behavioral Metrics Strip */}
        <div className="py-7 border-y border-[#E8D7A8]/16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:divide-x lg:divide-[#E8D7A8]/14">
          <div className="lg:pr-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Plan Adherence Rate</div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold text-emerald-400 tabular-nums">
              {analytics.psychology.planAdherenceRate}%
            </div>
            <div className="mt-1 text-xs font-mono font-bold text-[#9C8C72] tabular-nums">
              In-plan {formatSignedCurrency(analytics.psychology.followedPlanPnL, currency)}
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Rule-Break Cost</div>
            <div
              className={`mt-1.5 font-mono text-3xl font-extrabold tabular-nums ${
                analytics.psychology.brokenPlanPnL < 0 ? 'text-rose-400' : 'text-[#FAF6EE]'
              }`}
            >
              {formatSignedCurrency(analytics.psychology.brokenPlanPnL, currency)}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#9C8C72]">
              Net P&amp;L on unverified / broken rules
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Revenge Trades</div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold text-[#FAF6EE] tabular-nums">
              {analytics.psychology.revengeTradesCount}
            </div>
            <div
              className={`mt-1 text-xs font-mono font-bold tabular-nums ${
                analytics.psychology.revengeTradesPnL < 0 ? 'text-rose-400' : 'text-[#9C8C72]'
              }`}
            >
              Impact {formatSignedCurrency(analytics.psychology.revengeTradesPnL, currency)}
            </div>
          </div>

          <div className="lg:pl-6">
            <div className="text-xs font-bold text-[#C9BA9E]">Overtrading Days</div>
            <div className="mt-1.5 font-mono text-3xl font-extrabold text-[#FAF6EE] tabular-nums">
              {analytics.psychology.overtradingDaysCount}
            </div>
            <div className="mt-1 text-xs font-semibold text-[#9C8C72]">
              {account
                ? `Days exceeding ${account.maxDailyTrades} trades/day cap`
                : 'Configured per account'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#E8D7A8] pb-3 border-b border-[#E8D7A8]/14">
              Performance by Emotion
            </h3>
            {analytics.psychology.byEmotion.length === 0 ? (
              <p className="text-xs font-semibold text-[#9C8C72] pt-3">No emotional data recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#E8D7A8]/10 text-xs sm:text-sm">
                {analytics.psychology.byEmotion.map((row) => (
                  <div key={row.key} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#FAF6EE]">{row.key}</span>
                      <span className="text-[#9C8C72] font-mono font-bold ml-2">
                        {row.trades}t · {row.winRate}%
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold tabular-nums ${
                        row.netPnL > 0
                          ? 'text-emerald-400'
                          : row.netPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EE]'
                      }`}
                    >
                      {formatSignedCurrency(row.netPnL, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#E8D7A8] pb-3 border-b border-[#E8D7A8]/14">
              Setup Quality Grading
            </h3>
            {analytics.psychology.bySetupQuality.length === 0 ? (
              <p className="text-xs font-semibold text-[#9C8C72] pt-3">No setup grades recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#E8D7A8]/10 text-xs sm:text-sm">
                {analytics.psychology.bySetupQuality.map((row) => (
                  <div key={row.key} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-extrabold text-[#FAF6EE]">Grade {row.key}</span>
                      <span className="text-[#9C8C72] font-mono font-bold ml-2">
                        {row.trades}t · {row.winRate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-mono font-extrabold tabular-nums ${
                        row.netPnL > 0
                          ? 'text-emerald-400'
                          : row.netPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EE]'
                      }`}
                    >
                      {formatSignedCurrency(row.netPnL, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[#E8D7A8] pb-3 border-b border-[#E8D7A8]/14">
              Recurring Mistakes
            </h3>
            {analytics.psychology.topMistakes.length === 0 ? (
              <p className="text-xs font-semibold text-[#C9BA9E] pt-3">
                Zero behavioral mistakes logged on closed trades.
              </p>
            ) : (
              <div className="divide-y divide-[#E8D7A8]/10 text-xs sm:text-sm">
                {analytics.psychology.topMistakes.map((m) => (
                  <div key={m.mistake} className="py-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-[#FAF6EE]">{m.mistake}</span>
                      <span className="text-[#9C8C72] font-mono font-bold ml-2">({m.count}x)</span>
                    </div>
                    <span
                      className={`font-mono font-extrabold tabular-nums ${
                        m.totalPnL > 0
                          ? 'text-emerald-400'
                          : m.totalPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EE]'
                      }`}
                    >
                      {formatSignedCurrency(m.totalPnL, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
