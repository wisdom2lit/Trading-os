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
    <div className="space-y-10">
      {/* Header & Open Progress + 14-Day Matrix (Zero Enclosing Box) */}
      <section className="pb-8 border-b border-[#E8D7A8]/14 space-y-7">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="text-xs sm:text-sm font-mono font-bold text-[#B7FF00] mb-1.5">
              Pre-Market Protocol · {selectedDate}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#FAF6EE]">
              Pre-Market Preparation System
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-[#C9BA9E] mt-1.5 max-w-2xl">
              Verify macro conditions, session timing, liquidity pools, and mental readiness before placing orders.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
            <label className="flex items-center gap-2 text-xs font-bold text-[#C9BA9E] whitespace-nowrap">
              <span>Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayKey)}
                className="tos-input px-3.5 py-2.5 font-mono text-xs font-bold"
              />
            </label>

            <button
              type="button"
              onClick={() => setManageMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 ${
                manageMode ? 'glass-control-active text-[#FAF6EE]' : 'glass-control text-[#E8D7A8]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-[#FFD36A]" />
              <span>{manageMode ? 'Done Editing' : 'Customize'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="glass-gold-cta inline-flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={handleLockToggle}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-all ${
                isLocked
                  ? 'glass-control-active text-[#FFD36A]'
                  : 'glass-control text-[#E8D7A8]'
              }`}
            >
              {isLocked ? (
                <Unlock className="w-3.5 h-3.5 text-[#FFD36A]" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-[#E8D7A8]" />
              )}
              <span>{isLocked ? 'Unlock' : 'Lock Record'}</span>
            </button>
          </div>
        </div>

        {/* Open Floating Progress & 14-Day Consistency Strip */}
        <div className="pt-6 border-t border-[#E8D7A8]/12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-[#C9BA9E]">
                Daily Progress {isLocked ? '· Locked' : ''}
              </span>
              <span className="font-mono font-extrabold text-[#B7FF00] tabular-nums">
                {completedCount}/{enabledItems.length} items ({completionPct}%)
              </span>
            </div>
            <div className="h-3 w-full glass-well overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8D7A8] via-[#FFD36A] to-[#B7FF00] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between text-xs font-bold text-[#C9BA9E] mb-2.5">
              <span>14-Day Routine Consistency</span>
              <span className="font-mono text-[#9C8C72]">Select day to inspect</span>
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
              {recentDays.map((day) => {
                const isSelected = day.date === selectedDate;
                const tone =
                  day.pct === 100
                    ? 'bg-emerald-500/20 border-emerald-400/55 text-emerald-200 font-extrabold'
                    : day.pct >= 50
                    ? 'bg-[#FFD36A]/22 border-[#FFD36A]/55 text-[#FAF6EE] font-bold'
                    : day.pct > 0
                    ? 'bg-[#24180F]/80 border-[#E8D7A8]/28 text-[#E8D7A8] font-bold'
                    : 'glass-well text-[#9C8C72] font-bold';
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    title={`${day.date}: ${day.pct}% (${day.completed}/${day.total})`}
                    aria-label={`Select checklist date ${day.date} (${day.pct}% complete)`}
                    className={`h-9 rounded-xl border transition-all flex items-center justify-center text-xs font-mono tabular-nums ${tone} ${
                      isSelected
                        ? 'ring-2 ring-[#FFD36A] ring-offset-2 ring-offset-[#050505]'
                        : ''
                    }`}
                  >
                    {day.date.slice(8)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Add / Edit Item Sheet */}
      {showAddForm && (
        <form
          onSubmit={handleSaveItemForm}
          className="glass-surface rounded-[26px] p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E8D7A8]/14">
            <h2 className="font-display text-lg font-extrabold text-[#FAF6EE]">
              {editingItemId ? 'Edit Checklist Item' : 'Create Custom Checklist Item'}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              aria-label="Close checklist item form"
              className="glass-control p-2 rounded-xl"
            >
              <X className="w-4 h-4 text-[#E8D7A8]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ChecklistCategory)}
                className="tos-input w-full px-3.5 py-2.5 text-xs sm:text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">Item Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Mark Previous Week High/Low and Midnight Open"
                className="tos-input w-full px-3.5 py-2.5 text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">
              Execution Criteria / Notes
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional verification criteria..."
              className="tos-input w-full px-3.5 py-2.5 text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#E8D7A8] cursor-pointer">
              <input
                type="checkbox"
                checked={formRequired}
                onChange={(e) => setFormRequired(e.target.checked)}
                className="rounded border-[#E8D7A8]/30 bg-[#140D09] accent-[#B7FF00]"
              />
              <span>Required before trade execution</span>
            </label>

            <div className="flex items-center gap-3">
              {formError && <span className="text-xs font-bold text-rose-400">{formError}</span>}
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="glass-control px-4 py-2.5 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glass-gold-cta px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl"
              >
                {editingItemId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Split: Open Hairline Checklist Stream (7 cols) + Open Session Plan & Readiness Column (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {CATEGORIES.map((category) => {
            const catItems = items.filter((i) => i.category === category);
            if (catItems.length === 0) return null;

            return (
              <section key={category} className="space-y-1.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E8D7A8]/14">
                  <h2 className="font-display text-base sm:text-lg font-extrabold text-[#FAF6EE]">
                    {category}
                  </h2>
                  <span className="text-xs font-mono font-bold text-[#B7FF00] tabular-nums">
                    {catItems.filter((i) => i.enabled && record.completedIds.includes(i.id)).length}/
                    {catItems.filter((i) => i.enabled).length}
                  </span>
                </div>

                <div className="divide-y divide-[#E8D7A8]/10">
                  {catItems.map((item) => {
                    const checked = record.completedIds.includes(item.id);
                    const isConfirmingDelete = pendingDeleteId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`py-4 flex items-start justify-between gap-3 transition-opacity ${
                          !item.enabled ? 'opacity-45' : ''
                        }`}
                      >
                        <button
                          type="button"
                          disabled={isLocked || !item.enabled}
                          onClick={() => toggleItemCompletion(item.id)}
                          aria-pressed={checked}
                          className="flex items-start gap-3.5 text-left flex-1 min-w-0 group disabled:cursor-not-allowed"
                        >
                          <span
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                              checked
                                ? 'bg-[#FFD36A]/20 border border-[#FFD36A] text-[#FFD36A] shadow-[0_0_14px_-2px_rgba(255,211,106,0.45)] scale-105'
                                : 'glass-well group-hover:border-[#FFD36A]/55'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>

                          <div className="min-w-0">
                            <div
                              className={`text-sm sm:text-base font-bold transition-all duration-200 ${
                                checked ? 'checklist-strike' : 'text-[#FAF6EE]'
                              }`}
                            >
                              {item.title}
                              {item.required && (
                                <span
                                  className={`ml-2 text-xs font-mono font-bold ${
                                    checked ? 'text-[#FFD36A]/80' : 'text-[#FFD36A]'
                                  }`}
                                >
                                  Required
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p
                                className={`text-xs font-semibold mt-1 leading-relaxed transition-colors ${
                                  checked ? 'text-[#9C8C72]/80' : 'text-[#C9BA9E]'
                                }`}
                              >
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
                              className="glass-control px-3 py-1.5 text-xs font-mono font-bold rounded-xl"
                            >
                              {item.enabled ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label={`Edit ${item.title}`}
                              className="glass-control p-2 rounded-xl"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-[#FFD36A]" />
                            </button>
                            {isConfirmingDelete ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteItem(item.id);
                                    setPendingDeleteId(null);
                                  }}
                                  className="px-3 py-1.5 text-xs font-bold bg-rose-500/25 text-rose-200 border border-rose-400/50 rounded-xl"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(null)}
                                  className="px-2 py-1 text-xs font-bold text-[#C9BA9E]"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(item.id)}
                                aria-label={`Delete ${item.title}`}
                                className="glass-control p-2 hover:text-rose-400 rounded-xl"
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

        {/* Right Column: Open Session Plan & Readiness Controls (Zero Outer Card Box) */}
        <aside className="lg:col-span-5 lg:pl-8 lg:border-l lg:border-[#E8D7A8]/14 space-y-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E8D7A8]/14">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#FAF6EE]">
              Session Plan &amp; Readiness
            </h2>
            {!isLocked && record.completedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSaveRecord({ ...record, completedIds: [] })}
                className="glass-control inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#E8D7A8]" />
                <span>Reset Checks</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-2">
              Higher-Timeframe Bias
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Bullish', 'Neutral / Range', 'Bearish'] as const).map((bias) => {
                const active = record.marketBias === bias;
                return (
                  <button
                    key={bias}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('marketBias', bias)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
                      active
                        ? bias === 'Bullish'
                          ? 'bg-emerald-500/24 text-emerald-200 border border-emerald-400/65'
                          : bias === 'Bearish'
                          ? 'bg-rose-500/24 text-rose-200 border border-rose-400/65'
                          : 'glass-control-active text-[#FAF6EE]'
                        : 'glass-control text-[#C9BA9E] hover:text-[#FAF6EE]'
                    }`}
                  >
                    {bias}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-2">
              Economic Calendar Risk
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low / Clear', 'Medium Impact', 'High Impact'] as const).map((lvl) => {
                const active = record.newsImpact === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('newsImpact', lvl)}
                    className={`py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
                      active
                        ? 'glass-control-active text-[#FAF6EE]'
                        : 'glass-control text-[#C9BA9E] hover:text-[#FAF6EE]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-2">
              Today&apos;s Active Watchlist
            </label>
            <div className="flex flex-wrap gap-2">
              {watchlist.map((sym) => {
                const active = record.activeWatchlist.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleWatchlistInstrument(sym)}
                    className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all ${
                      active
                        ? 'glass-control-active text-[#FFD36A]'
                        : 'glass-control text-[#C9BA9E] hover:text-[#FAF6EE]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">
              Higher-Timeframe S/R &amp; Structure Levels
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.htfLevelsNote}
              onChange={(e) => updateRecordField('htfLevelsNote', e.target.value)}
              placeholder="e.g., Daily bullish OB 2642, Weekly high 2688..."
              className="tos-input w-full px-4 py-2.5 text-xs sm:text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">
              Liquidity Pools &amp; Draw on Liquidity
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.liquidityNote}
              onChange={(e) => updateRecordField('liquidityNote', e.target.value)}
              placeholder="e.g., Equal highs at 2678, Asian low sweep zone 2655..."
              className="tos-input w-full px-4 py-2.5 text-xs sm:text-sm disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
              <label htmlFor="readiness-slider" className="font-bold text-[#C9BA9E]">
                Psychological Readiness Score
              </label>
              <span className="font-mono text-[#B7FF00] font-extrabold tabular-nums">
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
              className="glass-slider w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#C9BA9E] mb-1.5">
              Daily Execution Rules
            </label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={record.notes}
              onChange={(e) => updateRecordField('notes', e.target.value)}
              placeholder="A+ triggers, invalidation rules, max loss stop..."
              className="tos-input w-full px-4 py-2.5 text-xs sm:text-sm disabled:opacity-60"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
