import { useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Calculator,
  Database,
  Download,
  Layers,
  Plus,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { calculatePositionSize } from '../core/risk';
import { exportBackupJson, parseBackupJson } from '../core/storage';
import {
  AccountTransaction,
  AccountTransactionType,
  InstrumentSpec,
  OrbSessionConfig,
  StrategyConfig,
  TosAppState,
  Trade,
  TradeDirection,
  TradingAccount,
} from '../core/types';
import { formatCurrency, formatShortDate } from './Formatters';

interface ToolsModalProps {
  initialTab: 'risk' | 'strategy' | 'accounts';
  state: TosAppState;
  activeAccount: TradingAccount | null;
  currentBalance: number;
  onClose: () => void;
  onUpdateInstrument: (spec: InstrumentSpec) => void;
  onUpdateStrategy: (strategy: StrategyConfig) => void;
  onSwitchAccount: (accountId: string) => void;
  onUpdateAccount: (account: TradingAccount) => void;
  onCreateAccount: (account: TradingAccount) => void;
  onAddTransaction: (tx: AccountTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  onRestoreBackup: (nextState: TosAppState) => void;
  onLoadSampleDataset: () => void;
  onClearAllActivity: () => void;
  onSendRiskToNewTrade: (draft: Partial<Trade>) => void;
}

export function ToolsModal({
  initialTab,
  state,
  activeAccount,
  currentBalance,
  onClose,
  onUpdateInstrument,
  onUpdateStrategy,
  onSwitchAccount,
  onUpdateAccount,
  onCreateAccount,
  onAddTransaction,
  onDeleteTransaction,
  onRestoreBackup,
  onLoadSampleDataset,
  onClearAllActivity,
  onSendRiskToNewTrade,
}: ToolsModalProps) {
  const [tab, setTab] = useState<'risk' | 'strategy' | 'accounts'>(initialTab);
  const currency = activeAccount?.currency || 'USD';

  // Risk Calculator state
  const [riskSymbol, setRiskSymbol] = useState(state.selectedInstrument || 'XAUUSD');
  const [balanceOverride, setBalanceOverride] = useState(
    String(activeAccount ? currentBalance : 0)
  );
  const [riskPct, setRiskPct] = useState(String(activeAccount?.defaultRiskPct ?? 1.0));
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

  // Account, Cash Transactions & Backup state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [backupMessage, setBackupMessage] = useState<{
    tone: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmReset, setConfirmReset] = useState<'none' | 'clearAll' | 'loadSample'>('none');

  const [newAccName, setNewAccName] = useState('');
  const [newAccBroker, setNewAccBroker] = useState('');
  const [newAccCurrency, setNewAccCurrency] = useState<'USD' | 'EUR' | 'GBP'>('USD');
  const [newAccBalance, setNewAccBalance] = useState('10000');
  const [newAccFunded, setNewAccFunded] = useState(false);

  // Cash flow form state
  const [txType, setTxType] = useState<AccountTransactionType>('Deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');

  const accountTransactions = useMemo(() => {
    if (!activeAccount) return [];
    return state.transactions
      .filter((tx) => tx.accountId === activeAccount.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.transactions, activeAccount]);

  const handleCreateNewAccount = () => {
    const name = newAccName.trim();
    if (!name) return;
    const balanceVal = Number(newAccBalance);
    const created: TradingAccount = {
      id: `acc-${Date.now()}`,
      name,
      broker: newAccBroker.trim() || 'Live Broker',
      currency: newAccCurrency,
      startingBalance: Number.isFinite(balanceVal) && balanceVal >= 0 ? balanceVal : 0,
      defaultRiskPct: 1.0,
      maxDailyTrades: 3,
      fundedRules: {
        enabled: newAccFunded,
        firmName: newAccFunded ? 'Prop Firm' : 'Self-Funded',
        phaseName: newAccFunded ? 'Evaluation' : 'Live Capital',
        profitTargetPct: 8,
        maxDailyLossPct: 5,
        maxTotalDrawdownPct: 10,
        minProfitableDays: 4,
        profitableDayMinPct: 0.5,
      },
    };
    onCreateAccount(created);
    setNewAccName('');
    setNewAccBroker('');
    setBalanceOverride(String(created.startingBalance));
  };

  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    const amount = Number(txAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    onAddTransaction({
      id: `tx-${Date.now()}`,
      accountId: activeAccount.id,
      type: txType,
      amount: Number(amount.toFixed(2)),
      timestamp: new Date().toISOString(),
      note: txNote.trim() || `${txType} recorded`,
    });
    setTxAmount('');
    setTxNote('');
  };

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
      <div className="liquid-glass-elevated w-full max-w-5xl rounded-[28px] p-5 sm:p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#FAF6EF]/15">
          <div className="inline-flex flex-wrap items-center p-1 rounded-2xl liquid-glass-inset gap-1">
            <button
              type="button"
              onClick={() => setTab('risk')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                tab === 'risk'
                  ? 'bg-[#0E4A38]/75 text-[#FAF6EF] border border-[#258767]/55'
                  : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Position Size &amp; Risk</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('strategy')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                tab === 'strategy'
                  ? 'bg-[#0E4A38]/75 text-[#FAF6EF] border border-[#258767]/55'
                  : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#3571A5]" />
              <span>15m ORB &amp; Confluences</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('accounts')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${
                tab === 'accounts'
                  ? 'bg-[#0E4A38]/75 text-[#FAF6EF] border border-[#258767]/55'
                  : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Accounts, Ledger &amp; Backup</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close tools modal"
            className="p-2 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB 1: POSITION SIZE & RISK CALCULATOR */}
        {tab === 'risk' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
                  Precision Position Size Calculator
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingSpec((v) => !v)}
                  className="text-xs text-[#3FA17F] hover:underline"
                >
                  {editingSpec ? 'Hide Contract Specs' : `Edit ${selectedSpec.symbol} Specs`}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#B7ADA0] mb-1">Instrument</label>
                  <select
                    value={riskSymbol}
                    onChange={(e) => handleSelectRiskInstrument(e.target.value)}
                    className="tos-input w-full px-3 py-2 text-xs font-mono"
                  >
                    {state.instruments.map((inst) => (
                      <option key={inst.symbol} value={inst.symbol}>
                        {inst.symbol} ({inst.assetClass})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B7ADA0] mb-1">Account Balance</label>
                  <input
                    type="number"
                    step="any"
                    value={balanceOverride}
                    onChange={(e) => setBalanceOverride(e.target.value)}
                    className="tos-input w-full px-3 py-2 text-xs font-mono"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-[#B7ADA0] mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl liquid-glass-inset">
                    {(['Long', 'Short'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setDirection(dir)}
                        className={`py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          direction === dir
                            ? dir === 'Long'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                            : 'text-[#B7ADA0] hover:text-[#FAF6EF]'
                        }`}
                      >
                        {dir}
                      </button>
                    ))}
                  </div>
                </div>

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
              </div>

              {editingSpec && (
                <div className="p-4 rounded-2xl liquid-glass-inset space-y-3">
                  <div className="text-xs font-medium text-[#FAF6EF]">
                    Configurable Contract Specification — {selectedSpec.symbol}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                        className="tos-input w-full px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                        className="tos-input w-full px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#B7ADA0] mb-1">Pip Size</label>
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
                        className="tos-input w-full px-2.5 py-1.5 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#B7ADA0] mb-1">Lot Step</label>
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
                        className="tos-input w-full px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!riskResult.valid && (
                <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200">
                  {riskResult.errors.join(' ')}
                </div>
              )}
            </div>

            {/* Live Risk Output Panel */}
            <div className="lg:col-span-5 p-6 rounded-[24px] liquid-glass flex flex-col justify-between space-y-4">
              <div>
                <div className="text-xs text-[#B7ADA0]">Recommended Position Size</div>
                <div className="mt-1 font-mono text-4xl font-semibold text-[#3FA17F] tabular-nums">
                  {riskResult.valid ? `${riskResult.lotSize.toFixed(2)} lots` : '—'}
                </div>
                <div className="mt-1 text-xs font-mono text-[#9A8F83] tabular-nums">
                  {selectedSpec.symbol} · {selectedSpec.contractSize} units/lot
                </div>

                <div className="mt-5 pt-4 border-t border-[#FAF6EF]/15 space-y-2.5 text-xs font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#B7ADA0] font-sans">Risk Amount ({riskPct}%)</span>
                    <span className="text-rose-400">
                      -{formatCurrency(riskResult.potentialLoss, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B7ADA0] font-sans">Potential Reward</span>
                    <span className="text-emerald-400">
                      +{formatCurrency(riskResult.potentialReward, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B7ADA0] font-sans">Risk : Reward Ratio</span>
                    <span className="text-[#FAF6EF] font-semibold">
                      1 : {riskResult.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B7ADA0] font-sans">Stop Distance</span>
                    <span className="text-[#F5EFE6]">
                      {riskResult.stopDistancePrice} ({riskResult.stopDistancePips} pips)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#B7ADA0] font-sans">Value / Pip</span>
                    <span className="text-[#F5EFE6]">
                      {formatCurrency(riskResult.dollarPerPipAtLotSize, currency)}/pip
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={!riskResult.valid || !activeAccount}
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
                className="btn-emerald-glass w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#FAF6EF] rounded-xl disabled:opacity-40"
              >
                <span>
                  {activeAccount
                    ? 'Send Parameters to Trade Journal'
                    : 'Connect an Account First'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: 15-MINUTE ORB STRATEGY & CONFLUENCE CONFIGURATOR */}
        {tab === 'strategy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-6 space-y-2">
                <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
                  {activeStrategy.name}
                </h2>
                <p className="text-xs text-[#B7ADA0] leading-relaxed">
                  {activeStrategy.description}
                </p>
                <div className="pt-2 flex items-center gap-3 text-xs">
                  <label className="text-[#B7ADA0]">Min Confluences Required:</label>
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
                    className="tos-input w-16 px-2.5 py-1.5 font-mono text-[#3FA17F]"
                  />
                </div>
              </div>

              {/* ORB Schematic */}
              <div className="lg:col-span-6 p-4 rounded-2xl liquid-glass-inset">
                <svg
                  viewBox="0 0 420 155"
                  className="w-full h-auto"
                  role="img"
                  aria-label="15-minute Opening Range Breakout schematic"
                >
                  <rect
                    x="30"
                    y="55"
                    width="95"
                    height="52"
                    fill="rgba(37,135,103,0.14)"
                    stroke="#2FA47C"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text x="32" y="47" fill="#3FA17F" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    15m ORB High
                  </text>
                  <text x="32" y="143" fill="#B7ADA0" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    15m ORB Low (SL)
                  </text>

                  <rect
                    x="170"
                    y="45"
                    width="85"
                    height="18"
                    fill="rgba(53,113,165,0.22)"
                    stroke="#3571A5"
                    strokeWidth="1"
                  />
                  <text x="260" y="57" fill="#7FB1DC" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    FVG / CISD Entry
                  </text>

                  <polyline
                    points="35,82 58,64 78,118 105,74 148,38 188,54 220,54 315,16"
                    fill="none"
                    stroke="#FAF6EF"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <circle cx="78" cy="118" r="3" fill="#F43F5E" />
                  <text x="86" y="122" fill="#F43F5E" fontSize="8.5" fontFamily="JetBrains Mono, monospace">
                    Sweep
                  </text>

                  <circle cx="205" cy="54" r="3.5" fill="#3571A5" />
                  <circle cx="315" cy="16" r="3.5" fill="#10B981" />
                  <text x="322" y="20" fill="#10B981" fontSize="9" fontFamily="JetBrains Mono, monospace">
                    Liquidity TP
                  </text>
                </svg>
              </div>
            </div>

            {/* Session ORB Configurations */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-[#EFE7DC]">
                Session 15-Minute Opening Range Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeStrategy.orbSessions.map((orb) => (
                  <div
                    key={orb.id}
                    className={`p-4 rounded-2xl border space-y-3 ${
                      orb.enabled
                        ? 'liquid-glass-inset border-[#FAF6EF]/15'
                        : 'bg-[#0A0807]/50 border-[#FAF6EF]/8 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-sm font-semibold text-[#FAF6EF]">
                        {orb.sessionName}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOrbSession(orb.id, { enabled: !orb.enabled })}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded-lg ${
                          orb.enabled
                            ? 'bg-[#0E4A38]/65 text-[#FAF6EF] border border-[#258767]/45'
                            : 'bg-white/[0.06] text-[#9A8F83]'
                        }`}
                      >
                        {orb.enabled ? 'Active' : 'Off'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-[#9A8F83]">UTC Hr</label>
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
                          className="tos-input w-full px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#9A8F83]">UTC Min</label>
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
                          className="tos-input w-full px-2 py-1 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[#9A8F83]">Range (m)</label>
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
                          className="tos-input w-full px-2 py-1 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-[#9A8F83] mb-0.5">
                          Breakout Condition
                        </label>
                        <select
                          value={orb.breakoutCondition}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              breakoutCondition: e.target.value as OrbSessionConfig['breakoutCondition'],
                            })
                          }
                          className="tos-input w-full px-2.5 py-1.5 text-xs"
                        >
                          <option value="1m Candle Close">1m Candle Close</option>
                          <option value="5m Candle Close">5m Candle Close</option>
                          <option value="15m Candle Close">15m Candle Close</option>
                          <option value="Wick Breach + Retest">Wick Breach + Retest</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#9A8F83] mb-0.5">
                          Entry Confirmation
                        </label>
                        <select
                          value={orb.entryConfirmation}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              entryConfirmation: e.target.value as OrbSessionConfig['entryConfirmation'],
                            })
                          }
                          className="tos-input w-full px-2.5 py-1.5 text-xs"
                        >
                          <option value="FVG Retest">FVG Retest</option>
                          <option value="CISD Confirmation">CISD Confirmation</option>
                          <option value="Order Block Mitigation">Order Block Mitigation</option>
                          <option value="Immediate Momentum">Immediate Momentum</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#9A8F83] mb-0.5">
                          Stop Loss &amp; Target
                        </label>
                        <select
                          value={orb.takeProfitModel}
                          onChange={(e) =>
                            updateOrbSession(orb.id, {
                              takeProfitModel: e.target.value as OrbSessionConfig['takeProfitModel'],
                            })
                          }
                          className="tos-input w-full px-2.5 py-1.5 text-xs"
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
              <h3 className="text-xs font-medium text-[#EFE7DC]">
                Configurable Structural Confluences
              </h3>
              <div className="divide-y divide-[#FAF6EF]/10 border-y border-[#FAF6EF]/15">
                {activeStrategy.confluences.map((conf) => (
                  <div
                    key={conf.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono text-[#3FA17F] font-semibold">
                          {conf.shortCode}
                        </span>
                        <span className="font-medium text-[#FAF6EF]">{conf.name}</span>
                      </div>
                      <p className="text-[11px] text-[#9A8F83] mt-0.5">{conf.ruleDescription}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <label className="flex items-center gap-1.5 text-[11px] text-[#B7ADA0]">
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
                          className="tos-input w-12 px-2 py-1 font-mono"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateConfluence(conf.id, !conf.enabled)}
                        className={`px-3 py-1 text-xs font-medium rounded-xl ${
                          conf.enabled
                            ? 'bg-[#0E4A38]/65 text-[#FAF6EF] border border-[#258767]/50'
                            : 'bg-white/[0.05] text-[#9A8F83] border border-[#FAF6EF]/12'
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

        {/* TAB 3: ACCOUNTS, DEPOSITS/WITHDRAWALS LEDGER & LOCAL BACKUP */}
        {tab === 'accounts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#FAF6EF]">
                  Accounts, Capital &amp; Cash Ledger
                </h2>
                <p className="text-xs text-[#B7ADA0] mt-0.5">
                  Connect an account, adjust initial balance, record deposits or withdrawals, and configure funded rules.
                </p>
              </div>

              {/* Account Selector */}
              {state.accounts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {state.accounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => onSwitchAccount(acc.id)}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-medium transition-colors ${
                        activeAccount && acc.id === activeAccount.id
                          ? 'bg-[#0E4A38]/65 text-[#FAF6EF] border-[#258767]/55'
                          : 'bg-[#0A0807]/55 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                      }`}
                    >
                      {acc.name} · {formatCurrency(acc.startingBalance, acc.currency)}
                    </button>
                  ))}
                </div>
              )}

              {/* Active Account Editor & Cash Ledger */}
              {activeAccount ? (
                <>
                  <div className="p-4 rounded-2xl liquid-glass-inset space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#B7ADA0] mb-1">Account Name</label>
                        <input
                          type="text"
                          value={activeAccount.name}
                          onChange={(e) =>
                            onUpdateAccount({ ...activeAccount, name: e.target.value })
                          }
                          className="tos-input w-full px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[#B7ADA0] mb-1">Starting Capital</label>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={activeAccount.startingBalance}
                          onChange={(e) =>
                            onUpdateAccount({
                              ...activeAccount,
                              startingBalance: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          className="tos-input w-full px-3 py-2 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[#B7ADA0] mb-1">Max Daily Trades</label>
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
                          className="tos-input w-full px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#FAF6EF]/12 space-y-3">
                      <label className="inline-flex items-center gap-2 text-[#F5EFE6] cursor-pointer">
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
                          className="accent-[#258767]"
                        />
                        <span>Enable Funded Evaluation / Prop Challenge Rules</span>
                      </label>

                      {activeAccount.fundedRules.enabled && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                              className="tos-input w-full px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                              className="tos-input w-full px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                              className="tos-input w-full px-2.5 py-1.5 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] text-[#B7ADA0] mb-1">
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
                              className="tos-input w-full px-2.5 py-1.5 font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cash Activity: Deposits & Withdrawals */}
                  <div className="p-4 rounded-2xl liquid-glass-inset space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium text-[#FAF6EF]">
                        <ArrowDownUp className="w-3.5 h-3.5 text-[#3FA17F]" />
                        <span>Record Deposit / Withdrawal</span>
                      </div>
                      <span className="font-mono text-[#B7ADA0]">
                        Current Balance {formatCurrency(currentBalance, activeAccount.currency)}
                      </span>
                    </div>

                    <form onSubmit={handleRecordTransaction} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <select
                        value={txType}
                        onChange={(e) => setTxType(e.target.value as AccountTransactionType)}
                        aria-label="Transaction type"
                        className="tos-input sm:col-span-6 px-3 py-2 text-xs"
                      >
                        <option value="Deposit">Deposit</option>
                        <option value="Withdrawal">Withdrawal</option>
                        <option value="Fee">Fee</option>
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder={`Amount (${activeAccount.currency})`}
                        aria-label="Transaction amount"
                        className="tos-input sm:col-span-6 px-3 py-2 text-xs font-mono"
                      />
                      <input
                        type="text"
                        value={txNote}
                        onChange={(e) => setTxNote(e.target.value)}
                        placeholder="Note (e.g., Broker wire, Payout)"
                        aria-label="Transaction note"
                        className="tos-input sm:col-span-9 px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="btn-emerald-glass sm:col-span-3 px-3 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
                      >
                        Record
                      </button>
                    </form>

                    {accountTransactions.length > 0 && (
                      <div className="divide-y divide-[#FAF6EF]/10 pt-2 max-h-36 overflow-y-auto">
                        {accountTransactions.map((tx) => {
                          const isPositive = tx.type === 'Deposit' || (tx.type === 'Adjustment' && tx.amount >= 0);
                          return (
                            <div key={tx.id} className="py-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <span className="font-medium text-[#FAF6EF]">{tx.type}</span>
                                <span className="text-[#9A8F83] ml-2">
                                  {formatShortDate(tx.timestamp)} · {tx.note}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 shrink-0 font-mono tabular-nums">
                                <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                  {isPositive ? '+' : '-'}
                                  {formatCurrency(Math.abs(tx.amount), activeAccount.currency)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTransaction(tx.id)}
                                  aria-label={`Remove ${tx.type}`}
                                  className="text-[#9A8F83] hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-5 rounded-2xl liquid-glass-inset text-xs text-[#B7ADA0] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#FAF6EF] font-medium">
                    <Wallet className="w-4 h-4 text-[#3FA17F]" />
                    <span>No Account Connected</span>
                  </div>
                  <p className="leading-relaxed">
                    Create your first trading account below using real starting capital (or $0 if you prefer to track capital solely via Deposit records).
                  </p>
                </div>
              )}

              {/* Create New Account */}
              <div className="p-4 rounded-2xl liquid-glass-inset space-y-3 text-xs">
                <div className="font-medium text-[#FAF6EF]">Connect / Create Account</div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <input
                    type="text"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder="Account Name (e.g., Personal Live)"
                    aria-label="New account name"
                    className="tos-input sm:col-span-7 px-3 py-2 text-xs"
                  />
                  <input
                    type="text"
                    value={newAccBroker}
                    onChange={(e) => setNewAccBroker(e.target.value)}
                    placeholder="Broker (e.g., FTMO)"
                    aria-label="New account broker"
                    className="tos-input sm:col-span-5 px-3 py-2 text-xs"
                  />
                  <select
                    value={newAccCurrency}
                    onChange={(e) => setNewAccCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                    aria-label="New account currency"
                    className="tos-input sm:col-span-4 px-2.5 py-2 text-xs font-mono"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    placeholder="Starting Capital"
                    aria-label="New account starting capital"
                    className="tos-input sm:col-span-8 px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-2 text-[#D5CBC0] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAccFunded}
                      onChange={(e) => setNewAccFunded(e.target.checked)}
                      className="accent-[#258767]"
                    />
                    <span>Apply Funded / Prop Challenge Rules</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCreateNewAccount}
                    className="btn-emerald-glass inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-[#FAF6EF] rounded-xl"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Data Persistence & Backup */}
            <div className="lg:col-span-5 p-6 rounded-[24px] liquid-glass space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="font-display text-base font-semibold text-[#FAF6EF]">
                    Local-First Backup &amp; Workspace Data
                  </h3>
                  <p className="text-xs text-[#B7ADA0] mt-1 leading-relaxed">
                    Accounts, cash transactions, journal entries, annotated screenshots, checklist records, and ORB rules persist locally. Export a portable JSON snapshot anytime.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-2xl liquid-glass-inset">
                    <div className="text-[#9A8F83]">Connected Accounts</div>
                    <div className="font-mono text-base font-semibold text-[#FAF6EF] mt-0.5 tabular-nums">
                      {state.accounts.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-inset">
                    <div className="text-[#9A8F83]">Cash Ledger Entries</div>
                    <div className="font-mono text-base font-semibold text-[#FAF6EF] mt-0.5 tabular-nums">
                      {state.transactions.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-inset">
                    <div className="text-[#9A8F83]">Journal Executions</div>
                    <div className="font-mono text-base font-semibold text-[#FAF6EF] mt-0.5 tabular-nums">
                      {state.trades.length}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl liquid-glass-inset">
                    <div className="text-[#9A8F83]">Checklist Days</div>
                    <div className="font-mono text-base font-semibold text-[#FAF6EF] mt-0.5 tabular-nums">
                      {Object.keys(state.checklistRecords).length}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="btn-emerald-glass w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold text-[#FAF6EF] rounded-xl"
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
                    className="btn-ivory-glass w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium text-[#FAF6EF] rounded-xl"
                  >
                    <Upload className="w-4 h-4 text-[#3FA17F]" />
                    <span>Restore From Backup JSON</span>
                  </button>
                </div>

                {backupMessage && (
                  <div
                    className={`p-3 rounded-2xl text-xs ${
                      backupMessage.tone === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                        : 'bg-rose-500/15 text-rose-300 border border-rose-500/35'
                    }`}
                  >
                    {backupMessage.text}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#FAF6EF]/15 space-y-2.5">
                {confirmReset === 'none' ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReset('clearAll')}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset to Zero State</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset('loadSample')}
                      className="btn-ivory-glass inline-flex items-center gap-1.5 px-3 py-2 text-xs text-[#F5EFE6] rounded-xl"
                    >
                      <Database className="w-3.5 h-3.5 text-[#3571A5]" />
                      <span>Load Demo Dataset</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 space-y-2.5 text-xs">
                    <div className="text-rose-200">
                      {confirmReset === 'clearAll'
                        ? 'Clear all accounts, transactions, and trades back to zero?'
                        : 'Load optional demo dataset for previewing analytics?'}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirmReset === 'clearAll') onClearAllActivity();
                          else onLoadSampleDataset();
                          setConfirmReset('none');
                        }}
                        className="px-3.5 py-1.5 bg-rose-500 text-white font-semibold rounded-xl"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset('none')}
                        className="px-3 py-1.5 text-[#D5CBC0] hover:text-[#FAF6EF]"
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
