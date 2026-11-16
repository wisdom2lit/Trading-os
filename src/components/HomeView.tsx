import {
  ArrowUpRight,
  Calculator,
  CheckSquare,
  Plus,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PerformanceAnalytics } from '../core/analytics';
import { TRADING_QUOTES } from '../core/seed';
import { OrbWindowStatus, SessionWindowStatus } from '../core/sessions';
import {
  ChecklistItem,
  DailyChecklistRecord,
  NavSection,
  TradingAccount,
} from '../core/types';
import { formatCurrency, formatSignedCurrency } from './Formatters';
import { MarketSessionGlobe } from './MarketSessionGlobe';

interface HomeViewProps {
  account: TradingAccount | null;
  analytics: PerformanceAnalytics;
  selectedInstrument: string;
  sessions: SessionWindowStatus[];
  orbWindows: OrbWindowStatus[];
  utcTimeLabel: string;
  activeSessionLabel: string;
  todayRecord: DailyChecklistRecord;
  checklistItems: ChecklistItem[];
  onNavigate: (section: NavSection) => void;
  onOpenNewTrade: () => void;
  onOpenTool: (tab: 'risk' | 'strategy' | 'accounts') => void;
}

export function HomeView({
  account,
  analytics,
  selectedInstrument,
  sessions,
  orbWindows,
  utcTimeLabel,
  activeSessionLabel,
  todayRecord,
  checklistItems,
  onNavigate,
  onOpenNewTrade,
  onOpenTool,
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

  const utcHour = Number(utcTimeLabel.slice(0, 2)) || 12;
  const greeting =
    utcHour < 12 ? 'Good morning' : utcHour < 17 ? 'Good afternoon' : 'Good evening';

  const activeOrb = orbWindows.find((o) => o.phase !== 'Disabled') || orbWindows[0];

  const stateLabel = !account
    ? 'Unconnected Ledger'
    : analytics.fundedProgress.status === 'Daily Limit Breached' ||
      analytics.fundedProgress.status === 'Max Drawdown Breached'
    ? 'Risk Limit Breached'
    : checklistPct === 100
    ? 'Pre-Market Cleared'
    : 'Pre-Market Pending';

  const stateTone = !account
    ? 'text-[#C9BA9E]'
    : analytics.fundedProgress.status === 'Daily Limit Breached' ||
      analytics.fundedProgress.status === 'Max Drawdown Breached'
    ? 'text-rose-400'
    : checklistPct === 100
    ? 'text-emerald-400'
    : 'text-[#FFD36A]';

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* =====================================================================
          HERO EXPERIENCE: Bold "TRADE", Free-Floating Liquid Sphere, Open Metrics
         ===================================================================== */}
      <section className="relative pt-2 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Focal Column: Bold Display + Electric Lime Actions + Floating Metrics */}
          <div className="lg:col-span-5 space-y-8 text-center lg:text-left">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs sm:text-sm font-bold">
                <span className="text-[#C9BA9E]">{greeting}</span>
                <span aria-hidden="true" className="text-[#E8D7A8]/30">
                  ·
                </span>
                <span className={stateTone}>{stateLabel}</span>
                <span aria-hidden="true" className="text-[#E8D7A8]/30">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono font-bold text-[#B7FF00] tabular-nums">
                  <span className="h-2 w-2 rounded-full bg-[#B7FF00] shadow-[0_0_10px_#B7FF00]" />
                  <span>{activeSessionLabel}</span>
                </span>
              </div>

              <h1 className="font-display text-6xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-[0.04em] text-[#FAF6EE] leading-none drop-shadow-[0_8px_32px_rgba(183,255,0,0.12)]">
                TRADE
              </h1>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 text-xs sm:text-sm font-mono font-bold text-[#E8D7A8] pt-1">
                <span>{account ? account.name : 'No account connected'}</span>
                <span aria-hidden="true" className="text-[#E8D7A8]/30">
                  ·
                </span>
                <span className="text-[#FFD36A]">{selectedInstrument}</span>
                <span aria-hidden="true" className="text-[#E8D7A8]/30">
                  ·
                </span>
                <span>{todayRecord.marketBias}</span>
              </div>
            </div>

            {/* Standout Primary Action + Liquid Glass Secondary Controls */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
              <button
                type="button"
                onClick={account ? onOpenNewTrade : () => onOpenTool('accounts')}
                className={`${
                  account ? 'glass-lime-cta' : 'glass-gold-cta'
                } inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-extrabold tracking-wide whitespace-nowrap`}
              >
                {account ? (
                  <>
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Log Trade</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 stroke-[2.5]" />
                    <span>Connect Account</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigate('checklist')}
                className="glass-control inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                <CheckSquare className="w-4 h-4 text-[#FFD36A]" />
                <span>Pre-Market ({checklistPct}%)</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="glass-control inline-flex items-center gap-1.5 px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap"
              >
                <span>Analytics</span>
                <ArrowUpRight className="w-4 h-4 text-[#E8D7A8]" />
              </button>
            </div>

            {/* Free-Floating Account Balance & Core Return Metrics */}
            <div
              aria-label="Account summary metrics"
              className="pt-7 border-t border-[#E8D7A8]/16 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5 text-left"
            >
              <div>
                <div className="text-xs font-bold text-[#C9BA9E]">Account Balance</div>
                <div
                  data-testid="home-account-balance"
                  className="mt-1 font-mono text-2xl sm:text-3xl font-extrabold text-[#FAF6EE] tabular-nums"
                >
                  {formatCurrency(analytics.currentBalance, currency)}
                </div>
                <div className="mt-0.5 text-xs font-mono font-bold text-[#9C8C72] tabular-nums">
                  Eq {formatCurrency(analytics.currentEquity, currency)}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#C9BA9E]">Net Return</div>
                <div
                  data-testid="home-net-return"
                  className={`mt-1 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums ${
                    analytics.netPnL > 0
                      ? 'text-emerald-400'
                      : analytics.netPnL < 0
                      ? 'text-rose-400'
                      : 'text-[#FAF6EE]'
                  }`}
                >
                  {formatSignedCurrency(analytics.netPnL, currency)}
                </div>
                <div className="mt-0.5 text-xs font-mono font-bold text-[#9C8C72] tabular-nums">
                  {analytics.netReturnPct > 0 ? '+' : ''}
                  {analytics.netReturnPct}% cumulative
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#C9BA9E]">Today P&amp;L</div>
                <div
                  className={`mt-1 font-mono text-2xl sm:text-3xl font-extrabold tabular-nums ${
                    analytics.dailyPnL > 0
                      ? 'text-emerald-400'
                      : analytics.dailyPnL < 0
                      ? 'text-rose-400'
                      : 'text-[#E8D7A8]'
                  }`}
                >
                  {formatSignedCurrency(analytics.dailyPnL, currency)}
                </div>
                <div className="mt-0.5 text-xs font-mono font-bold text-[#9C8C72] tabular-nums">
                  {analytics.winRate}% WR · {analytics.profitFactor.toFixed(2)} PF
                </div>
              </div>
            </div>

            {!account && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs sm:text-sm font-semibold text-[#C9BA9E]">
                <span>Balances remain at zero until an account, deposit, or trade is recorded.</span>
                <button
                  type="button"
                  onClick={() => onOpenTool('accounts')}
                  className="text-[#FFD36A] hover:underline font-extrabold"
                >
                  Setup Account &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Centerpiece Free-Floating Rotating 3D Globe */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <MarketSessionGlobe sessions={sessions} utcTimeLabel={utcTimeLabel} />
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECONDARY CURATED SECTION: Daily Insight, Discipline Reminder & Portals
         ===================================================================== */}
      <section className="pt-10 border-t border-[#E8D7A8]/14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div className="text-xs font-mono font-bold text-[#B7FF00]">
            Daily Trading Guidance · Readiness {todayRecord.readinessScore}/10
          </div>
          <blockquote className="font-display text-xl sm:text-2xl font-bold text-[#E8D7A8] leading-snug max-w-2xl">
            &ldquo;{dailyQuote.quote}&rdquo;
          </blockquote>
          <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#C9BA9E]">
            <span className="text-[#FAF6EE] font-bold">{dailyQuote.author}</span>
            <span aria-hidden="true" className="text-[#E8D7A8]/30">
              ·
            </span>
            <span>
              {activeOrb
                ? `${activeOrb.sessionName}: ${activeOrb.startLabelUtc}–${activeOrb.endRangeLabelUtc} (${activeOrb.phase})`
                : 'Define your 15m Opening Range before placing alerts.'}
            </span>
          </div>
        </div>

        {/* Liquid Glass Workstation Portals */}
        <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-3">
          <button
            type="button"
            onClick={() => onOpenTool('risk')}
            className="glass-control inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold"
          >
            <Calculator className="w-4 h-4 text-[#FFD36A]" />
            <span>Position Size</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenTool('accounts')}
            className="glass-control inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold"
          >
            <Wallet className="w-4 h-4 text-[#FFD36A]" />
            <span>Accounts &amp; Ledger</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('trades')}
            className="glass-control inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold"
          >
            <ShieldCheck className="w-4 h-4 text-[#FFD36A]" />
            <span>Journal ({analytics.totalTrades})</span>
          </button>
        </div>
      </section>
    </div>
  );
}
