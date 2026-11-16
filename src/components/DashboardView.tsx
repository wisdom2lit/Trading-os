import { useMemo, useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
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
  account: TradingAccount;
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

  const activeBreakdownRows =
    breakdownTab === 'session'
      ? analytics.bySession
      : breakdownTab === 'instrument'
      ? analytics.byInstrument
      : breakdownTab === 'strategy'
      ? analytics.byStrategy
      : analytics.byDirection;

  const fp = analytics.fundedProgress;

  return (
    <div className="space-y-6">
      {/* Top Header & Account Switcher */}
      <section className="glass-panel rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              Command Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              {account.broker} · {account.currency} · {analytics.closedTrades} closed executions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <span>Account</span>
              <select
                value={account.id}
                onChange={(e) => onSwitchAccount(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#050505] border border-white/[0.12] text-xs font-medium text-white focus:outline-none focus:border-[#00BFFF]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.startingBalance, acc.currency)})
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg transition-colors"
            >
              Configure Rules
            </button>
          </div>
        </div>

        {/* Core Performance Metrics Grid */}
        <div className="mt-6 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-5">
          <div>
            <div className="text-xs text-slate-400">Balance / Equity</div>
            <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
              {formatCurrency(analytics.currentBalance, account.currency)}
            </div>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums">
              Eq {formatCurrency(analytics.currentEquity, account.currency)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Daily / Weekly / Monthly</div>
            <div
              className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                analytics.monthlyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatSignedCurrency(analytics.monthlyPnL, account.currency)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              D {formatSignedCurrency(analytics.dailyPnL, account.currency)} · W{' '}
              {formatSignedCurrency(analytics.weeklyPnL, account.currency)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Win Rate &amp; Expectancy</div>
            <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
              {analytics.winRate}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              Exp {formatSignedCurrency(analytics.expectancy, account.currency)}/trade
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Profit Factor &amp; Avg R</div>
            <div className="mt-1 font-mono text-lg font-semibold text-[#00BFFF] tabular-nums">
              {analytics.profitFactor.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              Realized {analytics.averageRealizedR >= 0 ? '+' : ''}
              {analytics.averageRealizedR}R · Plan {analytics.averagePlannedRR}R
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Max Drawdown</div>
            <div className="mt-1 font-mono text-lg font-semibold text-rose-400 tabular-nums">
              -{analytics.maxDrawdownPct.toFixed(2)}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              {formatCurrency(analytics.maxDrawdownAbs, account.currency)} peak-to-trough
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Consistency &amp; Hold</div>
            <div className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
              {analytics.consistencyScore}%
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
              Avg hold {formatDurationMinutes(analytics.averageHoldMinutes)} · Streak{' '}
              {analytics.currentStreak.count}
              {analytics.currentStreak.type === 'Win'
                ? 'W'
                : analytics.currentStreak.type === 'Loss'
                ? 'L'
                : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Equity Curve + Funded Challenge Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <section className="lg:col-span-8 glass-panel rounded-xl p-6">
          <EquityCurveChart
            points={analytics.equityCurve}
            startingBalance={account.startingBalance}
            currency={account.currency}
          />
        </section>

        <section className="lg:col-span-4 glass-panel rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Funded Account Tracker
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {fp.firmName} · {fp.phaseName}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                  fp.status === 'Target Reached'
                    ? 'text-emerald-400'
                    : fp.status === 'Active'
                    ? 'text-[#00BFFF]'
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

            {!fp.enabled ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-xs text-slate-400">
                  Prop-firm challenge rules are disabled for this personal live account.
                </p>
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="text-xs font-medium text-[#00BFFF] hover:underline"
                >
                  Enable Funded Challenge Rules
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {/* Profit Target */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300">
                      Profit Target ({account.fundedRules.profitTargetPct}%)
                    </span>
                    <span className="font-mono text-white tabular-nums">
                      {formatSignedCurrency(fp.currentProfitAmount, account.currency)} /{' '}
                      {formatCurrency(fp.profitTargetAmount, account.currency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF]"
                      style={{ width: `${fp.profitTargetProgressPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-400 text-right tabular-nums">
                    {fp.profitTargetProgressPct}% achieved
                  </div>
                </div>

                {/* Daily Loss Limit */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300">
                      Daily Loss Limit ({account.fundedRules.maxDailyLossPct}%)
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {formatCurrency(fp.dailyLossRemaining, account.currency)} left
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        fp.dailyLossUsedPct > 70 ? 'bg-rose-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${fp.dailyLossUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-500 tabular-nums">
                    Limit {formatCurrency(fp.maxDailyLossAmount, account.currency)} · Today{' '}
                    {formatSignedCurrency(fp.todayPnL, account.currency)}
                  </div>
                </div>

                {/* Max Drawdown Limit */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300">
                      Max Drawdown ({account.fundedRules.maxTotalDrawdownPct}%)
                    </span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {formatCurrency(fp.totalDrawdownRemaining, account.currency)} left
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500/80"
                      style={{ width: `${fp.totalDrawdownUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-500 tabular-nums">
                    Used {formatCurrency(fp.currentDrawdownFromStartOrPeak, account.currency)} of{' '}
                    {formatCurrency(fp.maxTotalDrawdownAmount, account.currency)}
                  </div>
                </div>

                {/* Profitable Days */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <div className="text-slate-300">Minimum Profitable Days</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      &ge; {formatCurrency(fp.profitableDayThresholdAmount, account.currency)}/day
                    </div>
                  </div>
                  <div className="font-mono text-base font-semibold text-[#00BFFF] tabular-nums">
                    {fp.profitableDaysAchieved} / {fp.minProfitableDays}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Trading Calendar + Performance Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <TradingCalendarHeatmap
          dailyCalendar={analytics.dailyCalendar}
          trades={trades}
          account={account}
          onInspectTrade={onInspectTrade}
        />

        {/* Performance Intelligence Engine */}
        <section className="lg:col-span-6 glass-panel rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Performance Breakdown
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Computed live from your recorded execution history
              </p>
            </div>

            <div className="inline-flex items-center p-1 rounded-lg bg-[#050505] border border-white/[0.08]">
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
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    breakdownTab === tab.id
                      ? 'bg-white/[0.1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Highlight Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="text-slate-400">Strongest Session</div>
              <div className="mt-1 font-medium text-white truncate">
                {analytics.strongestSession ? analytics.strongestSession.key : '—'}
              </div>
              <div className="mt-0.5 font-mono text-emerald-400 tabular-nums">
                {analytics.strongestSession
                  ? formatSignedCurrency(analytics.strongestSession.netPnL, account.currency)
                  : '$0.00'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="text-slate-400">Weakest Session</div>
              <div className="mt-1 font-medium text-white truncate">
                {analytics.weakestSession ? analytics.weakestSession.key : '—'}
              </div>
              <div
                className={`mt-0.5 font-mono tabular-nums ${
                  analytics.weakestSession && analytics.weakestSession.netPnL < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {analytics.weakestSession
                  ? formatSignedCurrency(analytics.weakestSession.netPnL, account.currency)
                  : '$0.00'}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
              <div className="text-slate-400">Top Instrument</div>
              <div className="mt-1 font-mono font-medium text-[#00BFFF] truncate">
                {analytics.mostProfitableInstrument
                  ? analytics.mostProfitableInstrument.key
                  : '—'}
              </div>
              <div className="mt-0.5 font-mono text-emerald-400 tabular-nums">
                {analytics.mostProfitableInstrument
                  ? formatSignedCurrency(
                      analytics.mostProfitableInstrument.netPnL,
                      account.currency
                    )
                  : '$0.00'}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          {activeBreakdownRows.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No closed trades available for breakdown analysis.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400">
                    <th className="py-2 text-left font-medium">Segment</th>
                    <th className="py-2 text-right font-medium">Trades</th>
                    <th className="py-2 text-right font-medium">Win %</th>
                    <th className="py-2 text-right font-medium">PF</th>
                    <th className="py-2 text-right font-medium">Avg R</th>
                    <th className="py-2 text-right font-medium">Net P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] font-mono tabular-nums">
                  {activeBreakdownRows.map((row) => (
                    <tr key={row.key} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 font-sans font-medium text-slate-200">
                        {row.key}
                      </td>
                      <td className="py-2.5 text-right text-slate-300">{row.trades}</td>
                      <td className="py-2.5 text-right text-slate-300">{row.winRate}%</td>
                      <td className="py-2.5 text-right text-[#00BFFF]">
                        {row.profitFactor.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-slate-300">
                        {row.avgRR >= 0 ? '+' : ''}
                        {row.avgRR}R
                      </td>
                      <td
                        className={`py-2.5 text-right font-semibold ${
                          row.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatSignedCurrency(row.netPnL, account.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Psychology & Discipline Analytics */}
      <section className="glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Psychology, Discipline &amp; Edge Leakage
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantify how plan adherence, emotional state, and recurring mistakes impact your bottom line.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <span className="text-slate-400">
              Longest Win Streak:{' '}
              <strong className="text-emerald-400">{analytics.longestWinStreak}</strong>
            </span>
            <span className="text-slate-400">
              Longest Loss Streak:{' '}
              <strong className="text-rose-400">{analytics.longestLossStreak}</strong>
            </span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs text-slate-400">Plan Adherence Rate</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-[#00BFFF] tabular-nums">
              {analytics.psychology.planAdherenceRate}%
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-400 tabular-nums">
              In-plan {formatSignedCurrency(analytics.psychology.followedPlanPnL, account.currency)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs text-slate-400">Rule-Break Cost</div>
            <div
              className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
                analytics.psychology.brokenPlanPnL < 0 ? 'text-rose-400' : 'text-slate-200'
              }`}
            >
              {formatSignedCurrency(analytics.psychology.brokenPlanPnL, account.currency)}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Net P&amp;L on unverified / broken rules
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs text-slate-400">Revenge Trades</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
              {analytics.psychology.revengeTradesCount}
            </div>
            <div
              className={`mt-1 text-[11px] font-mono tabular-nums ${
                analytics.psychology.revengeTradesPnL < 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              Impact {formatSignedCurrency(analytics.psychology.revengeTradesPnL, account.currency)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <div className="text-xs text-slate-400">Overtrading Days</div>
            <div className="mt-1 font-mono text-2xl font-semibold text-white tabular-nums">
              {analytics.psychology.overtradingDaysCount}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Days exceeding {account.maxDailyTrades} trades/day cap
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Emotion Breakdown */}
          <div>
            <h3 className="text-xs font-medium text-slate-300 mb-3">Performance by Emotion</h3>
            {analytics.psychology.byEmotion.length === 0 ? (
              <p className="text-xs text-slate-500">No emotional data recorded yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.05] text-xs">
                {analytics.psychology.byEmotion.map((row) => (
                  <div key={row.key} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-200">{row.key}</span>
                      <span className="text-slate-500 font-mono ml-2">
                        {row.trades}t · {row.winRate}%
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        row.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatSignedCurrency(row.netPnL, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup Quality Breakdown */}
          <div>
            <h3 className="text-xs font-medium text-slate-300 mb-3">Setup Quality Grading</h3>
            {analytics.psychology.bySetupQuality.length === 0 ? (
              <p className="text-xs text-slate-500">No setup grades recorded yet.</p>
            ) : (
              <div className="divide-y divide-white/[0.05] text-xs">
                {analytics.psychology.bySetupQuality.map((row) => (
                  <div key={row.key} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-white">Grade {row.key}</span>
                      <span className="text-slate-500 font-mono ml-2">
                        {row.trades}t · {row.winRate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        row.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatSignedCurrency(row.netPnL, account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recurring Mistakes */}
          <div>
            <h3 className="text-xs font-medium text-slate-300 mb-3">Recurring Mistakes</h3>
            {analytics.psychology.topMistakes.length === 0 ? (
              <p className="text-xs text-emerald-400/90">
                Zero behavioral mistakes logged on closed trades.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.05] text-xs">
                {analytics.psychology.topMistakes.map((m) => (
                  <div key={m.mistake} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-200">{m.mistake}</span>
                      <span className="text-slate-500 font-mono ml-2">({m.count}x)</span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        m.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {formatSignedCurrency(m.totalPnL, account.currency)}
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
