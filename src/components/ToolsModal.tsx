import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Download,
  Layers,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { calculatePositionSize } from '../core/risk';
import { exportBackupJson, parseBackupJson } from '../core/storage';
import {
  InstrumentSpec,
  OrbSessionConfig,
  StrategyConfig,
  TosAppState,
  Trade,
  TradeDirection,
  TradingAccount,
} from '../core/types';
import { formatCurrency } from './Formatters';

interface ToolsModalProps {
  initialTab: 'risk' | 'strategy' | 'accounts';
  state: TosAppState;
  activeAccount: TradingAccount;
  onClose: () => void;
  onUpdateInstrument: (spec: InstrumentSpec) => void;
  onUpdateStrategy: (strategy: StrategyConfig) => void;
  onSwitchAccount: (accountId: string) => void;
  onUpdateAccount: (account: TradingAccount) => void;
  onCreateAccount: (account: TradingAccount) => void;
  onRestoreBackup: (nextState: TosAppState) => void;
  onResetSampleData: () => void;
  onClearAllTrades: () => void;
  onSendRiskToNewTrade: (draft: Partial<Trade>) => void;
}

export function ToolsModal({
  initialTab,
  state,
  activeAccount,
  onClose,
  onUpdateInstrument,
  onUpdateStrategy,
  onSwitchAccount,
  onUpdateAccount,
  onCreateAccount,
  onRestoreBackup,
  onResetSampleData,
  onClearAllTrades,
  onSendRiskToNewTrade,
}: ToolsModalProps) {
  const [tab, setTab] = useState<'risk' | 'strategy' | 'accounts'>(initialTab);

  // Risk Calculator state
  const [riskSymbol, setRiskSymbol] = useState(state.selectedInstrument || 'XAUUSD');
  const [balanceOverride, setBalanceOverride] = useState(
    String(activeAccount.startingBalance)
  );
  const [riskPct, setRiskPct] = useState(String(activeAccount.defaultRiskPct));
  const [direction, setDirection] = useState<TradeDirection>('Long');
  const [entryPrice, setEntryPrice] = useState('2650.00');
  const [stopLoss, setStopLoss] = useState('2645.00');
  const [takeProfit, setTakeProfit] = useState('2665.00');
  const [editingSpec, setEditingSpec] = useState(false);

  const selectedSpec =
    state.instruments.find((i) => i.symbol === riskSymbol) || state.instruments[0];

  const handleSelectRiskInstrument = (sym: string) => {
    setRiskSymbol(sym);
    if (sym === 'XAUUSD') {
      setEntryPrice('2650.00');
      setStopLoss('2645.00');
      setTakeProfit('2665.00');
    } else if (sym === 'NAS100') {
      setEntryPrice('20450.0');
      setStopLoss('20410.0');
      setTakeProfit('20570.0');
    } else if (sym === 'EURUSD' || sym === 'GBPUSD') {
      setEntryPrice('1.08500');
      setStopLoss('1.08300');
      setTakeProfit('1.09100');
    }
  };

  const riskResult = useMemo(() => {
    return calculatePositionSize({
      accountBalance: Number(balanceOverride),
      riskPct: Number(riskPct),
      entryPrice: Number(entryPrice),
      stopLoss: Number(stopLoss),
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      direction,
      instrument: selectedSpec,
    });
  }, [balanceOverride, riskPct, entryPrice, stopLoss, takeProfit, direction, selectedSpec]);

  // Strategy / 15m ORB Configurator state
  const activeStrategy =
    state.strategies.find((s) => s.id === state.activeStrategyId) || state.strategies[0];

  const updateOrbSession = (orbId: string, patch: Partial<OrbSessionConfig>) => {
    const nextSessions = activeStrategy.orbSessions.map((s) =>
      s.id === orbId ? { ...s, ...patch } : s
    );
    onUpdateStrategy({ ...activeStrategy, orbSessions: nextSessions });
  };

  const updateConfluence = (confId: string, enabled: boolean, weight?: number) => {
    const nextConfs = activeStrategy.confluences.map((c) =>
      c.id === confId ? { ...c, enabled, weight: weight ?? c.weight } : c
    );
    onUpdateStrategy({ ...activeStrategy, confluences: nextConfs });
  };

  // Account & Backup state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState<{
    tone: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState<'none' | 'clearTrades' | 'resetSample'>('none');
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('50000');

  const handleDownloadBackup = () => {
    const json = exportBackupJson(state);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axiom-tos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage({ tone: 'ok', text: 'Local backup JSON downloaded.' });
  };

  const handleRestoreFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseBackupJson(String(reader.result || ''));
      if (parsed.ok) {
        onRestoreBackup(parsed.state);
        setBackupMessage({ tone: 'ok', text: 'Workspace restored from backup JSON.' });
      } else {
        setBackupMessage({ tone: 'err', text: parsed.error });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Axiom TOS Tools and Configuration"
    >
      <div className="glass-panel w-full max-w-4xl rounded-xl p-6 space-y-6 my-auto max-h-[90vh] overflow-y-auto">
        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="inline-flex items-center p-1 rounded-lg bg-[#050505] border border-white/[0.08] gap-1">
            <button
              type="button"
              onClick={() => setTab('risk')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'risk'
                  ? 'bg-[#00BFFF]/20 text-[#00BFFF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Position Size &amp; Risk</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('strategy')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'strategy'
                  ? 'bg-[#8A2BE2]/25 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>15m ORB &amp; Confluences</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('accounts')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === 'accounts'
                  ? 'bg-white/[0.12] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Accounts &amp; Backup</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tools modal"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: POSITION SIZE & RISK CALCULATOR */}
        {tab === 'risk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-white">
                  Precision Position Size Calculator
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingSpec((v) => !v)}
                  className="text-xs text-[#00BFFF] hover:underline"
                >
                  {editingSpec ? 'Hide Contract Specs' : `Edit ${selectedSpec.symbol} Specs`}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Instrument</label>
                  <select
                    value={riskSymbol}
                    onChange={(e) => handleSelectRiskInstrument(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  >
                    {state.instruments.map((inst) => (
                      <option key={inst.symbol} value={inst.symbol}>
                        {inst.symbol} ({inst.assetClass})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Account Balance</label>
                  <input
                    type="number"
                    step="any"
                    value={balanceOverride}
                    onChange={(e) => setBalanceOverride(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Risk %</label>
                  <input
                    type="number"
                    step="0.05"
                    value={riskPct}
                    onChange={(e) => setRiskPct(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#050505] border border-white/[0.1]">
                    {(['Long', 'Short'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setDirection(dir)}
                        className={`py-1 text-xs font-medium rounded ${
                          direction === dir
                            ? dir === 'Long'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Take Profit</label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs font-mono text-white"
                  />
                </div>
              </div>

              {editingSpec && (
                <div className="p-4 rounded-xl bg-[#050505]/80 border border-[#00BFFF]/30 space-y-3">
                  <div className="text-xs font-medium text-white">
                    Configurable Contract Specification — {selectedSpec.symbol}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Contract Size
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={selectedSpec.contractSize}
                        onChange={(e) =>
                          onUpdateInstrument({
                            ...selectedSpec,
                            contractSize: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        $/Unit per 1.0 Lot
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={selectedSpec.quoteValuePerUnitPerLot}
                        onChange={(e) =>
                          onUpdateInstrument({
                            ...selectedSpec,
                            quoteValuePerUnitPerLot: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Pip Size</label>
                      <input
                        type="number"
                        step="any"
                        value={selectedSpec.pipSize}
                        onChange={(e) =>
                          onUpdateInstrument({
                            ...selectedSpec,
                            pipSize: Number(e.target.value) || 0.01,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Lot Step</label>
                      <input
                        type="number"
                        step="0.01"
                        value={selectedSpec.lotStep}
                        onChange={(e) =>
                          onUpdateInstrument({
                            ...selectedSpec,
                            lotStep: Number(e.target.value) || 0.01,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!riskResult.valid && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {riskResult.errors.join(' ')}
                </div>
              )}
            </div>

            {/* Live Risk Output Card */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#050505]/90 border border-white/[0.08] flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs text-slate-400">Recommended Position Size</div>
                <div className="mt-1 font-mono text-4xl font-semibold text-[#00BFFF] tabular-nums">
                  {riskResult.valid ? `${riskResult.lotSize.toFixed(2)} lots` : '—'}
                </div>
                <div className="mt-1 text-xs font-mono text-slate-500 tabular-nums">
                  {selectedSpec.symbol} · {selectedSpec.contractSize} units/lot
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.08] space-y-2.5 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Risk Amount ({riskPct}%)</span>
                    <span className="text-rose-400">
                      -{formatCurrency(riskResult.potentialLoss, activeAccount.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Potential Reward</span>
                    <span className="text-emerald-400">
                      +{formatCurrency(riskResult.potentialReward, activeAccount.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Risk : Reward Ratio</span>
                    <span className="text-white font-semibold">
                      1 : {riskResult.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Stop Distance</span>
                    <span className="text-slate-200">
                      {riskResult.stopDistancePrice} ({riskResult.stopDistancePips} pips)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Value / Pip</span>
                    <span className="text-slate-200">
                      {formatCurrency(riskResult.dollarPerPipAtLotSize, activeAccount.currency)}/pip
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!riskResult.valid}
                onClick={() =>
                  onSendRiskToNewTrade({
                    instrument: selectedSpec.symbol,
                    direction,
                    entryPrice: Number(entryPrice),
                    stopLoss: Number(stopLoss),
                    takeProfit: Number(takeProfit) || undefined,
                    riskPct: Number(riskPct),
                    lotSize: riskResult.lotSize,
                  })
                }
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] rounded-lg disabled:opacity-40 hover:opacity-95"
              >
                <span>Send Parameters to Trade Journal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: 15-MINUTE ORB STRATEGY & ICT CONFLUENCE CONFIGURATOR */}
        {tab === 'strategy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-2">
                <h2 className="font-display text-lg font-semibold text-white">
                  {activeStrategy.name}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {activeStrategy.description}
                </p>
                <div className="pt-2 flex items-center gap-3 text-xs">
                  <label className="text-slate-400">Min Confluences Required:</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={activeStrategy.minConfluencesRequired}
                    onChange={(e) =>
                      onUpdateStrategy({
                        ...activeStrategy,
                        minConfluencesRequired: Math.max(1, Math.min(5, Number(e.target.value))),
                      })
                    }
                    className="w-16 px-2.5 py-1 rounded bg-[#050505] border border-white/[0.12] font-mono text-[#00BFFF]"
                  />
                </div>
              </div>

              {/* Interactive SVG ORB Schematic */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-[#050505] border border-white/[0.08]">
                <svg viewBox="0 0 420 155" className="w-full h-auto" role="img" aria-label="15-minute Opening Range Breakout schematic">
                  {/* 15m ORB Box */}
                  <rect x="30" y="55" width="95" height="52" fill="rgba(0,191,255,0.08)" stroke="#00BFFF" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="32" y="47" fill="#00BFFF" fontSize="9" fontFamily="JetBrains Mono, monospace">15m ORB High</text>
                  <text x="32" y="143" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono, monospace">15m ORB Low (SL)</text>

                  {/* FVG Retest Zone */}
                  <rect x="170" y="45" width="85" height="18" fill="rgba(138,43,226,0.22)" stroke="#8A2BE2" strokeWidth="1" />
                  <text x="260" y="57" fill="#c084fc" fontSize="9" fontFamily="JetBrains Mono, monospace">FVG / CISD Entry</text>

                  {/* Price Path: Liquidity sweep low -> breakout -> retest -> target */}
                  <polyline
                    points="35,82 58,64 78,118 105,74 148,38 188,54 220,54 315,16"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="78" cy="118" r="3" fill="#F43F5E" />
                  <text x="86" y="122" fill="#F43F5E" fontSize="8.5" fontFamily="JetBrains Mono, monospace">Sweep</text>

                  <circle cx="205" cy="54" r="3.5" fill="#00BFFF" />
                  <circle cx="315" cy="16" r="3.5" fill="#10B981" />
                  <text x="322" y="20" fill="#10B981" fontSize="9" fontFamily="JetBrains Mono, monospace">Liquidity TP</text>
                </svg>
              </div>
            </div>

            {/* Session ORB Configurations */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-300">
                Session 15-Minute Opening Range Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeStrategy.orbSessions.map((orb) => (
                  <div
                    key={orb.id}
                    className={`p-4 rounded-xl border space-y-3 ${
                      orb.enabled
                        ? 'bg-white/[0.03] border-white/[0.12]'
                        : 'bg-[#050505]/50 border-white/[0.05] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-white">
                        {orb.sessionName}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOrbSession(orb.id, { enabled: !orb.enabled })}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded ${
                          orb.enabled
                            ? 'bg-[#00BFFF]/20 text-[#00BFFF]'
                            : 'bg-white/[0.05] text-slate-400'
                        }`}
                      >
                        {orb.enabled ? 'Active' : 'Off'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500">UTC Hr</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={orb.startHourUtc}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              startHourUtc: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-[#050505] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">UTC Min</label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={orb.startMinuteUtc}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              startMinuteUtc: Number(e.target.value) || 0,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-[#050505] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">Range (m)</label>
                        <input
                          type="number"
                          min={5}
                          max={60}
                          value={orb.rangeDurationMinutes}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              rangeDurationMinutes: Number(e.target.value) || 15,
                            })
                          }
                          className="w-full px-2 py-1 rounded bg-[#050505] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Breakout Condition
                        </label>
                        <select
                          value={orb.breakoutCondition}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              breakoutCondition: e.target.value as OrbSessionConfig['breakoutCondition'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-white/[0.1] text-slate-200"
                        >
                          <option value="1m Candle Close">1m Candle Close</option>
                          <option value="5m Candle Close">5m Candle Close</option>
                          <option value="15m Candle Close">15m Candle Close</option>
                          <option value="Wick Breach + Retest">Wick Breach + Retest</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Entry Confirmation
                        </label>
                        <select
                          value={orb.entryConfirmation}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              entryConfirmation: e.target.value as OrbSessionConfig['entryConfirmation'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-white/[0.1] text-slate-200"
                        >
                          <option value="FVG Retest">FVG Retest</option>
                          <option value="CISD Confirmation">CISD Confirmation</option>
                          <option value="Order Block Mitigation">Order Block Mitigation</option>
                          <option value="Immediate Momentum">Immediate Momentum</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">
                          Stop Loss &amp; Target
                        </label>
                        <select
                          value={orb.takeProfitModel}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              takeProfitModel: e.target.value as OrbSessionConfig['takeProfitModel'],
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-[#050505] border border-white/[0.1] text-slate-200"
                        >
                          <option value="Fixed 2R">TP: Fixed 2R</option>
                          <option value="Fixed 3R">TP: Fixed 3R</option>
                          <option value="Previous Session High/Low">TP: Prev Session H/L</option>
                          <option value="External Liquidity Pool">TP: External Liquidity</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Institutional Confluences */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-slate-300">
                Configurable Structural Confluences
              </h3>
              <div className="divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-[#050505]/60">
                {activeStrategy.confluences.map((conf) => (
                  <div
                    key={conf.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[#00BFFF] font-semibold">
                          {conf.shortCode}
                        </span>
                        <span className="font-medium text-white">{conf.name}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{conf.ruleDescription}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>Weight</span>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={conf.weight}
                          onChange={(e) =>
                            updateConfluence(
                              conf.id,
                              conf.enabled,
                              Math.max(1, Math.min(5, Number(e.target.value)))
                            )
                          }
                          className="w-12 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateConfluence(conf.id, !conf.enabled)}
                        className={`px-3 py-1 text-xs font-medium rounded-md ${
                          conf.enabled
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                        }`}
                      >
                        {conf.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNTS, FUNDED RULES & LOCAL BACKUP */}
        {tab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">
                  Account &amp; Funded Challenge Rules
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure balance, risk limits, and prop-firm evaluation parameters.
                </p>
              </div>

              {/* Account Selector */}
              <div className="flex flex-wrap gap-2">
                {state.accounts.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => onSwitchAccount(acc.id)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      acc.id === activeAccount.id
                        ? 'bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/40'
                        : 'bg-[#050505] text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {acc.name} · {formatCurrency(acc.startingBalance, acc.currency)}
                  </button>
                ))}
              </div>

              {/* Active Account Editor */}
              <div className="p-4 rounded-xl bg-[#050505]/70 border border-white/[0.08] space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Account Name</label>
                    <input
                      type="text"
                      value={activeAccount.name}
                      onChange={(e) =>
                        onUpdateAccount({ ...activeAccount, name: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.1] text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Starting Balance</label>
                    <input
                      type="number"
                      value={activeAccount.startingBalance}
                      onChange={(e) =>
                        onUpdateAccount({
                          ...activeAccount,
                          startingBalance: Number(e.target.value) || 1000,
                        })
                      }
                      className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Max Daily Trades</label>
                    <input
                      type="number"
                      min={1}
                      value={activeAccount.maxDailyTrades}
                      onChange={(e) =>
                        onUpdateAccount({
                          ...activeAccount,
                          maxDailyTrades: Number(e.target.value) || 1,
                        })
                      }
                      className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/[0.06] space-y-3">
                  <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeAccount.fundedRules.enabled}
                      onChange={(e) =>
                        onUpdateAccount({
                          ...activeAccount,
                          fundedRules: {
                            ...activeAccount.fundedRules,
                            enabled: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Enable Funded Evaluation / Prop Challenge Rules</span>
                  </label>

                  {activeAccount.fundedRules.enabled && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Target (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={activeAccount.fundedRules.profitTargetPct}
                          onChange={(e) =>
                            onUpdateAccount({
                              ...activeAccount,
                              fundedRules: {
                                ...activeAccount.fundedRules,
                                profitTargetPct: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Daily Loss (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={activeAccount.fundedRules.maxDailyLossPct}
                          onChange={(e) =>
                            onUpdateAccount({
                              ...activeAccount,
                              fundedRules: {
                                ...activeAccount.fundedRules,
                                maxDailyLossPct: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Max DD (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={activeAccount.fundedRules.maxTotalDrawdownPct}
                          onChange={(e) =>
                            onUpdateAccount({
                              ...activeAccount,
                              fundedRules: {
                                ...activeAccount.fundedRules,
                                maxTotalDrawdownPct: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Min Prof Days
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={activeAccount.fundedRules.minProfitableDays}
                          onChange={(e) =>
                            onUpdateAccount({
                              ...activeAccount,
                              fundedRules: {
                                ...activeAccount.fundedRules,
                                minProfitableDays: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] font-mono text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Create Account */}
              <div className="flex flex-wrap items-end gap-2 pt-1 text-xs">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-slate-400 mb-1">Add New Account</label>
                  <input
                    type="text"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="e.g., FundedNext 50K"
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-white"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-slate-400 mb-1">Balance</label>
                  <input
                    type="number"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] font-mono text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newAccName.trim()) return;
                    const created: TradingAccount = {
                      id: `acc-${Date.now()}`,
                      name: newAccName.trim(),
                      broker: 'MT5',
                      currency: 'USD',
                      startingBalance: Number(newAccBalance) || 50000,
                      defaultRiskPct: 1.0,
                      maxDailyTrades: 3,
                      fundedRules: {
                        enabled: true,
                        firmName: 'Prop Firm',
                        phaseName: 'Phase 1',
                        profitTargetPct: 8,
                        maxDailyLossPct: 5,
                        maxTotalDrawdownPct: 10,
                        minProfitableDays: 5,
                        profitableDayMinPct: 0.5,
                      },
                    };
                    onCreateAccount(created);
                    setNewAccName('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 font-medium text-white bg-white/[0.08] hover:bg-white/[0.14] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Data Persistence & Backup */}
            <div className="lg:col-span-5 p-5 rounded-xl bg-[#050505]/90 border border-white/[0.08] space-y-4">
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  Local-First Backup &amp; Restore
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  All journal entries, annotated screenshots, checklist records, and ORB rules persist locally. Export a portable JSON snapshot anytime.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] rounded-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Full JSON Backup</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleRestoreFile(f);
                    e.currentTarget.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] rounded-lg"
                >
                  <Upload className="w-4 h-4 text-[#00BFFF]" />
                  <span>Restore From Backup JSON</span>
                </button>
              </div>

              {backupMessage && (
                <div
                  className={`p-2.5 rounded-lg text-xs ${
                    backupMessage.tone === 'ok'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {backupMessage.text}
                </div>
              )}

              <div className="pt-4 border-t border-white/[0.08] space-y-2">
                {confirmReset === 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset('clearTrades')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Trades</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset('resetSample')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Sample Dataset</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs">
                    <div className="text-rose-200">
                      {confirmReset === 'clearTrades'
                        ? 'Remove all recorded trades from this workspace?'
                        : 'Restore default sample dataset?'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmReset === 'clearTrades') onClearAllTrades();
                          else onResetSampleData();
                          setConfirmReset('none');
                        }}
                        className="px-3 py-1 bg-rose-500 text-white font-semibold rounded"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset('none')}
                        className="px-3 py-1 text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
