import { ArrowUpRight, Calculator, CheckSquare, Clock, Layers, Plus, ShieldCheck } from 'lucide-react';
import { PerformanceAnalytics } from '../core/analytics';
import { TRADING_QUOTES } from '../core/seed';
import { formatMinutesAsClock, OrbWindowStatus, SessionWindowStatus } from '../core/sessions';
import {
  ChecklistItem,
  DailyChecklistRecord,
  NavSection,
  Trade,
  TradingAccount,
} from '../core/types';
import { formatCurrency, formatShortDate, formatSignedCurrency } from './Formatters';

interface HomeViewProps {
  account: TradingAccount;
  analytics: PerformanceAnalytics;
  selectedInstrument: string;
  watchlist: string[];
  onSelectInstrument: (symbol: string) => void;
  sessions: SessionWindowStatus[];
  orbWindows: OrbWindowStatus[];
  utcTimeLabel: string;
  activeSessionLabel: string;
  todayRecord: DailyChecklistRecord;
  checklistItems: ChecklistItem[];
  recentTrades: Trade[];
  onNavigate: (section: NavSection) => void;
  onOpenNewTrade: () => void;
  onOpenTool: (tab: 'risk' | 'strategy' | 'accounts') => void;
  onInspectTrade: (trade: Trade) => void;
}

export function HomeView({
  account,
  analytics,
  selectedInstrument,
  watchlist,
  onSelectInstrument,
  sessions,
  orbWindows,
  utcTimeLabel,
  activeSessionLabel,
  todayRecord,
  checklistItems,
  recentTrades,
  onNavigate,
  onOpenNewTrade,
  onOpenTool,
  onInspectTrade,
}: HomeViewProps) {
  const enabledChecklist = checklistItems.filter((i) => i.enabled);
  const completedCount = enabledChecklist.filter((i) =>
    todayRecord.completedIds.includes(i.id)
  ).length;
  const checklistPct =
    enabledChecklist.length > 0 ? Math.round((completedCount / enabledChecklist.length) * 100) : 0;

  // Deterministic daily quote based on date string
  const daySeed = todayRecord.date
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const dailyQuote = TRADING_QUOTES[daySeed % TRADING_QUOTES.length];

  const tradingStateLabel =
    analytics.fundedProgress.status === 'Daily Limit Breached' ||
    analytics.fundedProgress.status === 'Max Drawdown Breached'
      ? 'Risk Limit Breached — Trading Halted'
      : checklistPct === 100
      ? 'Pre-Market Complete — Cleared for Execution'
      : checklistPct > 0
      ? 'Pre-Market In Progress — Complete Checklist'
      : 'Pre-Market Pending — Begin Daily Routine';

  const tradingStateTone =
    analytics.fundedProgress.status === 'Daily Limit Breached' ||
    analytics.fundedProgress.status === 'Max Drawdown Breached'
      ? 'text-rose-400'
      : checklistPct === 100
      ? 'text-emerald-400'
      : 'text-[#00BFFF]';

  return (
    <div className="space-y-8">
      {/* Hero Command Overview */}
      <section className="glass-panel rounded-xl p-6 sm:p-8 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#8A2BE2]/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#00BFFF]/10 blur-3xl"
        />

        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className={`font-medium ${tradingStateTone}`}>{tradingStateLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{account.name}</span>
              <span aria-hidden="true">·</span>
              <span>{todayRecord.marketBias} Bias</span>
            </div>

            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white [text-wrap:balance]">
              Command your edge with calibrated risk and precision execution.
            </h1>

            <blockquote className="text-sm text-slate-400 leading-relaxed pt-1">
              “{dailyQuote.quote}” — <span className="text-slate-300">{dailyQuote.author}</span>
            </blockquote>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('checklist')}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-white/[0.06] hover:bg-white/[0.11] border border-white/[0.1] rounded-lg transition-colors whitespace-nowrap"
            >
              <CheckSquare className="w-4 h-4 text-[#00BFFF]" />
              <span>Pre-Market ({checklistPct}%)</span>
            </button>

            <button
              type="button"
              onClick={onOpenNewTrade}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] hover:opacity-95 rounded-lg transition-opacity whitespace-nowrap accent-glow-cyan"
            >
              <Plus className="w-4 h-4" />
              <span>Log Execution</span>
            </button>
          </div>
        </div>

        {/* Account Summary Strip */}
        <div className="relative mt-8 pt-6 border-t border-white/[0.08] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
          <div>
            <div className="text-xs text-slate-400">Account Balance</div>
            <div className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {formatCurrency(analytics.currentBalance, account.currency)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              Equity {formatCurrency(analytics.currentEquity, account.currency)}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Net Return</div>
            <div
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                analytics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatSignedCurrency(analytics.netPnL, account.currency)}
            </div>
            <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {analytics.netReturnPct >= 0 ? '+' : ''}
              {analytics.netReturnPct}% overall
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Today P&amp;L</div>
            <div
              className={`mt-1 font-mono text-xl font-semibold tabular-nums ${
                analytics.dailyPnL > 0
                  ? 'text-emerald-400'
                  : analytics.dailyPnL < 0
                  ? 'text-rose-400'
                  : 'text-slate-200'
              }`}
            >
              {formatSignedCurrency(analytics.dailyPnL, account.currency)}
            </div>
            <div className="mt-0.5 text-xs text-slate-500 font-mono tabular-nums">
              {analytics.fundedProgress.dailyLossUsedPct}% daily limit used
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Win Rate</div>
            <div className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {analytics.winRate}%
            </div>
            <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {analytics.wins}W · {analytics.losses}L ({analytics.closedTrades} trades)
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Profit Factor</div>
            <div className="mt-1 font-mono text-xl font-semibold text-[#00BFFF] tabular-nums">
              {analytics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              Avg {analytics.averageRealizedR >= 0 ? '+' : ''}
              {analytics.averageRealizedR}R realized
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400">Funded Target</div>
            <div className="mt-1 font-mono text-xl font-semibold text-white tabular-nums">
              {analytics.fundedProgress.enabled
                ? `${analytics.fundedProgress.profitTargetProgressPct}%`
                : 'Live'}
            </div>
            <div className="mt-0.5 text-xs text-slate-400 font-mono tabular-nums">
              {analytics.fundedProgress.enabled
                ? `${analytics.fundedProgress.profitableDaysAchieved}/${analytics.fundedProgress.minProfitableDays} prof days`
                : account.broker}
            </div>
          </div>
        </div>
      </section>

      {/* Main Asymmetric Split: Market Sessions & Tools vs Checklist & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Market Sessions, 15m ORB Windows & Quick Tools */}
        <div className="lg:col-span-7 space-y-6">
          <section className="glass-panel rounded-xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Market Sessions &amp; 15m Opening Ranges
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                  {activeSessionLabel} · {utcTimeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenTool('strategy')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#00BFFF] hover:text-white transition-colors"
              >
                <span>Configure ORB Rules</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Session Clocks */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <div
                  key={s.name}
                  className="p-3.5 rounded-lg bg-white/[0.02] border border-white/[0.06]"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{s.name}</span>
                    <span
                      className={`font-mono ${
                        s.isOpen ? 'text-[#00BFFF]' : 'text-slate-500'
                      }`}
                    >
                      {s.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] transition-all duration-300"
                      style={{ width: `${s.isOpen ? s.progressPct : 0}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>
                      {String(s.openHourUtc).padStart(2, '0')}:00–
                      {String(s.closeHourUtc).padStart(2, '0')}:00
                    </span>
                    <span>
                      {s.isOpen ? 'Closes' : 'Opens'} in {formatMinutesAsClock(s.minutesUntilChange)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 15-Minute Opening Range Windows */}
            <div className="mt-5 pt-5 border-t border-white/[0.06] space-y-2.5">
              <div className="text-xs font-medium text-slate-300">Active ORB Horizons</div>
              <div className="divide-y divide-white/[0.06]">
                {orbWindows.map((orb) => (
                  <div
                    key={orb.id}
                    className="py-2.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{orb.sessionName}</span>
                      <span className="text-slate-500 font-mono tabular-nums hidden sm:inline">
                        {orb.startLabelUtc} → {orb.endRangeLabelUtc}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                      <span
                        className={
                          orb.phase === 'Forming Range'
                            ? 'text-[#00BFFF]'
                            : orb.phase === 'Breakout Window'
                            ? 'text-emerald-400'
                            : 'text-slate-500'
                        }
                      >
                        {orb.phase}
                      </span>
                      {orb.phase !== 'Disabled' && (
                        <span className="text-slate-500">
                          · {formatMinutesAsClock(orb.minutesRemainingInPhase)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Watchlist Quick Selector */}
            <div className="mt-5 pt-5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Focus Watchlist</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {watchlist.map((sym) => {
                  const active = sym === selectedInstrument;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => onSelectInstrument(sym)}
                      className={`px-3 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-[#00BFFF]/15 text-[#00BFFF] border border-[#00BFFF]/40'
                          : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Frequently Used Tools Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => onOpenTool('risk')}
              className="glass-panel rounded-xl p-5 text-left hover:border-[#00BFFF]/40 transition-colors group"
            >
              <Calculator className="w-5 h-5 text-[#00BFFF]" />
              <div className="mt-3 font-display text-sm font-semibold text-white group-hover:text-[#00BFFF] transition-colors">
                Position Size Calculator
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Exact lot sizing for {selectedInstrument} and custom contract specs.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onOpenTool('strategy')}
              className="glass-panel rounded-xl p-5 text-left hover:border-[#8A2BE2]/40 transition-colors group"
            >
              <Layers className="w-5 h-5 text-[#8A2BE2]" />
              <div className="mt-3 font-display text-sm font-semibold text-white group-hover:text-[#8A2BE2] transition-colors">
                15m ORB Strategy Model
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Session opening ranges, CISD, FVG, and liquidity rules.
              </p>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="glass-panel rounded-xl p-5 text-left hover:border-white/25 transition-colors group"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div className="mt-3 font-display text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors">
                Funded Rules Monitor
              </div>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {formatCurrency(analytics.fundedProgress.dailyLossRemaining, account.currency)} daily
                loss buffer remaining.
              </p>
            </button>
          </section>
        </div>

        {/* Right Column (5 cols): Today's Pre-Market Highlights & Recent Trades */}
        <div className="lg:col-span-5 space-y-6">
          {/* Today's Checklist Highlight */}
          <section className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Daily Routine &amp; Highlights
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {todayRecord.date} · Readiness {todayRecord.readinessScore}/10
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('checklist')}
                className="text-xs font-medium text-[#00BFFF] hover:text-white transition-colors"
              >
                Open Checklist
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Pre-Market Completion</span>
                <span className="font-mono text-white tabular-nums">
                  {completedCount}/{enabledChecklist.length} ({checklistPct}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] transition-all duration-300"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>

              <div className="pt-2 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Market Bias</span>
                  <span className="text-slate-200 font-medium">{todayRecord.marketBias}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Economic News Risk</span>
                  <span className="text-slate-200 font-medium">{todayRecord.newsImpact}</span>
                </div>
                {todayRecord.htfLevelsNote && (
                  <div className="pt-2 border-t border-white/[0.06] text-slate-300 leading-relaxed">
                    <span className="text-slate-500">HTF Key Levels: </span>
                    {todayRecord.htfLevelsNote}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recent Executions */}
          <section className="glass-panel rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <h2 className="font-display text-lg font-semibold text-white">Recent Executions</h2>
              <button
                type="button"
                onClick={() => onNavigate('trades')}
                className="text-xs font-medium text-[#00BFFF] hover:text-white transition-colors"
              >
                View All ({analytics.totalTrades})
              </button>
            </div>

            {recentTrades.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">No executions logged for this account yet.</p>
                <button
                  type="button"
                  onClick={onOpenNewTrade}
                  className="mt-3 text-xs font-medium text-[#00BFFF] hover:underline"
                >
                  Log your first trade
                </button>
              </div>
            ) : (
              <div className="mt-2 divide-y divide-white/[0.06]">
                {recentTrades.slice(0, 5).map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => onInspectTrade(trade)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] px-2 -mx-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-semibold text-white">
                          {trade.instrument}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            trade.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {trade.direction}
                        </span>
                        <span className="text-xs text-slate-500">· {trade.setupQuality}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {formatShortDate(trade.entryTime)} · {trade.session} · {trade.setupType}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono text-sm font-semibold tabular-nums ${
                          trade.actualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatSignedCurrency(trade.actualPnL, account.currency)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {trade.lotSize.toFixed(2)} lots
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
