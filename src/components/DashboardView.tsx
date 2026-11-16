import { useState } from 'react';
import { ArrowDownUp, ShieldAlert, ShieldCheck, Wallet } from 'lucide-react';
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

  return (
    <div className="space-y-12">
      {/* Command Header, Account Selector & Truthful KPI Ribbon */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#3FA17F] mb-1.5">
              {account
                ? `${account.broker} · ${account.currency} · ${analytics.closedTrades} closed executions`
                : 'No account connected · Zero-state ledger'}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#FAF6EF]">
              Performance &amp; Risk Command
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {accounts.length > 0 && account ? (
              <label className="flex items-center gap-2 text-xs text-[#B7ADA0]">
                <span>Account</span>
                <select
                  value={account.id}
                  onChange={(e) => onSwitchAccount(e.target.value)}
                  className="tos-input px-3.5 py-2 text-xs font-medium"
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
              className="btn-ivory-glass inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl"
            >
              {account ? (
                <>
                  <ArrowDownUp className="w-3.5 h-3.5 text-[#3FA17F]" />
                  <span>Accounts &amp; Cash Flow</span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5 text-[#3FA17F]" />
                  <span>Connect Account</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Continuous Milky-Ivory Frosted KPI Ribbon */}
        <div className="liquid-glass-subtle rounded-[26px] px-6 py-6 sm:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-6 gap-x-4 lg:gap-y-0 lg:divide-x lg:divide-[#FAF6EF]/12">
          <div className="lg:pr-6">
            <div className="text-[11px] text-[#B7ADA0]">Balance / Equity</div>
            <div
              data-testid="dashboard-account-balance"
              className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums"
            >
              {formatCurrency(analytics.currentBalance, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Eq {formatCurrency(analytics.currentEquity, currency)}
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Daily / Weekly / Monthly</div>
            <div
              className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                analytics.monthlyPnL > 0
                  ? 'text-emerald-400'
                  : analytics.monthlyPnL < 0
                  ? 'text-rose-400'
                  : 'text-[#FAF6EF]'
              }`}
            >
              {formatSignedCurrency(analytics.monthlyPnL, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              D {formatSignedCurrency(analytics.dailyPnL, currency)} · W{' '}
              {formatSignedCurrency(analytics.weeklyPnL, currency)}
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Win Rate &amp; Expectancy</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.winRate}%
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Exp {formatSignedCurrency(analytics.expectancy, currency)}/trade
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Profit Factor &amp; Avg R</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Realized {analytics.averageRealizedR > 0 ? '+' : ''}
              {analytics.averageRealizedR}R · Plan {analytics.averagePlannedRR}R
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Max Drawdown</div>
            <div
              className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                analytics.maxDrawdownPct > 0 ? 'text-rose-400' : 'text-[#FAF6EF]'
              }`}
            >
              {analytics.maxDrawdownPct > 0
                ? `-${analytics.maxDrawdownPct.toFixed(2)}%`
                : '0.00%'}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              {formatCurrency(analytics.maxDrawdownAbs, currency)} peak-to-trough
            </div>
          </div>

          <div className="lg:pl-6">
            <div className="text-[11px] text-[#B7ADA0]">Consistency &amp; Hold</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.consistencyScore}%
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Avg {formatDurationMinutes(analytics.averageHoldMinutes)} · Streak{' '}
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

      {/* Primary Focal Layer: Luminous Liquid-Glass Equity Curve vs Open Funded Rules Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <section className="lg:col-span-8 liquid-glass rounded-[28px] p-6 sm:p-7">
          <EquityCurveChart
            points={analytics.equityCurve}
            startingBalance={analytics.startingBalance}
            currency={currency}
          />
        </section>

        <section className="lg:col-span-4 flex flex-col justify-between py-1 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#FAF6EF]/15">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
                  Funded Account Tracker
                </h2>
                <p className="text-xs text-[#B7ADA0] mt-0.5">
                  {fp.firmName} · {fp.phaseName}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium shrink-0 ${
                  fp.status === 'Target Reached'
                    ? 'text-emerald-400'
                    : fp.status === 'Active'
                    ? 'text-[#3FA17F]'
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
              <div className="py-10 px-4 text-center space-y-3">
                <p className="text-xs text-[#B7ADA0] leading-relaxed">
                  No account is connected. Create an account to monitor profit targets, daily loss caps, and drawdown thresholds.
                </p>
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="btn-emerald-glass px-4 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
                >
                  Create Account
                </button>
              </div>
            ) : !fp.enabled ? (
              <div className="py-10 px-4 text-center space-y-3">
                <p className="text-xs text-[#B7ADA0] leading-relaxed">
                  Prop-firm challenge rules are disabled for this personal live account.
                </p>
                <button
                  type="button"
                  onClick={onOpenAccountSettings}
                  className="text-xs font-medium text-[#3FA17F] hover:text-[#FAF6EF] transition-colors"
                >
                  Enable Funded Challenge Rules
                </button>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#D5CBC0]">
                      Profit Target ({account.fundedRules.profitTargetPct}%)
                    </span>
                    <span className="font-mono text-[#FAF6EF] tabular-nums">
                      {formatSignedCurrency(fp.currentProfitAmount, currency)} /{' '}
                      {formatCurrency(fp.profitTargetAmount, currency)}
                    </span>
                  </div>
                  <div className="h-2 bg-[#0A0807]/60 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0E4A38] via-[#258767] to-[#34D399]"
                      style={{ width: `${fp.profitTargetProgressPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#B7ADA0] text-right tabular-nums">
                    {fp.profitTargetProgressPct}% achieved
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#D5CBC0]">
                      Daily Loss Limit ({account.fundedRules.maxDailyLossPct}%)
                    </span>
                    <span className="font-mono text-[#FAF6EF] tabular-nums">
                      {formatCurrency(fp.dailyLossRemaining, currency)} left
                    </span>
                  </div>
                  <div className="h-2 bg-[#0A0807]/60 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        fp.dailyLossUsedPct > 70 ? 'bg-rose-500' : 'bg-[#3571A5]'
                      }`}
                      style={{ width: `${fp.dailyLossUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#9A8F83] tabular-nums">
                    Limit {formatCurrency(fp.maxDailyLossAmount, currency)} · Today{' '}
                    {formatSignedCurrency(fp.todayPnL, currency)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-[#D5CBC0]">
                      Max Drawdown ({account.fundedRules.maxTotalDrawdownPct}%)
                    </span>
                    <span className="font-mono text-[#FAF6EF] tabular-nums">
                      {formatCurrency(fp.totalDrawdownRemaining, currency)} left
                    </span>
                  </div>
                  <div className="h-2 bg-[#0A0807]/60 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-rose-500/85"
                      style={{ width: `${fp.totalDrawdownUsedPct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-[#9A8F83] tabular-nums">
                    Used {formatCurrency(fp.currentDrawdownFromStartOrPeak, currency)} of{' '}
                    {formatCurrency(fp.maxTotalDrawdownAmount, currency)}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#FAF6EF]/12 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[#D5CBC0]">Minimum Profitable Days</div>
                    <div className="text-[11px] text-[#9A8F83] font-mono">
                      &ge; {formatCurrency(fp.profitableDayThresholdAmount, currency)}/day
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold text-[#3FA17F] tabular-nums">
                    {fp.profitableDaysAchieved} / {fp.minProfitableDays}
                  </div>
                </div>
              </div>
            )}

            {/* Capital & Cash Flow Summary */}
            <div className="mt-6 pt-4 border-t border-[#FAF6EF]/12 flex items-center justify-between text-xs">
              <div>
                <div className="text-[#B7ADA0]">Capital &amp; Cash Activity</div>
                <div className="text-[11px] font-mono text-[#9A8F83] tabular-nums mt-0.5">
                  Start {formatCurrency(analytics.startingBalance, currency)} · +{formatCurrency(analytics.totalDeposits, currency)} / -{formatCurrency(analytics.totalWithdrawals, currency)}
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="text-xs font-medium text-[#3FA17F] hover:text-[#FAF6EF] shrink-0"
              >
                Ledger
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Trading Calendar Heatmap (Luminous Liquid Glass) + Open Performance Intelligence Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <TradingCalendarHeatmap
          dailyCalendar={analytics.dailyCalendar}
          trades={trades}
          account={account}
          onInspectTrade={onInspectTrade}
        />

        <section className="lg:col-span-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#FAF6EF]/15">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
                Performance Breakdown
              </h2>
              <p className="text-xs text-[#B7ADA0] mt-0.5">
                Computed live from your recorded execution history
              </p>
            </div>

            <div className="inline-flex items-center rounded-xl liquid-glass-inset p-1 gap-1">
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
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    breakdownTab === tab.id
                      ? 'bg-[#0E4A38]/70 text-[#FAF6EF] border border-[#258767]/50'
                      : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Open Summary Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#FAF6EF]/12 text-xs">
            <div>
              <div className="text-[#9A8F83]">Strongest Session</div>
              <div className="mt-1 font-medium text-[#FAF6EF] truncate">
                {analytics.strongestSession ? analytics.strongestSession.key : '—'}
              </div>
              <div
                className={`mt-0.5 font-mono tabular-nums ${
                  analytics.strongestSession && analytics.strongestSession.netPnL > 0
                    ? 'text-emerald-400'
                    : 'text-[#B7ADA0]'
                }`}
              >
                {analytics.strongestSession
                  ? formatSignedCurrency(analytics.strongestSession.netPnL, currency)
                  : formatCurrency(0, currency)}
              </div>
            </div>

            <div>
              <div className="text-[#9A8F83]">Weakest Session</div>
              <div className="mt-1 font-medium text-[#FAF6EF] truncate">
                {analytics.weakestSession ? analytics.weakestSession.key : '—'}
              </div>
              <div
                className={`mt-0.5 font-mono tabular-nums ${
                  analytics.weakestSession && analytics.weakestSession.netPnL < 0
                    ? 'text-rose-400'
                    : 'text-[#B7ADA0]'
                }`}
              >
                {analytics.weakestSession
                  ? formatSignedCurrency(analytics.weakestSession.netPnL, currency)
                  : formatCurrency(0, currency)}
              </div>
            </div>

            <div>
              <div className="text-[#9A8F83]">Top Instrument</div>
              <div className="mt-1 font-mono font-medium text-[#3FA17F] truncate">
                {analytics.mostProfitableInstrument
                  ? analytics.mostProfitableInstrument.key
                  : '—'}
              </div>
              <div
                className={`mt-0.5 font-mono tabular-nums ${
                  analytics.mostProfitableInstrument && analytics.mostProfitableInstrument.netPnL > 0
                    ? 'text-emerald-400'
                    : 'text-[#B7ADA0]'
                }`}
              >
                {analytics.mostProfitableInstrument
                  ? formatSignedCurrency(analytics.mostProfitableInstrument.netPnL, currency)
                  : formatCurrency(0, currency)}
              </div>
            </div>
          </div>

          {activeBreakdownRows.length === 0 ? (
            <div className="py-10 rounded-2xl liquid-glass-inset text-center text-xs text-[#9A8F83]">
              No closed trades available for breakdown analysis.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#FAF6EF]/15 text-[#B7ADA0]">
                    <th className="py-2.5 text-left font-medium">Segment</th>
                    <th className="py-2.5 text-right font-medium">Trades</th>
                    <th className="py-2.5 text-right font-medium">Win %</th>
                    <th className="py-2.5 text-right font-medium">PF</th>
                    <th className="py-2.5 text-right font-medium">Avg R</th>
                    <th className="py-2.5 text-right font-medium">Net P&amp;L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF6EF]/10 font-mono tabular-nums">
                  {activeBreakdownRows.map((row) => (
                    <tr key={row.key} className="hover:bg-[#FAF6EF]/[0.04] transition-colors">
                      <td className="py-3 pr-3 font-sans font-medium text-[#FAF6EF]">
                        {row.key}
                      </td>
                      <td className="py-3 text-right text-[#D5CBC0]">{row.trades}</td>
                      <td className="py-3 text-right text-[#D5CBC0]">{row.winRate}%</td>
                      <td className="py-3 text-right text-[#3571A5]">
                        {row.profitFactor.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-[#D5CBC0]">
                        {row.avgRR > 0 ? '+' : ''}
                        {row.avgRR}R
                      </td>
                      <td
                        className={`py-3 text-right font-semibold ${
                          row.netPnL > 0
                            ? 'text-emerald-400'
                            : row.netPnL < 0
                            ? 'text-rose-400'
                            : 'text-[#FAF6EF]'
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
      </div>

      {/* Psychology, Discipline & Edge Leakage */}
      <section className="pt-4 border-t border-[#FAF6EF]/12 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
              Psychology, Discipline &amp; Edge Leakage
            </h2>
            <p className="text-xs text-[#B7ADA0] mt-0.5">
              Behavioral adherence, emotional states, and recurring execution mistakes.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
            <span className="text-[#B7ADA0]">
              Max Win Streak:{' '}
              <strong className="text-emerald-400">{analytics.longestWinStreak}</strong>
            </span>
            <span className="text-[#B7ADA0]">
              Max Loss Streak:{' '}
              <strong className="text-rose-400">{analytics.longestLossStreak}</strong>
            </span>
          </div>
        </div>

        {/* Frosted Behavioral Ribbon */}
        <div className="liquid-glass-subtle rounded-[24px] px-6 py-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:divide-x lg:divide-[#FAF6EF]/12">
          <div className="lg:pr-5">
            <div className="text-xs text-[#B7ADA0]">Plan Adherence Rate</div>
            <div className="mt-1.5 font-mono text-2xl font-semibold text-[#3FA17F] tabular-nums">
              {analytics.psychology.planAdherenceRate}%
            </div>
            <div className="mt-0.5 text-[11px] font-mono text-[#9A8F83] tabular-nums">
              In-plan {formatSignedCurrency(analytics.psychology.followedPlanPnL, currency)}
            </div>
          </div>

          <div className="lg:px-5">
            <div className="text-xs text-[#B7ADA0]">Rule-Break Cost</div>
            <div
              className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
                analytics.psychology.brokenPlanPnL < 0 ? 'text-rose-400' : 'text-[#FAF6EF]'
              }`}
            >
              {formatSignedCurrency(analytics.psychology.brokenPlanPnL, currency)}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9A8F83]">
              Net P&amp;L on unverified / broken rules
            </div>
          </div>

          <div className="lg:px-5">
            <div className="text-xs text-[#B7ADA0]">Revenge Trades</div>
            <div className="mt-1.5 font-mono text-2xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.psychology.revengeTradesCount}
            </div>
            <div
              className={`mt-0.5 text-[11px] font-mono tabular-nums ${
                analytics.psychology.revengeTradesPnL < 0 ? 'text-rose-400' : 'text-[#9A8F83]'
              }`}
            >
              Impact {formatSignedCurrency(analytics.psychology.revengeTradesPnL, currency)}
            </div>
          </div>

          <div className="lg:pl-5">
            <div className="text-xs text-[#B7ADA0]">Overtrading Days</div>
            <div className="mt-1.5 font-mono text-2xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.psychology.overtradingDaysCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9A8F83]">
              {account
                ? `Days exceeding ${account.maxDailyTrades} trades/day cap`
                : 'Configured per account'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xs font-medium text-[#EFE7DC] pb-2.5 border-b border-[#FAF6EF]/12">
              Performance by Emotion
            </h3>
            {analytics.psychology.byEmotion.length === 0 ? (
              <p className="text-xs text-[#9A8F83] pt-3">No emotional data recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#FAF6EF]/10 text-xs">
                {analytics.psychology.byEmotion.map((row) => (
                  <div key={row.key} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[#FAF6EF]">{row.key}</span>
                      <span className="text-[#9A8F83] font-mono ml-2">
                        {row.trades}t · {row.winRate}%
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        row.netPnL > 0
                          ? 'text-emerald-400'
                          : row.netPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EF]'
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
            <h3 className="text-xs font-medium text-[#EFE7DC] pb-2.5 border-b border-[#FAF6EF]/12">
              Setup Quality Grading
            </h3>
            {analytics.psychology.bySetupQuality.length === 0 ? (
              <p className="text-xs text-[#9A8F83] pt-3">No setup grades recorded yet.</p>
            ) : (
              <div className="divide-y divide-[#FAF6EF]/10 text-xs">
                {analytics.psychology.bySetupQuality.map((row) => (
                  <div key={row.key} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono font-semibold text-[#FAF6EF]">Grade {row.key}</span>
                      <span className="text-[#9A8F83] font-mono ml-2">
                        {row.trades}t · {row.winRate}% WR
                      </span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        row.netPnL > 0
                          ? 'text-emerald-400'
                          : row.netPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EF]'
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
            <h3 className="text-xs font-medium text-[#EFE7DC] pb-2.5 border-b border-[#FAF6EF]/12">
              Recurring Mistakes
            </h3>
            {analytics.psychology.topMistakes.length === 0 ? (
              <p className="text-xs text-[#B7ADA0] pt-3">
                Zero behavioral mistakes logged on closed trades.
              </p>
            ) : (
              <div className="divide-y divide-[#FAF6EF]/10 text-xs">
                {analytics.psychology.topMistakes.map((m) => (
                  <div key={m.mistake} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[#FAF6EF]">{m.mistake}</span>
                      <span className="text-[#9A8F83] font-mono ml-2">({m.count}x)</span>
                    </div>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        m.totalPnL > 0
                          ? 'text-emerald-400'
                          : m.totalPnL < 0
                          ? 'text-rose-400'
                          : 'text-[#FAF6EF]'
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
