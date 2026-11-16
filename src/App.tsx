import { useEffect, useMemo, useState } from 'react';
import { AtmosphericBackdrop } from './components/AtmosphericBackdrop';
import { ChecklistView } from './components/ChecklistView';
import { DashboardView } from './components/DashboardView';
import { HomeView } from './components/HomeView';
import { ToolsModal } from './components/ToolsModal';
import { TopNav } from './components/TopNav';
import { TradesView } from './components/TradesView';
import { computeAnalytics } from './core/analytics';
import {
  createDefaultChecklistRecord,
  createEmptyInitialState,
  createInitialSeedState,
} from './core/seed';
import { evaluateOrbWindows, getMarketSessionSnapshot } from './core/sessions';
import { loadAppState, saveAppState } from './core/storage';
import {
  AccountTransaction,
  ChecklistItem,
  DailyChecklistRecord,
  InstrumentSpec,
  NavSection,
  StrategyConfig,
  TosAppState,
  Trade,
  TradingAccount,
} from './core/types';

export default function App() {
  const [state, setState] = useState<TosAppState>(() => loadAppState());
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [now, setNow] = useState<Date>(() => new Date());
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const [toolModalTab, setToolModalTab] = useState<'risk' | 'strategy' | 'accounts' | null>(null);
  const [isNewTradeModalOpen, setIsNewTradeModalOpen] = useState(false);
  const [prefilledTradeDraft, setPrefilledTradeDraft] = useState<Partial<Trade> | null>(null);
  const [inspectTrade, setInspectTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const res = saveAppState(state);
    if (!res.ok && res.error) {
      setStorageWarning(res.error);
    } else {
      setStorageWarning(null);
    }
  }, [state]);

  const activeAccount: TradingAccount | null = useMemo(
    () =>
      state.accounts.find((a) => a.id === state.activeAccountId) ||
      state.accounts[0] ||
      null,
    [state.accounts, state.activeAccountId]
  );

  const activeStrategy = useMemo(
    () =>
      state.strategies.find((s) => s.id === state.activeStrategyId) || state.strategies[0],
    [state.strategies, state.activeStrategyId]
  );

  const sessionSnapshot = useMemo(() => getMarketSessionSnapshot(now), [now]);
  const orbWindows = useMemo(
    () => evaluateOrbWindows(activeStrategy?.orbSessions || [], now),
    [activeStrategy, now]
  );

  const analytics = useMemo(
    () => computeAnalytics(state.trades, activeAccount, state.transactions, now),
    [state.trades, activeAccount, state.transactions, now]
  );

  const todayKey = now.toISOString().slice(0, 10);
  const todayRecord =
    state.checklistRecords[todayKey] || createDefaultChecklistRecord(todayKey);

  const recentAccountTrades = useMemo(() => {
    if (!activeAccount) return [];
    return state.trades
      .filter((t) => t.accountId === activeAccount.id)
      .sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  }, [state.trades, activeAccount]);

  const handleSaveChecklistRecord = (record: DailyChecklistRecord) => {
    setState((prev) => ({
      ...prev,
      checklistRecords: {
        ...prev.checklistRecords,
        [record.date]: record,
      },
    }));
  };

  const handleCreateChecklistItem = (item: Omit<ChecklistItem, 'id'>) => {
    const created: ChecklistItem = {
      ...item,
      id: `chk-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      checklistItems: [...prev.checklistItems, created],
    }));
  };

  const handleUpdateChecklistItem = (updated: ChecklistItem) => {
    setState((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setState((prev) => ({
      ...prev,
      checklistItems: prev.checklistItems.filter((i) => i.id !== id),
    }));
  };

  const handleCreateTrade = (trade: Trade) => {
    setState((prev) => ({
      ...prev,
      trades: [trade, ...prev.trades],
    }));
  };

  const handleUpdateTrade = (updated: Trade) => {
    setState((prev) => ({
      ...prev,
      trades: prev.trades.map((t) => (t.id === updated.id ? updated : t)),
    }));
  };

  const handleDeleteTrade = (tradeId: string) => {
    setState((prev) => ({
      ...prev,
      trades: prev.trades.filter((t) => t.id !== tradeId),
    }));
  };

  const handleImportTrades = (imported: Trade[]) => {
    setState((prev) => ({
      ...prev,
      trades: [...imported, ...prev.trades],
    }));
  };

  const handleUpdateInstrument = (spec: InstrumentSpec) => {
    setState((prev) => ({
      ...prev,
      instruments: prev.instruments.map((i) => (i.symbol === spec.symbol ? spec : i)),
    }));
  };

  const handleUpdateStrategy = (strategy: StrategyConfig) => {
    setState((prev) => ({
      ...prev,
      strategies: prev.strategies.map((s) => (s.id === strategy.id ? strategy : s)),
    }));
  };

  const handleUpdateAccount = (account: TradingAccount) => {
    setState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.id === account.id ? account : a)),
    }));
  };

  const handleCreateAccount = (account: TradingAccount) => {
    setState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, account],
      activeAccountId: account.id,
    }));
  };

  const handleAddTransaction = (tx: AccountTransaction) => {
    setState((prev) => ({
      ...prev,
      transactions: [tx, ...prev.transactions],
    }));
  };

  const handleDeleteTransaction = (txId: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== txId),
    }));
  };

  const handleInspectTrade = (trade: Trade) => {
    setInspectTrade(trade);
    setActiveSection('trades');
  };

  const handleOpenNewTrade = () => {
    if (!activeAccount) {
      setToolModalTab('accounts');
      return;
    }
    setPrefilledTradeDraft(null);
    setActiveSection('trades');
    setIsNewTradeModalOpen(true);
  };

  const handleSendRiskToNewTrade = (draft: Partial<Trade>) => {
    setToolModalTab(null);
    if (!activeAccount) {
      setToolModalTab('accounts');
      return;
    }
    setPrefilledTradeDraft(draft);
    setActiveSection('trades');
    setIsNewTradeModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0A0807] text-[#F5EFE6] relative selection:bg-[#17694F]/45 selection:text-[#FAF6EF]">
      <AtmosphericBackdrop />

      <div className="relative z-10">
        <TopNav
          activeSection={activeSection}
          onNavigate={(sec) => {
            setInspectTrade(null);
            setActiveSection(sec);
          }}
          selectedInstrument={state.selectedInstrument}
          watchlist={state.watchlist}
          onSelectInstrument={(symbol) =>
            setState((prev) => ({ ...prev, selectedInstrument: symbol }))
          }
          activeSessionLabel={sessionSnapshot.activeLabel}
          utcTimeLabel={sessionSnapshot.utcTimeLabel}
          onOpenNewTrade={handleOpenNewTrade}
          onOpenTool={(tab) => setToolModalTab(tab)}
        />

        <main className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 pt-32 md:pt-24 pb-20">
          {storageWarning && (
            <div className="mb-6 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
              <span>{storageWarning}</span>
              <button
                type="button"
                onClick={() => setStorageWarning(null)}
                className="text-rose-300 hover:text-white ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {activeSection === 'home' && (
            <HomeView
              account={activeAccount}
              analytics={analytics}
              selectedInstrument={state.selectedInstrument}
              watchlist={state.watchlist}
              onSelectInstrument={(symbol) =>
                setState((prev) => ({ ...prev, selectedInstrument: symbol }))
              }
              sessions={sessionSnapshot.sessions}
              orbWindows={orbWindows}
              utcTimeLabel={sessionSnapshot.utcTimeLabel}
              activeSessionLabel={sessionSnapshot.activeLabel}
              todayRecord={todayRecord}
              checklistItems={state.checklistItems}
              recentTrades={recentAccountTrades}
              onNavigate={setActiveSection}
              onOpenNewTrade={handleOpenNewTrade}
              onOpenTool={(tab) => setToolModalTab(tab)}
              onInspectTrade={handleInspectTrade}
            />
          )}

          {activeSection === 'checklist' && (
            <ChecklistView
              items={state.checklistItems}
              records={state.checklistRecords}
              watchlist={state.watchlist}
              onSaveRecord={handleSaveChecklistRecord}
              onCreateItem={handleCreateChecklistItem}
              onUpdateItem={handleUpdateChecklistItem}
              onDeleteItem={handleDeleteChecklistItem}
            />
          )}

          {activeSection === 'dashboard' && (
            <DashboardView
              account={activeAccount}
              accounts={state.accounts}
              onSwitchAccount={(id) =>
                setState((prev) => ({ ...prev, activeAccountId: id }))
              }
              analytics={analytics}
              trades={state.trades}
              onInspectTrade={handleInspectTrade}
              onOpenAccountSettings={() => setToolModalTab('accounts')}
            />
          )}

          {activeSection === 'trades' && (
            <TradesView
              account={activeAccount}
              accountBalance={analytics.currentBalance}
              trades={state.trades}
              instruments={state.instruments}
              strategies={state.strategies}
              selectedTradeForInspect={inspectTrade}
              onClearInspectTrade={() => setInspectTrade(null)}
              prefilledTradeDraft={prefilledTradeDraft}
              onClearPrefilledDraft={() => setPrefilledTradeDraft(null)}
              isNewTradeModalOpen={isNewTradeModalOpen}
              onOpenNewTradeModal={() => setIsNewTradeModalOpen(true)}
              onCloseNewTradeModal={() => setIsNewTradeModalOpen(false)}
              onCreateTrade={handleCreateTrade}
              onUpdateTrade={handleUpdateTrade}
              onDeleteTrade={handleDeleteTrade}
              onImportTrades={handleImportTrades}
              onOpenAccountSettings={() => setToolModalTab('accounts')}
            />
          )}
        </main>

        {toolModalTab && (
          <ToolsModal
            initialTab={toolModalTab}
            state={state}
            activeAccount={activeAccount}
            currentBalance={analytics.currentBalance}
            onClose={() => setToolModalTab(null)}
            onUpdateInstrument={handleUpdateInstrument}
            onUpdateStrategy={handleUpdateStrategy}
            onSwitchAccount={(id) =>
              setState((prev) => ({ ...prev, activeAccountId: id }))
            }
            onUpdateAccount={handleUpdateAccount}
            onCreateAccount={handleCreateAccount}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onRestoreBackup={(nextState) => setState(nextState)}
            onLoadSampleDataset={() => setState(createInitialSeedState())}
            onClearAllActivity={() => setState(createEmptyInitialState())}
            onSendRiskToNewTrade={handleSendRiskToNewTrade}
          />
        )}
      </div>
    </div>
  );
}
