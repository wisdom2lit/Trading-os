import {
  ArrowDownUp,
  ArrowUpRight,
  Calculator,
  CheckSquare,
  Clock,
  Layers,
  Plus,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
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
import { MarketSessionGlobe } from './MarketSessionGlobe';

interface HomeViewProps {
  account: TradingAccount | null;
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
  const currency = account?.currency || 'USD';
  const enabledChecklist = checklistItems.filter((i) => i.enabled);
  const completedCount = enabledChecklist.filter((i) =>
    todayRecord.completedIds.includes(i.id)
  ).length;
  const checklistPct =
    enabledChecklist.length > 0 ? Math.round((completedCount / enabledChecklist.length) * 100) : 0;

  const daySeed = todayRecord.date
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const dailyQuote = TRADING_QUOTES[daySeed % TRADING_QUOTES.length];

  const tradingStateLabel = !account
    ? 'No Account Connected — Setup Required'
    : analytics.fundedProgress.status === 'Daily Limit Breached' ||
      analytics.fundedProgress.status === 'Max Drawdown Breached'
    ? 'Risk Limit Breached — Trading Halted'
    : checklistPct === 100
    ? 'Pre-Market Complete — Cleared for Execution'
    : checklistPct > 0
    ? 'Pre-Market In Progress — Complete Checklist'
    : 'Pre-Market Pending — Begin Daily Routine';

  const tradingStateTone = !account
    ? 'text-[#D5CBC0]'
    : analytics.fundedProgress.status === 'Daily Limit Breached' ||
      analytics.fundedProgress.status === 'Max Drawdown Breached'
    ? 'text-rose-400'
    : checklistPct === 100
    ? 'text-emerald-400'
    : 'text-[#4CA888]';

  return (
    <div className="space-y-12">
      {/* Open Editorial Hero + Floating Milky-Ivory Liquid-Glass Session Globe */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center pt-2">
        <div className="lg:col-span-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className={`font-medium ${tradingStateTone}`}>{tradingStateLabel}</span>
            <span aria-hidden="true" className="text-[#5C534A]">
              /
            </span>
            <span className="font-mono text-[#F5EFE6]">
              {account ? account.name : 'Unconnected Ledger'}
            </span>
            <span aria-hidden="true" className="text-[#5C534A]">
              /
            </span>
            <span className="text-[#B7ADA0]">{todayRecord.marketBias} Bias</span>
          </div>

          <h1 className="font-display text-3xl sm:text-[2.5rem] leading-[1.14] font-semibold tracking-tight text-[#FAF6EF] [text-wrap:balance]">
            Systematic capital execution, calibrated risk, and behavioral clarity.
          </h1>

          <blockquote className="text-sm text-[#B7ADA0] leading-relaxed max-w-xl">
            “{dailyQuote.quote}” — <span className="text-[#F5EFE6]">{dailyQuote.author}</span>
          </blockquote>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {!account ? (
              <button
                type="button"
                onClick={() => onOpenTool('accounts')}
                className="btn-emerald-glass inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF6EF] rounded-2xl whitespace-nowrap"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect or Create Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenNewTrade}
                className="btn-emerald-glass inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF6EF] rounded-2xl whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Execution</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('checklist')}
              className="btn-ivory-glass inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-[#FAF6EF] rounded-2xl whitespace-nowrap"
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#3FA17F]" />
              <span>Pre-Market ({checklistPct}%)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#B7ADA0] hover:text-[#FAF6EF] transition-colors whitespace-nowrap rounded-2xl"
            >
              <span>Open Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Floating Luminous Ivory Liquid-Glass Global Market-Session Globe */}
        <div className="lg:col-span-6 liquid-glass rounded-[28px] p-6 sm:p-7">
          <div className="flex items-center justify-between pb-3.5 mb-5 border-b border-[#FAF6EF]/15">
            <span className="text-xs font-medium text-[#EFE7DC]">
              Global Market-Session Telemetry
            </span>
            <span className="text-xs font-mono text-[#3571A5] font-medium tabular-nums">
              {activeSessionLabel} · {utcTimeLabel}
            </span>
          </div>
          <MarketSessionGlobe sessions={sessions} utcTimeLabel={utcTimeLabel} />
        </div>
      </section>

      {/* Truthful Account Summary Ribbon (Single Continuous Frosted Glass Sheet — Zero Fabricated Data) */}
      <section
        aria-label="Account summary metrics"
        className="liquid-glass-subtle rounded-[26px] px-6 py-6 sm:px-8"
      >
        {!account && (
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-[#FAF6EF]/12">
            <div>
              <div className="text-xs font-medium text-[#FAF6EF]">
                No trading account connected yet
              </div>
              <p className="text-xs text-[#B7ADA0] mt-0.5">
                All balances and return statistics remain at zero until you connect an account, record deposits, or log trades.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTool('accounts')}
              className="btn-ivory-glass inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 text-[#3FA17F]" />
              <span>Setup Account</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-6 gap-x-4 lg:gap-y-0 lg:divide-x lg:divide-[#FAF6EF]/12">
          <div className="lg:pr-6">
            <div className="text-[11px] text-[#B7ADA0]">Account Balance</div>
            <div
              data-testid="home-account-balance"
              className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums"
            >
              {formatCurrency(analytics.currentBalance, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Eq {formatCurrency(analytics.currentEquity, currency)}
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Net Return</div>
            <div
              data-testid="home-net-return"
              className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                analytics.netPnL > 0
                  ? 'text-emerald-400'
                  : analytics.netPnL < 0
                  ? 'text-rose-400'
                  : 'text-[#FAF6EF]'
              }`}
            >
              {formatSignedCurrency(analytics.netPnL, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              {analytics.netReturnPct > 0 ? '+' : ''}
              {analytics.netReturnPct}% cumulative
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Today P&amp;L</div>
            <div
              className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                analytics.dailyPnL > 0
                  ? 'text-emerald-400'
                  : analytics.dailyPnL < 0
                  ? 'text-rose-400'
                  : 'text-[#F5EFE6]'
              }`}
            >
              {formatSignedCurrency(analytics.dailyPnL, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              {analytics.fundedProgress.dailyLossUsedPct}% daily limit used
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Win Rate</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums">
              {analytics.winRate}%
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              {analytics.wins}W · {analytics.losses}L ({analytics.closedTrades} trades)
            </div>
          </div>

          <div className="lg:px-6">
            <div className="text-[11px] text-[#B7ADA0]">Profit Factor</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#F5EFE6] tabular-nums">
              {analytics.profitFactor.toFixed(2)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              Avg {analytics.averageRealizedR > 0 ? '+' : ''}
              {analytics.averageRealizedR}R realized
            </div>
          </div>

          <div className="lg:pl-6">
            <div className="text-[11px] text-[#B7ADA0]">Net Cash Flow</div>
            <div className="mt-1.5 font-mono text-xl font-semibold text-[#FAF6EF] tabular-nums">
              {formatSignedCurrency(analytics.netCashFlow, currency)}
            </div>
            <div className="mt-1 text-[11px] text-[#9A8F83] font-mono tabular-nums">
              +{formatCurrency(analytics.totalDeposits, currency)} / -{formatCurrency(analytics.totalWithdrawals, currency)}
            </div>
          </div>
        </div>
      </section>

      {/* Lower Asymmetric Workspace: Open Left Stream vs Luminous Right Readiness/Execution Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column (7 cols): Open 15m ORB Schedule & Workstation Tools */}
        <div className="lg:col-span-7 space-y-10">
          <section>
            <div className="flex items-center justify-between pb-3.5 border-b border-[#FAF6EF]/12">
              <div>
                <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
                  15-Minute Opening Range Schedule
                </h2>
                <p className="text-xs text-[#9A8F83] mt-0.5">
                  Independently configured breakout &amp; liquidity windows
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenTool('strategy')}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#3FA17F] hover:text-[#FAF6EF] transition-colors"
              >
                <span>Configure Rules</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#FAF6EF]/10">
              {orbWindows.map((orb) => (
                <div
                  key={orb.id}
                  className="py-3.5 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-[#82786D] shrink-0" />
                    <span className="font-medium text-[#F5EFE6] truncate">{orb.sessionName}</span>
                    <span className="text-[#82786D] font-mono tabular-nums hidden sm:inline">
                      {orb.startLabelUtc} → {orb.endRangeLabelUtc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                    <span
                      className={
                        orb.phase === 'Forming Range'
                          ? 'text-[#3571A5] font-medium'
                          : orb.phase === 'Breakout Window'
                          ? 'text-emerald-400 font-medium'
                          : 'text-[#82786D]'
                      }
                    >
                      {orb.phase}
                    </span>
                    {orb.phase !== 'Disabled' && (
                      <span className="text-[#82786D]">
                        · {formatMinutesAsClock(orb.minutesRemainingInPhase)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Focus Instrument Switcher */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#FAF6EF]/10">
              <span className="text-xs text-[#9A8F83]">Primary Instrument Focus</span>
              <div className="flex flex-wrap items-center gap-2">
                {watchlist.map((sym) => {
                  const active = sym === selectedInstrument;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => onSelectInstrument(sym)}
                      className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                        active
                          ? 'bg-[#0E4A38]/55 text-[#FAF6EF] border border-[#258767]/50'
                          : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-[#FAF6EF]/12 hover:bg-white/[0.05]'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Direct Workstation Tools (Clean Open Rows) */}
          <section>
            <div className="pb-3.5 border-b border-[#FAF6EF]/12">
              <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
                Workstation Utilities
              </h2>
            </div>

            <div className="divide-y divide-[#FAF6EF]/10">
              <button
                type="button"
                onClick={() => onOpenTool('risk')}
                className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAF6EF]/[0.04] px-3 -mx-3 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <Calculator className="w-4 h-4 text-[#258767] shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[#FAF6EF] group-hover:text-white transition-colors">
                      Position Size &amp; Risk Calculator
                    </div>
                    <div className="text-xs text-[#9A8F83] mt-0.5">
                      Precision lot sizing for {selectedInstrument} with configurable contract specifications
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#82786D] group-hover:text-[#FAF6EF] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onOpenTool('accounts')}
                className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAF6EF]/[0.04] px-3 -mx-3 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <ArrowDownUp className="w-4 h-4 text-[#3571A5] shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[#FAF6EF] group-hover:text-white transition-colors">
                      Accounts, Deposits &amp; Cash Ledger
                    </div>
                    <div className="text-xs text-[#9A8F83] mt-0.5">
                      Manage connected accounts, initial capital, deposits, withdrawals, and funded rules
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#82786D] group-hover:text-[#FAF6EF] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onOpenTool('strategy')}
                className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAF6EF]/[0.04] px-3 -mx-3 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <Layers className="w-4 h-4 text-[#258767] shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[#FAF6EF] group-hover:text-white transition-colors">
                      15m ORB Strategy &amp; Confluence Engine
                    </div>
                    <div className="text-xs text-[#9A8F83] mt-0.5">
                      Liquidity sweeps, Fair Value Gaps, Order Blocks, CISD, and iFVG rules
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#82786D] group-hover:text-[#FAF6EF] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="w-full py-4 flex items-center justify-between gap-4 text-left hover:bg-[#FAF6EF]/[0.04] px-3 -mx-3 rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-3.5">
                  <ShieldCheck className="w-4 h-4 text-[#3571A5] shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-[#FAF6EF] group-hover:text-white transition-colors">
                      Funded Evaluation Rules Monitor
                    </div>
                    <div className="text-xs text-[#9A8F83] mt-0.5 font-mono tabular-nums">
                      {account
                        ? `${formatCurrency(analytics.fundedProgress.dailyLossRemaining, currency)} daily loss buffer remaining`
                        : 'Connect an account to track drawdown & evaluation limits'}
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-[#82786D] group-hover:text-[#FAF6EF] shrink-0" />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column (5 cols): Luminous Milky-Ivory Liquid-Glass Readiness & Execution Sheet */}
        <aside className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-7 space-y-6">
          {/* Today's Pre-Market Highlights */}
          <div className="space-y-4 pb-6 border-b border-[#FAF6EF]/15">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
                  Daily Routine &amp; Highlights
                </h2>
                <p className="text-xs text-[#B7ADA0] mt-0.5 font-mono">
                  {todayRecord.date} · Readiness {todayRecord.readinessScore}/10
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('checklist')}
                className="text-xs font-medium text-[#3FA17F] hover:text-[#FAF6EF] transition-colors"
              >
                Open Checklist
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#B7ADA0]">Routine Completion</span>
                <span className="font-mono text-[#FAF6EF] tabular-nums">
                  {completedCount}/{enabledChecklist.length} ({checklistPct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-[#0A0807]/55 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0E4A38] via-[#258767] to-[#3571A5] transition-all duration-300"
                  style={{ width: `${checklistPct}%` }}
                />
              </div>
            </div>

            <div className="space-y-1.5 text-xs pt-1">
              <div className="flex items-center justify-between text-[#B7ADA0]">
                <span>Market Bias</span>
                <span className="text-[#FAF6EF] font-medium">{todayRecord.marketBias}</span>
              </div>
              <div className="flex items-center justify-between text-[#B7ADA0]">
                <span>Economic News Risk</span>
                <span className="text-[#FAF6EF] font-medium">{todayRecord.newsImpact}</span>
              </div>
              {todayRecord.htfLevelsNote && (
                <p className="pt-2 text-[#EFE7DC] leading-relaxed border-t border-[#FAF6EF]/12">
                  <span className="text-[#9A8F83]">HTF Key Levels: </span>
                  {todayRecord.htfLevelsNote}
                </p>
              )}
            </div>
          </div>

          {/* Recent Executions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
                Recent Executions
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('trades')}
                className="text-xs font-medium text-[#3FA17F] hover:text-[#FAF6EF] transition-colors"
              >
                View All ({analytics.totalTrades})
              </button>
            </div>

            {recentTrades.length === 0 ? (
              <div className="py-8 px-4 rounded-2xl liquid-glass-inset text-center space-y-2.5">
                <p className="text-xs text-[#B7ADA0]">
                  {account
                    ? 'No executions logged for this account yet.'
                    : 'Connect an account and record your first execution to populate live journal telemetry.'}
                </p>
                <button
                  type="button"
                  onClick={account ? onOpenNewTrade : () => onOpenTool('accounts')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3FA17F] hover:text-[#FAF6EF] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{account ? 'Log your first trade' : 'Connect account'}</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#FAF6EF]/10">
                {recentTrades.slice(0, 5).map((trade) => (
                  <button
                    key={trade.id}
                    type="button"
                    onClick={() => onInspectTrade(trade)}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left hover:bg-[#FAF6EF]/[0.05] px-2.5 -mx-2.5 rounded-xl transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-[#FAF6EF]">
                          {trade.instrument}
                        </span>
                        <span
                          className={
                            trade.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'
                          }
                        >
                          {trade.direction}
                        </span>
                        <span className="text-[#82786D]">· {trade.setupQuality}</span>
                      </div>
                      <div className="text-[11px] text-[#9A8F83] truncate mt-0.5">
                        {formatShortDate(trade.entryTime)} · {trade.session} · {trade.setupType}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono text-xs font-semibold tabular-nums ${
                          trade.actualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatSignedCurrency(trade.actualPnL, currency)}
                      </div>
                      <div className="text-[10px] font-mono text-[#82786D] tabular-nums">
                        {trade.lotSize.toFixed(2)} lots
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
