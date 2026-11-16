import { useMemo, useState } from 'react';
import {
  Edit3,
  FileSpreadsheet,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { parseMt5HistoryCsv } from '../core/mt5Parser';
import { calculatePositionSize } from '../core/risk';
import { compressImageFileToDataUrl } from '../core/storage';
import {
  InstrumentSpec,
  QualityGrade,
  StrategyConfig,
  Trade,
  TradeDirection,
  TradeScreenshot,
  TradeStatus,
  TradingAccount,
  TradingSession,
} from '../core/types';
import { formatCurrency, formatShortDate, formatSignedCurrency, formatTimeUtc } from './Formatters';
import { ScreenshotAnnotator } from './ScreenshotAnnotator';

interface TradesViewProps {
  account: TradingAccount | null;
  accountBalance: number;
  trades: Trade[];
  instruments: InstrumentSpec[];
  strategies: StrategyConfig[];
  selectedTradeForInspect: Trade | null;
  onClearInspectTrade: () => void;
  prefilledTradeDraft: Partial<Trade> | null;
  onClearPrefilledDraft: () => void;
  isNewTradeModalOpen: boolean;
  onOpenNewTradeModal: () => void;
  onCloseNewTradeModal: () => void;
  onCreateTrade: (trade: Trade) => void;
  onUpdateTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onImportTrades: (newTrades: Trade[]) => void;
  onOpenAccountSettings: () => void;
}

const SESSIONS: TradingSession[] = ['New York', 'London', 'London/NY Overlap', 'Asia'];
const EMOTIONS: Trade['emotion'][] = [
  'Calm & Disciplined',
  'Focused',
  'Anxious',
  'FOMO',
  'Revenge',
  'Overconfident',
  'Hesitant',
];
const MARKET_CONDITIONS: Trade['marketCondition'][] = [
  'Trending',
  'Ranging',
  'High Volatility',
  'Consolidation',
  'News Driven',
];
const MISTAKE_OPTIONS = [
  'Early Entry (No Confirmation)',
  'Moved Stop Loss',
  'Revenge Trade',
  'Overtrading',
  'Traded Outside Primary Session',
  'FOMO Chase',
  'Counter-Trend Fade',
  'Oversized Lot',
];
const GRADES: QualityGrade[] = ['A+', 'A', 'B', 'C'];

export function TradesView({
  account,
  accountBalance,
  trades,
  instruments,
  strategies,
  selectedTradeForInspect,
  onClearInspectTrade,
  prefilledTradeDraft,
  onClearPrefilledDraft,
  isNewTradeModalOpen,
  onOpenNewTradeModal,
  onCloseNewTradeModal,
  onCreateTrade,
  onUpdateTrade,
  onDeleteTrade,
  onImportTrades,
  onOpenAccountSettings,
}: TradesViewProps) {
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('All');
  const [directionFilter, setDirectionFilter] = useState<string>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');

  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [inspectedTradeId, setInspectedTradeId] = useState<string | null>(null);
  const [showMt5Modal, setShowMt5Modal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [annotatorSource, setAnnotatorSource] = useState<{
    tradeId: string;
    dataUrl: string;
    phase: 'Before' | 'After';
    existingId?: string;
    caption?: string;
  } | null>(null);

  const currency = account?.currency || 'USD';

  const accountTrades = useMemo(() => {
    if (!account) return [];
    return trades
      .filter((t) => t.accountId === account.id)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  }, [trades, account]);

  const filteredTrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accountTrades.filter((t) => {
      if (sessionFilter !== 'All' && t.session !== sessionFilter) return false;
      if (directionFilter !== 'All' && t.direction !== directionFilter) return false;
      if (gradeFilter !== 'All' && t.setupQuality !== gradeFilter) return false;
      if (q) {
        const hay = `${t.instrument} ${t.setupType} ${t.strategy} ${t.entryReasoning} ${t.emotion}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [accountTrades, search, sessionFilter, directionFilter, gradeFilter]);

  const activeInspectedTrade = useMemo(() => {
    if (selectedTradeForInspect) {
      return trades.find((t) => t.id === selectedTradeForInspect.id) || selectedTradeForInspect;
    }
    if (inspectedTradeId) {
      return trades.find((t) => t.id === inspectedTradeId) || null;
    }
    return null;
  }, [selectedTradeForInspect, inspectedTradeId, trades]);

  const closeInspector = () => {
    setInspectedTradeId(null);
    onClearInspectTrade();
  };

  const handleUploadScreenshotForTrade = async (
    trade: Trade,
    file: File,
    phase: 'Before' | 'After'
  ) => {
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setAnnotatorSource({
        tradeId: trade.id,
        dataUrl,
        phase,
      });
    } catch {
      // Ignore unreadable image
    }
  };

  const handleSaveAnnotatedScreenshot = (res: {
    phase: 'Before' | 'After';
    dataUrl: string;
    caption: string;
    annotations: string[];
  }) => {
    if (!annotatorSource) return;
    const targetTrade = trades.find((t) => t.id === annotatorSource.tradeId);
    if (!targetTrade) return;

    const newShot: TradeScreenshot = {
      id: annotatorSource.existingId || `shot-${Date.now()}`,
      phase: res.phase,
      dataUrl: res.dataUrl,
      caption: res.caption,
      annotations: res.annotations,
      createdAt: new Date().toISOString(),
    };

    const nextShots = annotatorSource.existingId
      ? targetTrade.screenshots.map((s) => (s.id === annotatorSource.existingId ? newShot : s))
      : [...targetTrade.screenshots, newShot];

    onUpdateTrade({ ...targetTrade, screenshots: nextShots });
    setAnnotatorSource(null);
  };

  const handleDeleteScreenshot = (trade: Trade, shotId: string) => {
    onUpdateTrade({
      ...trade,
      screenshots: trade.screenshots.filter((s) => s.id !== shotId),
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Frosted Filter Strip */}
      <section className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#3FA17F] mb-1.5">
              {account
                ? `${account.name} · ${filteredTrades.length} of ${accountTrades.length} executions shown`
                : 'No account connected · Connect an account to journal executions'}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#FAF6EF]">
              Execution Journal
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {account ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowMt5Modal(true)}
                  className="btn-ivory-glass inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#3571A5]" />
                  <span>Import MT5 CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTrade(null);
                    onOpenNewTradeModal();
                  }}
                  className="btn-emerald-glass inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log New Trade</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenAccountSettings}
                className="btn-emerald-glass inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Connect Account First</span>
              </button>
            )}
          </div>
        </div>

        {/* Milky-Ivory Frosted Search & Filters Bar */}
        <div className="liquid-glass-subtle rounded-[22px] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-3.5 h-3.5 text-[#9A8F83] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search instrument, setup, reasoning, emotion..."
              aria-label="Search trades"
              className="tos-input w-full pl-9 pr-3.5 py-2.5 text-xs"
            />
          </div>

          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            aria-label="Filter by session"
            className="tos-input px-3.5 py-2.5 text-xs"
          >
            <option value="All">All Sessions</option>
            {SESSIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
            aria-label="Filter by direction"
            className="tos-input px-3.5 py-2.5 text-xs"
          >
            <option value="All">Long &amp; Short</option>
            <option value="Long">Long Only</option>
            <option value="Short">Short Only</option>
          </select>

          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Filter by setup grade"
            className="tos-input px-3.5 py-2.5 text-xs"
          >
            <option value="All">All Setup Grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Open Ledger Table */}
      <section className="border-b border-[#FAF6EF]/12 pb-4">
        {!account ? (
          <div className="liquid-glass rounded-[28px] py-16 px-6 text-center space-y-3.5">
            <p className="text-sm text-[#FAF6EF] font-medium">
              No trading account connected yet.
            </p>
            <p className="text-xs text-[#B7ADA0] max-w-md mx-auto leading-relaxed">
              Create or connect an account with your starting capital before logging live or backtested executions.
            </p>
            <button
              type="button"
              onClick={onOpenAccountSettings}
              className="btn-emerald-glass inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FAF6EF] rounded-xl"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Create Trading Account</span>
            </button>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="liquid-glass rounded-[28px] py-16 px-6 text-center space-y-3.5">
            <p className="text-sm text-[#EFE7DC]">
              {accountTrades.length === 0
                ? 'Your execution journal is currently empty.'
                : 'No trades match your active filters.'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (accountTrades.length === 0) {
                  setEditingTrade(null);
                  onOpenNewTradeModal();
                } else {
                  setSearch('');
                  setSessionFilter('All');
                  setDirectionFilter('All');
                  setGradeFilter('All');
                }
              }}
              className="btn-emerald-glass px-5 py-2.5 text-xs font-semibold text-[#FAF6EF] rounded-xl"
            >
              {accountTrades.length === 0 ? 'Log First Trade' : 'Clear Filters'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#FAF6EF]/15 text-[#B7ADA0]">
                  <th className="py-3 pr-4 text-left font-medium">Date &amp; Session</th>
                  <th className="py-3 px-3 text-left font-medium">Instrument</th>
                  <th className="py-3 px-3 text-left font-medium">Setup &amp; Confluences</th>
                  <th className="py-3 px-3 text-right font-medium">Entry / Exit</th>
                  <th className="py-3 px-3 text-right font-medium">Lots · Risk</th>
                  <th className="py-3 px-3 text-right font-medium">Grade</th>
                  <th className="py-3 px-3 text-right font-medium">Net P&amp;L</th>
                  <th className="py-3 pl-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF6EF]/10">
                {filteredTrades.map((trade) => {
                  const isConfirming = confirmDeleteId === trade.id;
                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-[#FAF6EF]/[0.04] transition-colors group"
                    >
                      <td className="py-3.5 pr-4 whitespace-nowrap">
                        <div className="font-mono text-[#FAF6EF] tabular-nums">
                          {formatShortDate(trade.entryTime)} · {formatTimeUtc(trade.entryTime)}
                        </div>
                        <div className="text-[11px] text-[#9A8F83]">{trade.session}</div>
                      </td>

                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[#FAF6EF]">
                            {trade.instrument}
                          </span>
                          <span
                            className={`text-[11px] font-medium ${
                              trade.direction === 'Long' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {trade.direction}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#9A8F83]">{trade.status}</div>
                      </td>

                      <td className="py-3 px-3 max-w-[260px]">
                        <button
                          type="button"
                          onClick={() => setInspectedTradeId(trade.id)}
                          className="text-left hover:text-[#3FA17F] transition-colors"
                        >
                          <div className="font-medium text-[#F5EFE6] truncate">
                            {trade.setupType}
                          </div>
                          <div className="text-[11px] text-[#9A8F83] truncate">
                            {trade.emotion}
                            {trade.screenshots.length > 0
                              ? ` · ${trade.screenshots.length} chart${
                                  trade.screenshots.length > 1 ? 's' : ''
                                }`
                              : ''}
                          </div>
                        </button>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap text-[#D5CBC0]">
                        <div>{trade.entryPrice}</div>
                        <div className="text-[11px] text-[#9A8F83]">
                          SL {trade.stopLoss} · TP {trade.takeProfit}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="text-[#FAF6EF]">{trade.lotSize.toFixed(2)}</div>
                        <div className="text-[11px] text-[#9A8F83]">
                          {trade.riskPct}% · {trade.plannedRR}R
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        <div className="text-[#FAF6EF] font-semibold">{trade.setupQuality}</div>
                        <div className="text-[11px] text-[#9A8F83]">Exec {trade.executionQuality}</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            trade.actualPnL > 0
                              ? 'text-emerald-400'
                              : trade.actualPnL < 0
                              ? 'text-rose-400'
                              : 'text-[#D5CBC0]'
                          }`}
                        >
                          {formatSignedCurrency(trade.actualPnL, currency)}
                        </div>
                        <div className="text-[11px] text-[#9A8F83]">
                          {trade.riskAmount > 0
                            ? `${(trade.actualPnL / trade.riskAmount).toFixed(2)}R`
                            : '—'}
                        </div>
                      </td>

                      <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setInspectedTradeId(trade.id)}
                            className="px-2.5 py-1 text-[11px] text-[#3FA17F] hover:bg-[#0E4A38]/40 rounded-lg transition-colors"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTrade(trade);
                              onOpenNewTradeModal();
                            }}
                            aria-label={`Edit trade ${trade.instrument} ${trade.setupType}`}
                            className="p-1.5 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-lg"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isConfirming ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteTrade(trade.id);
                                  setConfirmDeleteId(null);
                                  if (activeInspectedTrade?.id === trade.id) {
                                    closeInspector();
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] bg-rose-500/20 text-rose-300 rounded-lg"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-1 text-[11px] text-[#B7ADA0]"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(trade.id)}
                              aria-label={`Delete trade ${trade.instrument}`}
                              className="p-1.5 text-[#B7ADA0] hover:text-rose-400 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Trade Inspector Slide-Over Drawer */}
      {activeInspectedTrade && account && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/75 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Trade Execution Inspector"
        >
          <div className="liquid-glass-elevated h-full w-full max-w-2xl rounded-l-[28px] overflow-y-auto p-6 sm:p-7 space-y-6 border-l border-[#FAF6EF]/20">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#FAF6EF]/15">
              <div>
                <div className="flex items-center gap-2.5 text-xs text-[#B7ADA0] font-mono">
                  <span>{formatShortDate(activeInspectedTrade.entryTime)}</span>
                  <span>·</span>
                  <span>{activeInspectedTrade.session}</span>
                  <span>·</span>
                  <span
                    className={
                      activeInspectedTrade.direction === 'Long'
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }
                  >
                    {activeInspectedTrade.direction}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-xl font-semibold text-[#FAF6EF]">
                  {activeInspectedTrade.instrument} — {activeInspectedTrade.setupType}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTrade(activeInspectedTrade);
                    onOpenNewTradeModal();
                  }}
                  className="btn-ivory-glass px-3.5 py-1.5 text-xs font-medium text-[#FAF6EF] rounded-xl"
                >
                  Edit Trade
                </button>
                <button
                  type="button"
                  onClick={closeInspector}
                  aria-label="Close trade inspector"
                  className="p-2 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Key Execution Numbers */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl liquid-glass-inset font-mono tabular-nums">
              <div>
                <div className="text-[11px] text-[#9A8F83] font-sans">Net P&amp;L</div>
                <div
                  className={`mt-1 text-base font-semibold ${
                    activeInspectedTrade.actualPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatSignedCurrency(activeInspectedTrade.actualPnL, currency)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#9A8F83] font-sans">Position &amp; Risk</div>
                <div className="mt-1 text-base font-semibold text-[#FAF6EF]">
                  {activeInspectedTrade.lotSize.toFixed(2)} lots
                </div>
                <div className="text-[11px] text-[#B7ADA0]">
                  {activeInspectedTrade.riskPct}% ({formatCurrency(activeInspectedTrade.riskAmount, currency)})
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#9A8F83] font-sans">Levels</div>
                <div className="mt-1 text-xs text-[#F5EFE6]">
                  Entry {activeInspectedTrade.entryPrice}
                </div>
                <div className="text-[11px] text-[#B7ADA0]">
                  SL {activeInspectedTrade.stopLoss} · TP {activeInspectedTrade.takeProfit}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[#9A8F83] font-sans">Quality Grades</div>
                <div className="mt-1 text-sm text-[#3FA17F] font-semibold">
                  Setup {activeInspectedTrade.setupQuality} · Exec{' '}
                  {activeInspectedTrade.executionQuality}
                </div>
                <div className="text-[11px] text-[#B7ADA0]">
                  {activeInspectedTrade.followedPlan ? 'Followed Plan' : 'Plan Broken'}
                </div>
              </div>
            </div>

            {/* Journal Notes & Psychology */}
            <div className="space-y-4 text-xs">
              <div>
                <div className="text-[#B7ADA0] mb-1.5">Entry Reasoning &amp; Market Context</div>
                <p className="p-3.5 rounded-2xl liquid-glass-inset text-[#F5EFE6] leading-relaxed">
                  {activeInspectedTrade.entryReasoning || 'No entry reasoning logged.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[#B7ADA0] mb-1.5">Emotional State &amp; Mistakes</div>
                  <div className="p-3.5 rounded-2xl liquid-glass-inset text-[#F5EFE6] space-y-1">
                    <div>
                      Emotion: <span className="text-[#3FA17F]">{activeInspectedTrade.emotion}</span>
                    </div>
                    <div>
                      Mistakes:{' '}
                      <span className="text-rose-300">
                        {activeInspectedTrade.mistakes.length > 0
                          ? activeInspectedTrade.mistakes.join(', ')
                          : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[#B7ADA0] mb-1.5">Lessons Learned</div>
                  <div className="p-3.5 rounded-2xl liquid-glass-inset text-[#F5EFE6] leading-relaxed">
                    {activeInspectedTrade.lessonsLearned || 'No post-trade reflection yet.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Before & After Chart Screenshot Annotation Section */}
            <div className="pt-4 border-t border-[#FAF6EF]/15 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#FAF6EF]">
                    Before &amp; After Chart Screenshots
                  </h3>
                  <p className="text-xs text-[#B7ADA0]">
                    Upload a chart image to mark entry/exit lines, FVG/OB zones, and structure notes.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="btn-ivory-glass inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl cursor-pointer">
                    <ImagePlus className="w-3.5 h-3.5 text-[#3FA17F]" />
                    <span>Upload Before</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadScreenshotForTrade(activeInspectedTrade, f, 'Before');
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>

                  <label className="btn-ivory-glass inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#3571A5]" />
                    <span>Upload After</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadScreenshotForTrade(activeInspectedTrade, f, 'After');
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {activeInspectedTrade.screenshots.length === 0 ? (
                <div className="py-8 px-4 rounded-2xl liquid-glass-inset border border-dashed border-[#FAF6EF]/15 text-center space-y-2">
                  <p className="text-xs text-[#B7ADA0]">
                    No screenshots attached to this execution yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const c = document.createElement('canvas');
                      c.width = 960;
                      c.height = 540;
                      const ctx = c.getContext('2d');
                      if (ctx) {
                        ctx.fillStyle = '#15110E';
                        ctx.fillRect(0, 0, c.width, c.height);
                        ctx.strokeStyle = 'rgba(255,248,236,0.06)';
                        ctx.lineWidth = 1;
                        for (let x = 0; x < c.width; x += 48) {
                          ctx.beginPath();
                          ctx.moveTo(x, 0);
                          ctx.lineTo(x, c.height);
                          ctx.stroke();
                        }
                        for (let y = 0; y < c.height; y += 48) {
                          ctx.beginPath();
                          ctx.moveTo(0, y);
                          ctx.lineTo(c.width, y);
                          ctx.stroke();
                        }
                      }
                      setAnnotatorSource({
                        tradeId: activeInspectedTrade.id,
                        dataUrl: c.toDataURL('image/png'),
                        phase: 'Before',
                        caption: `${activeInspectedTrade.instrument} Structure Sketch`,
                      });
                    }}
                    className="text-xs font-medium text-[#3FA17F] hover:underline"
                  >
                    Or open blank chart sketchpad to annotate levels
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {activeInspectedTrade.screenshots.map((shot) => (
                    <div
                      key={shot.id}
                      className="rounded-2xl overflow-hidden border border-[#FAF6EF]/15 bg-[#0F0B09]"
                    >
                      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#FAF6EF]/12 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[#3FA17F] font-medium">
                            {shot.phase}
                          </span>
                          <span className="text-[#6E645A]">·</span>
                          <span className="text-[#F5EFE6] truncate">{shot.caption}</span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setAnnotatorSource({
                                tradeId: activeInspectedTrade.id,
                                dataUrl: shot.dataUrl,
                                phase: shot.phase,
                                existingId: shot.id,
                                caption: shot.caption,
                              })
                            }
                            className="inline-flex items-center gap-1 text-[#D5CBC0] hover:text-[#3FA17F]"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Annotate</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScreenshot(activeInspectedTrade, shot.id)}
                            aria-label={`Delete screenshot ${shot.caption}`}
                            className="text-[#9A8F83] hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <img
                        src={shot.dataUrl}
                        alt={shot.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-80 object-contain bg-[#0F0B09]"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Annotator Studio */}
      {annotatorSource && (
        <ScreenshotAnnotator
          imageDataUrl={annotatorSource.dataUrl}
          initialPhase={annotatorSource.phase}
          initialCaption={annotatorSource.caption}
          onSave={handleSaveAnnotatedScreenshot}
          onCancel={() => setAnnotatorSource(null)}
        />
      )}

      {/* Log / Edit Trade Modal */}
      {isNewTradeModalOpen && account && (
        <TradeFormModal
          account={account}
          accountBalance={accountBalance}
          instruments={instruments}
          strategies={strategies}
          initialTrade={editingTrade}
          prefill={prefilledTradeDraft}
          onClose={() => {
            setEditingTrade(null);
            onClearPrefilledDraft();
            onCloseNewTradeModal();
          }}
          onSave={(saved) => {
            if (editingTrade) {
              onUpdateTrade(saved);
            } else {
              onCreateTrade(saved);
            }
            setEditingTrade(null);
            onClearPrefilledDraft();
            onCloseNewTradeModal();
          }}
        />
      )}

      {/* MT5 Import Modal */}
      {showMt5Modal && account && (
        <Mt5ImportModal
          account={account}
          accountBalance={accountBalance}
          existingTrades={trades}
          onClose={() => setShowMt5Modal(false)}
          onImport={(imported) => {
            onImportTrades(imported);
            setShowMt5Modal(false);
          }}
        />
      )}
    </div>
  );
}

interface TradeFormModalProps {
  account: TradingAccount;
  accountBalance: number;
  instruments: InstrumentSpec[];
  strategies: StrategyConfig[];
  initialTrade: Trade | null;
  prefill: Partial<Trade> | null;
  onClose: () => void;
  onSave: (trade: Trade) => void;
}

function TradeFormModal({
  account,
  accountBalance,
  instruments,
  strategies,
  initialTrade,
  prefill,
  onClose,
  onSave,
}: TradeFormModalProps) {
  const defaultStrat = strategies[0];
  const nowIso = new Date().toISOString().slice(0, 16);
  const effectiveBasis = accountBalance > 0 ? accountBalance : account.startingBalance;

  const [instrument, setInstrument] = useState(
    initialTrade?.instrument || prefill?.instrument || instruments[0]?.symbol || 'XAUUSD'
  );
  const [direction, setDirection] = useState<TradeDirection>(
    initialTrade?.direction || prefill?.direction || 'Long'
  );
  const [status, setStatus] = useState<TradeStatus>(initialTrade?.status || 'Closed');
  const [entryPrice, setEntryPrice] = useState<string>(
    String(initialTrade?.entryPrice ?? prefill?.entryPrice ?? 2650.0)
  );
  const [stopLoss, setStopLoss] = useState<string>(
    String(initialTrade?.stopLoss ?? prefill?.stopLoss ?? 2645.0)
  );
  const [takeProfit, setTakeProfit] = useState<string>(
    String(initialTrade?.takeProfit ?? prefill?.takeProfit ?? 2662.5)
  );
  const [exitPrice, setExitPrice] = useState<string>(
    initialTrade?.exitPrice !== undefined ? String(initialTrade.exitPrice) : ''
  );
  const [riskPct, setRiskPct] = useState<string>(
    String(initialTrade?.riskPct ?? prefill?.riskPct ?? account.defaultRiskPct)
  );
  const [lotSize, setLotSize] = useState<string>(
    String(initialTrade?.lotSize ?? prefill?.lotSize ?? 1.0)
  );
  const [actualPnL, setActualPnL] = useState<string>(
    String(initialTrade?.actualPnL ?? 0)
  );
  const [session, setSession] = useState<TradingSession>(
    initialTrade?.session || 'New York'
  );
  const [strategy, setStrategy] = useState<string>(
    initialTrade?.strategy || defaultStrat?.name || '15m Opening Range Breakout + Liquidity'
  );
  const [setupType, setSetupType] = useState<string>(
    initialTrade?.setupType || 'NY 15m ORB High Break + FVG'
  );
  const [confluencesUsed, setConfluencesUsed] = useState<string[]>(
    initialTrade?.confluencesUsed || ['Liquidity Sweep', 'Fair Value Gap (FVG)']
  );
  const [entryTime, setEntryTime] = useState<string>(
    initialTrade?.entryTime ? initialTrade.entryTime.slice(0, 16) : nowIso
  );
  const [exitTime, setExitTime] = useState<string>(
    initialTrade?.exitTime ? initialTrade.exitTime.slice(0, 16) : nowIso
  );
  const [marketCondition, setMarketCondition] = useState<Trade['marketCondition']>(
    initialTrade?.marketCondition || 'Trending'
  );
  const [entryReasoning, setEntryReasoning] = useState<string>(
    initialTrade?.entryReasoning || ''
  );
  const [emotion, setEmotion] = useState<Trade['emotion']>(
    initialTrade?.emotion || 'Calm & Disciplined'
  );
  const [mistakes, setMistakes] = useState<string[]>(initialTrade?.mistakes || []);
  const [lessonsLearned, setLessonsLearned] = useState<string>(
    initialTrade?.lessonsLearned || ''
  );
  const [setupQuality, setSetupQuality] = useState<QualityGrade>(
    initialTrade?.setupQuality || 'A'
  );
  const [executionQuality, setExecutionQuality] = useState<QualityGrade>(
    initialTrade?.executionQuality || 'A'
  );
  const [followedPlan, setFollowedPlan] = useState<boolean>(
    initialTrade?.followedPlan ?? true
  );
  const [isRevengeTrade, setIsRevengeTrade] = useState<boolean>(
    initialTrade?.isRevengeTrade ?? false
  );
  const [formError, setFormError] = useState('');

  const spec = instruments.find((i) => i.symbol === instrument) || instruments[0];

  const liveRisk = useMemo(() => {
    return calculatePositionSize({
      accountBalance: effectiveBasis,
      riskPct: Number(riskPct) || 0,
      entryPrice: Number(entryPrice) || 0,
      stopLoss: Number(stopLoss) || 0,
      takeProfit: Number(takeProfit) || undefined,
      direction,
      instrument: spec,
    });
  }, [effectiveBasis, riskPct, entryPrice, stopLoss, takeProfit, direction, spec]);

  const applySuggestedLot = () => {
    if (liveRisk.valid) {
      setLotSize(String(liveRisk.lotSize));
    }
  };

  const toggleItem = (list: string[], value: string, setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ep = Number(entryPrice);
    const sl = Number(stopLoss);
    const tp = Number(takeProfit);
    const lots = Number(lotSize);
    const rPct = Number(riskPct);
    const pnl = Number(actualPnL);

    if (!Number.isFinite(ep) || ep <= 0 || !Number.isFinite(sl) || sl <= 0) {
      setFormError('Entry Price and Stop Loss must be positive numbers.');
      return;
    }
    if (!Number.isFinite(lots) || lots <= 0) {
      setFormError('Lot size must be greater than zero.');
      return;
    }
    if (!setupType.trim()) {
      setFormError('Please enter a Setup Type.');
      return;
    }

    const riskAmount = Number(((effectiveBasis * rPct) / 100).toFixed(2));
    const slDist = Math.abs(ep - sl);
    const tpDist = tp > 0 ? Math.abs(tp - ep) : 0;
    const plannedRR = slDist > 0 && tpDist > 0 ? Number((tpDist / slDist).toFixed(2)) : 0;

    const trade: Trade = {
      id: initialTrade?.id || `trd-${Date.now()}`,
      accountId: account.id,
      instrument,
      direction,
      status,
      entryPrice: ep,
      stopLoss: sl,
      takeProfit: tp || ep,
      exitPrice: exitPrice ? Number(exitPrice) : undefined,
      lotSize: lots,
      riskPct: rPct,
      riskAmount,
      potentialReward: Number((riskAmount * plannedRR).toFixed(2)),
      plannedRR,
      actualPnL: Number.isFinite(pnl) ? pnl : 0,
      commission: initialTrade?.commission ?? 0,
      swap: initialTrade?.swap ?? 0,
      session,
      strategy,
      setupType: setupType.trim(),
      confluencesUsed,
      entryTime: new Date(entryTime || nowIso).toISOString(),
      exitTime: status === 'Closed' ? new Date(exitTime || entryTime || nowIso).toISOString() : undefined,
      marketCondition,
      entryReasoning: entryReasoning.trim(),
      emotion,
      mistakes,
      lessonsLearned: lessonsLearned.trim(),
      setupQuality,
      executionQuality,
      followedPlan,
      isRevengeTrade,
      screenshots: initialTrade?.screenshots || [],
    };

    onSave(trade);
  };

  const allConfluences = defaultStrat?.confluences.map((c) => c.name) || [
    'Liquidity Sweep',
    'Fair Value Gap (FVG)',
    'Order Block',
    'Change in State of Delivery (CISD)',
    'Inversion FVG (iFVG)',
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={initialTrade ? 'Edit Trade Entry' : 'Log New Trade'}
    >
      <form
        onSubmit={handleSubmit}
        className="liquid-glass-elevated w-full max-w-3xl rounded-[28px] p-6 sm:p-7 space-y-5 my-auto max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-[#FAF6EF]/15">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
              {initialTrade ? 'Edit Trade Record' : 'Log New Execution'}
            </h2>
            <p className="text-xs text-[#B7ADA0]">
              Account: {account.name} (Current Balance {formatCurrency(effectiveBasis, account.currency)})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trade form"
            className="p-2 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Core Execution Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Instrument</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            >
              {instruments.map((inst) => (
                <option key={inst.symbol} value={inst.symbol}>
                  {inst.symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as TradeDirection)}
              className="tos-input w-full px-3 py-2 text-xs"
            >
              <option value="Long">Long</option>
              <option value="Short">Short</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Session</label>
            <select
              value={session}
              onChange={(e) => setSession(e.target.value as TradingSession)}
              className="tos-input w-full px-3 py-2 text-xs"
            >
              {SESSIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TradeStatus)}
              className="tos-input w-full px-3 py-2 text-xs"
            >
              <option value="Closed">Closed</option>
              <option value="Open">Open</option>
            </select>
          </div>
        </div>

        {/* Prices & Position Sizing */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Entry Price</label>
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Stop Loss</label>
            <input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Take Profit</label>
            <input
              type="number"
              step="any"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Exit Price (opt)</label>
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Risk %</label>
            <input
              type="number"
              step="0.05"
              value={riskPct}
              onChange={(e) => setRiskPct(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-[#B7ADA0]">Lot Size</label>
              {liveRisk.valid && (
                <button
                  type="button"
                  onClick={applySuggestedLot}
                  className="text-[11px] font-mono text-[#3FA17F] hover:underline"
                >
                  Use {liveRisk.lotSize.toFixed(2)} ({liveRisk.riskRewardRatio}R)
                </button>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">
              Actual Net P&amp;L ({account.currency})
            </label>
            <input
              type="number"
              step="0.01"
              value={actualPnL}
              onChange={(e) => setActualPnL(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        {/* Timestamps, Strategy & Setup */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Entry Time (UTC)</label>
            <input
              type="datetime-local"
              value={entryTime}
              onChange={(e) => setEntryTime(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Exit Time (UTC)</label>
            <input
              type="datetime-local"
              value={exitTime}
              onChange={(e) => setExitTime(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Market Condition</label>
            <select
              value={marketCondition}
              onChange={(e) =>
                setMarketCondition(e.target.value as Trade['marketCondition'])
              }
              className="tos-input w-full px-3 py-2 text-xs"
            >
              {MARKET_CONDITIONS.map((mc) => (
                <option key={mc} value={mc}>
                  {mc}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Strategy Model</label>
            <input
              type="text"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Setup Type</label>
            <input
              type="text"
              value={setupType}
              onChange={(e) => setSetupType(e.target.value)}
              className="tos-input w-full px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Confluences */}
        <div>
          <div className="text-xs text-[#B7ADA0] mb-1.5">Confluences Present</div>
          <div className="flex flex-wrap gap-1.5">
            {allConfluences.map((conf) => {
              const active = confluencesUsed.includes(conf);
              return (
                <button
                  key={conf}
                  type="button"
                  onClick={() => toggleItem(confluencesUsed, conf, setConfluencesUsed)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                    active
                      ? 'bg-[#0E4A38]/60 text-[#FAF6EF] border-[#258767]/55'
                      : 'bg-[#0A0807]/60 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                  }`}
                >
                  {conf}
                </button>
              );
            })}
          </div>
        </div>

        {/* Psychology, Grading & Mistakes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Emotion State</label>
            <select
              value={emotion}
              onChange={(e) => setEmotion(e.target.value as Trade['emotion'])}
              className="tos-input w-full px-3 py-2 text-xs"
            >
              {EMOTIONS.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Setup Quality</label>
            <select
              value={setupQuality}
              onChange={(e) => setSetupQuality(e.target.value as QualityGrade)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Execution Quality</label>
            <select
              value={executionQuality}
              onChange={(e) => setExecutionQuality(e.target.value as QualityGrade)}
              className="tos-input w-full px-3 py-2 text-xs font-mono"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="text-xs text-[#B7ADA0] mb-1.5">Mistakes Tagged</div>
          <div className="flex flex-wrap gap-1.5">
            {MISTAKE_OPTIONS.map((m) => {
              const active = mistakes.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleItem(mistakes, m, setMistakes)}
                  className={`px-3 py-1.5 text-xs rounded-xl border transition-colors ${
                    active
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                      : 'bg-[#0A0807]/60 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Entry Reasoning</label>
            <textarea
              rows={2}
              value={entryReasoning}
              onChange={(e) => setEntryReasoning(e.target.value)}
              placeholder="Why was this trade taken? Structural narrative..."
              className="tos-input w-full px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1">Lessons Learned</label>
            <textarea
              rows={2}
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              placeholder="Key takeaway for future execution..."
              className="tos-input w-full px-3 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#FAF6EF]/15">
          <div className="flex items-center gap-4 text-xs text-[#F5EFE6]">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={followedPlan}
                onChange={(e) => setFollowedPlan(e.target.checked)}
                className="rounded border-[#FAF6EF]/30 bg-[#0A0807] accent-[#258767]"
              />
              <span>Followed Trading Plan</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRevengeTrade}
                onChange={(e) => setIsRevengeTrade(e.target.checked)}
                className="rounded border-[#FAF6EF]/30 bg-[#0A0807] accent-[#3571A5]"
              />
              <span>Revenge Trade</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {formError && <span className="text-xs text-rose-400">{formError}</span>}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-emerald-glass px-5 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
            >
              {initialTrade ? 'Save Changes' : 'Record Trade'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

interface Mt5ImportModalProps {
  account: TradingAccount;
  accountBalance: number;
  existingTrades: Trade[];
  onClose: () => void;
  onImport: (trades: Trade[]) => void;
}

function Mt5ImportModal({
  account,
  accountBalance,
  existingTrades,
  onClose,
  onImport,
}: Mt5ImportModalProps) {
  const [rawCsv, setRawCsv] = useState('');
  const basis = accountBalance > 0 ? accountBalance : account.startingBalance || 10000;

  const existingTickets = useMemo(() => {
    const s = new Set<string>();
    for (const t of existingTrades) {
      if (t.externalTicketId) s.add(t.externalTicketId);
    }
    return s;
  }, [existingTrades]);

  const parsed = useMemo(() => {
    if (!rawCsv.trim()) return null;
    return parseMt5HistoryCsv(rawCsv, account.id, basis, existingTickets);
  }, [rawCsv, account.id, basis, existingTickets]);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setRawCsv(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const loadSampleMt5 = () => {
    setRawCsv(
      [
        'Position,Symbol,Type,Volume,Open Time,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit',
        '99041,XAUUSD,buy,1.25,2026.11.14 13:48:00,2660.50,2655.50,2673.00,2026.11.14 14:42:00,2673.00,-8.75,0.00,1562.50',
        '99042,NAS100,sell,10.0,2026.11.14 15:10:00,20540.0,20580.0,20460.0,2026.11.14 15:40:00,20460.0,-6.00,0.00,800.00',
      ].join('\n')
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import MetaTrader 5 Trade History"
    >
      <div className="liquid-glass-elevated w-full max-w-2xl rounded-[28px] p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#FAF6EF]/15">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
              Import MetaTrader 5 History
            </h2>
            <p className="text-xs text-[#B7ADA0]">
              Upload or paste MT5 CSV/TSV position history exports into {account.name}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close MT5 import modal"
            className="p-2 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="btn-ivory-glass inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#FAF6EF] rounded-xl cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-[#3FA17F]" />
            <span>Choose MT5 CSV/TSV File</span>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </label>

          <button
            type="button"
            onClick={loadSampleMt5}
            className="text-xs text-[#3FA17F] hover:underline"
          >
            Load sample MT5 CSV
          </button>
        </div>

        <textarea
          rows={6}
          value={rawCsv}
          onChange={(e) => setRawCsv(e.target.value)}
          placeholder="Paste MT5 CSV rows with headers (Position, Symbol, Type, Volume, Open Time, Open Price, S/L, T/P, Close Time, Close Price, Commission, Swap, Profit)..."
          className="tos-input w-full p-3.5 text-xs font-mono"
        />

        {parsed && (
          <div className="p-3.5 rounded-2xl liquid-glass-inset text-xs space-y-1">
            {parsed.errors.length > 0 ? (
              <div className="text-rose-400">{parsed.errors.join(' ')}</div>
            ) : (
              <div className="text-emerald-400 font-mono">
                Ready to import {parsed.trades.length} trade(s) · {parsed.skippedRows} skipped/duplicate
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!parsed || parsed.trades.length === 0}
            onClick={() => parsed && onImport(parsed.trades)}
            className="btn-emerald-glass px-5 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl disabled:opacity-40"
          >
            Import {parsed?.trades.length || 0} Trades
          </button>
        </div>
      </div>
    </div>
  );
}
