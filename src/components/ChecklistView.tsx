import { useState } from 'react';
import {
  Check,
  Edit3,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { createDefaultChecklistRecord } from '../core/seed';
import {
  ChecklistCategory,
  ChecklistItem,
  DailyChecklistRecord,
} from '../core/types';

interface ChecklistViewProps {
  items: ChecklistItem[];
  records: Record<string, DailyChecklistRecord>;
  watchlist: string[];
  onSaveRecord: (record: DailyChecklistRecord) => void;
  onCreateItem: (item: Omit<ChecklistItem, 'id'>) => void;
  onUpdateItem: (item: ChecklistItem) => void;
  onDeleteItem: (id: string) => void;
}

const CATEGORIES: ChecklistCategory[] = [
  'Market Conditions',
  'Economic News',
  'Trading Sessions',
  'Watchlist',
  'Higher Timeframe',
  'Key Levels & Liquidity',
  'Potential Setups',
  'Psychological Readiness',
];

export function ChecklistView({
  items,
  records,
  watchlist,
  onSaveRecord,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: ChecklistViewProps) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [manageMode, setManageMode] = useState<boolean>(false);

  // Add / Edit item form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<ChecklistCategory>('Market Conditions');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRequired, setFormRequired] = useState(true);
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const record: DailyChecklistRecord =
    records[selectedDate] || createDefaultChecklistRecord(selectedDate);

  const enabledItems = items.filter((i) => i.enabled);
  const completedCount = enabledItems.filter((i) =>
    record.completedIds.includes(i.id)
  ).length;
  const completionPct =
    enabledItems.length > 0 ? Math.round((completedCount / enabledItems.length) * 100) : 0;

  const isLocked = Boolean(record.lockedAt);

  // Build 14-day history strip ending on todayKey
  const recentDays: Array<{ date: string; pct: number; completed: number; total: number }> = [];
  const baseDate = new Date(`${todayKey}T00:00:00Z`);
  for (let offset = 13; offset >= 0; offset -= 1) {
    const d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() - offset);
    const key = d.toISOString().slice(0, 10);
    const rec = records[key];
    const done = rec
      ? enabledItems.filter((i) => rec.completedIds.includes(i.id)).length
      : 0;
    const pct = enabledItems.length > 0 ? Math.round((done / enabledItems.length) * 100) : 0;
    recentDays.push({ date: key, pct, completed: done, total: enabledItems.length });
  }

  const toggleItemCompletion = (itemId: string) => {
    if (isLocked) return;
    const exists = record.completedIds.includes(itemId);
    const nextIds = exists
      ? record.completedIds.filter((id) => id !== itemId)
      : [...record.completedIds, itemId];
    onSaveRecord({ ...record, completedIds: nextIds });
  };

  const updateRecordField = <K extends keyof DailyChecklistRecord>(
    field: K,
    value: DailyChecklistRecord[K]
  ) => {
    if (isLocked) return;
    onSaveRecord({ ...record, [field]: value });
  };

  const toggleWatchlistInstrument = (symbol: string) => {
    if (isLocked) return;
    const exists = record.activeWatchlist.includes(symbol);
    const next = exists
      ? record.activeWatchlist.filter((s) => s !== symbol)
      : [...record.activeWatchlist, symbol];
    onSaveRecord({ ...record, activeWatchlist: next });
  };

  const handleLockToggle = () => {
    if (isLocked) {
      onSaveRecord({ ...record, lockedAt: undefined });
    } else {
      onSaveRecord({ ...record, lockedAt: new Date().toISOString() });
    }
  };

  const openCreateForm = () => {
    setEditingItemId(null);
    setFormCategory('Market Conditions');
    setFormTitle('');
    setFormDescription('');
    setFormRequired(true);
    setFormError('');
    setShowAddForm(true);
  };

  const openEditForm = (item: ChecklistItem) => {
    setEditingItemId(item.id);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormRequired(item.required);
    setFormError('');
    setShowAddForm(true);
  };

  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrim = formTitle.trim();
    if (!titleTrim) {
      setFormError('Checklist item title is required.');
      return;
    }

    if (editingItemId) {
      const existing = items.find((i) => i.id === editingItemId);
      if (existing) {
        onUpdateItem({
          ...existing,
          category: formCategory,
          title: titleTrim,
          description: formDescription.trim(),
          required: formRequired,
        });
      }
    } else {
      onCreateItem({
        category: formCategory,
        title: titleTrim,
        description: formDescription.trim(),
        required: formRequired,
        enabled: true,
      });
    }
    setShowAddForm(false);
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <section className="glass-panel rounded-xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white">
              Pre-Market Preparation System
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Standardize your daily routine, verify liquidity &amp; news catalysts, and calibrate mental readiness before execution.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
            <label className="flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
              <span>Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayKey)}
                className="px-2.5 py-1.5 rounded-lg bg-[#050505]/80 border border-white/[0.1] text-slate-100 font-mono text-xs focus:outline-none focus:border-[#00BFFF]"
              />
            </label>

            <button
              type="button"
              onClick={() => setManageMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                manageMode
                  ? 'bg-[#8A2BE2]/20 text-white border-[#8A2BE2]/50'
                  : 'bg-white/[0.04] text-slate-300 border-white/[0.1] hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{manageMode ? 'Done Editing' : 'Customize'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] rounded-lg hover:opacity-95 transition-opacity whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={handleLockToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                isLocked
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/[0.04] text-slate-200 border-white/[0.1] hover:border-[#00BFFF]/50'
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'Unlock' : 'Lock Record'}</span>
            </button>
          </div>
        </div>

        {/* Completion Bar + 14-Day Consistency Strip */}
        <div className="mt-6 pt-5 border-t border-white/[0.08] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Daily Progress {isLocked ? '· Locked' : ''}
              </span>
              <span className="font-mono text-white tabular-nums">
                {completedCount}/{enabledItems.length} items ({completionPct}%)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>14-Day Routine Consistency</span>
              <span className="font-mono text-slate-300">Click any day to inspect</span>
            </div>
            <div className="grid grid-cols-14 gap-1.5">
              {recentDays.map((day) => {
                const isSelected = day.date === selectedDate;
                const tone =
                  day.pct === 100
                    ? 'bg-[#00BFFF]/80 border-[#00BFFF]'
                    : day.pct >= 50
                    ? 'bg-[#8A2BE2]/60 border-[#8A2BE2]/70'
                    : day.pct > 0
                    ? 'bg-white/20 border-white/25'
                    : 'bg-white/[0.04] border-white/[0.06]';
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    title={`${day.date}: ${day.pct}% (${day.completed}/${day.total})`}
                    aria-label={`Select checklist date ${day.date} (${day.pct}% complete)`}
                    className={`h-8 rounded border transition-all flex flex-col items-center justify-center text-[10px] font-mono tabular-nums ${tone} ${
                      isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[#050505]' : ''
                    }`}
                  >
                    <span className="text-white/90">{day.date.slice(8)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Add / Edit Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleSaveItemForm}
          className="glass-panel rounded-xl p-6 border-[#00BFFF]/30 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">
              {editingItemId ? 'Edit Checklist Item' : 'Create Custom Checklist Item'}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              aria-label="Close checklist item form"
              className="p-1.5 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ChecklistCategory)}
                className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">Item Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Mark Previous Week High/Low and Midnight Open"
                className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00BFFF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Execution Criteria / Notes</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional verification criteria..."
              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-sm text-white focus:outline-none focus:border-[#00BFFF]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formRequired}
                onChange={(e) => setFormRequired(e.target.checked)}
                className="rounded border-white/20 bg-[#050505] text-[#00BFFF]"
              />
              <span>Required before trade execution</span>
            </label>

            <div className="flex items-center gap-3">
              {formError && <span className="text-xs text-rose-400">{formError}</span>}
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] rounded-lg"
              >
                {editingItemId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Split: Interactive Checklist Items (7 cols) + Daily Context & Readiness (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {CATEGORIES.map((category) => {
            const catItems = items.filter((i) => i.category === category);
            if (catItems.length === 0) return null;

            return (
              <section key={category} className="glass-panel rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                  <h2 className="font-display text-sm font-semibold text-white">{category}</h2>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {catItems.filter((i) => i.enabled && record.completedIds.includes(i.id)).length}/
                    {catItems.filter((i) => i.enabled).length}
                  </span>
                </div>

                <div className="mt-2 divide-y divide-white/[0.05]">
                  {catItems.map((item) => {
                    const checked = record.completedIds.includes(item.id);
                    const isConfirmingDelete = pendingDeleteId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`py-3 flex items-start justify-between gap-3 ${
                          !item.enabled ? 'opacity-50' : ''
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isLocked || !item.enabled}
                          onClick={() => toggleItemCompletion(item.id)}
                          aria-pressed={checked}
                          className="flex items-start gap-3 text-left flex-1 min-w-0 group disabled:cursor-not-allowed"
                        >
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                              checked
                                ? 'bg-[#00BFFF] border-[#00BFFF] text-[#050505]'
                                : 'border-white/25 bg-[#050505] group-hover:border-[#00BFFF]/60'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>

                          <div className="min-w-0">
                            <div
                              className={`text-sm font-medium transition-colors ${
                                checked ? 'text-slate-400 line-through' : 'text-slate-100'
                              }`}
                            >
                              {item.title}
                              {item.required && (
                                <span className="ml-2 text-[11px] font-mono text-[#00BFFF]">
                                  Required
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>

                        {manageMode && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateItem({ ...item, enabled: !item.enabled })
                              }
                              className="px-2 py-1 text-[11px] font-mono rounded border border-white/10 text-slate-300 hover:text-white"
                            >
                              {item.enabled ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label={`Edit ${item.title}`}
                              className="p-1.5 text-slate-400 hover:text-[#00BFFF] rounded"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItem(item.id);
                                    setPendingDeleteId(null);
                                  }}
                                  className="px-2 py-1 text-[11px] font-medium bg-rose-500/20 text-rose-300 rounded"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(null)}
                                  className="px-1.5 py-1 text-[11px] text-slate-400"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(item.id)}
                                aria-label={`Delete ${item.title}`}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Right Column: Pre-Market Analysis & Psychological Readiness */}
        <aside className="lg:col-span-5 glass-panel rounded-xl p-6 space-y-5 lg:sticky lg:top-20">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <h2 className="font-display text-lg font-semibold text-white">
              Session Plan &amp; Readiness
            </h2>
            {!isLocked && record.completedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSaveRecord({ ...record, completedIds: [] })}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Checks</span>
              </button>
            )}
          </div>

          {/* Market Bias */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Higher-Timeframe Bias</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Bullish', 'Neutral / Range', 'Bearish'] as const).map((bias) => {
                const active = record.marketBias === bias;
                return (
                  <button
                    key={bias}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('marketBias', bias)}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${
                      active
                        ? bias === 'Bullish'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                          : bias === 'Bearish'
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                          : 'bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/40'
                        : 'bg-[#050505]/60 text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {bias}
                  </button>
                );
              })}
            </div>
          </div>

          {/* News Impact */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Economic Calendar Risk</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low / Clear', 'Medium Impact', 'High Impact'] as const).map((lvl) => {
                const active = record.newsImpact === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('newsImpact', lvl)}
                    className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${
                      active
                        ? 'bg-[#8A2BE2]/20 text-white border-[#8A2BE2]/50'
                        : 'bg-[#050505]/60 text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Watchlist */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Today&apos;s Active Watchlist</label>
            <div className="flex flex-wrap gap-2">
              {watchlist.map((sym) => {
                const active = record.activeWatchlist.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleWatchlistInstrument(sym)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors ${
                      active
                        ? 'bg-[#00BFFF]/15 text-[#00BFFF] border-[#00BFFF]/40'
                        : 'bg-[#050505]/60 text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* HTF Key Levels & Liquidity */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Higher-Timeframe S/R &amp; Structure Levels
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.htfLevelsNote}
              onChange={(e) => updateRecordField('htfLevelsNote', e.target.value)}
              placeholder="e.g., Daily bullish OB 2642, Weekly high 2688..."
              className="w-full px-3 py-2 rounded-lg bg-[#050505]/80 border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-[#00BFFF] disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Liquidity Pools &amp; Draw on Liquidity
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.liquidityNote}
              onChange={(e) => updateRecordField('liquidityNote', e.target.value)}
              placeholder="e.g., Equal highs at 2678, Asian low sweep zone 2655..."
              className="w-full px-3 py-2 rounded-lg bg-[#050505]/80 border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-[#00BFFF] disabled:opacity-60"
            />
          </div>

          {/* Psychological Readiness Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="readiness-slider" className="text-slate-400">
                Psychological Readiness Score
              </label>
              <span className="font-mono text-[#00BFFF] tabular-nums">
                {record.readinessScore}/10
              </span>
            </div>
            <input
              id="readiness-slider"
              type="range"
              min={1}
              max={10}
              disabled={isLocked}
              value={record.readinessScore}
              onChange={(e) => updateRecordField('readinessScore', Number(e.target.value))}
              className="w-full accent-[#00BFFF]"
            />
          </div>

          {/* Execution Gameplan Notes */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Daily Execution Rules</label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={record.notes}
              onChange={(e) => updateRecordField('notes', e.target.value)}
              placeholder="A+ triggers, invalidation rules, max loss stop..."
              className="w-full px-3 py-2 rounded-lg bg-[#050505]/80 border border-white/[0.1] text-xs text-slate-100 focus:outline-none focus:border-[#00BFFF] disabled:opacity-60"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
