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
      {/* Header & Routine Consistency */}
      <section className="pb-8 border-b border-[#FAF6EF]/12 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-[#3FA17F] mb-1.5">
              Pre-Market Protocol · {selectedDate}
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#FAF6EF]">
              Pre-Market Preparation System
            </h1>
            <p className="text-xs sm:text-sm text-[#B7ADA0] mt-1 max-w-2xl">
              Verify macro conditions, session timing, liquidity pools, and mental readiness before placing orders.
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-nowrap items-center gap-2.5 shrink-0">
            <label className="flex items-center gap-2 text-xs text-[#B7ADA0] whitespace-nowrap">
              <span>Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || todayKey)}
                className="tos-input px-3 py-2 font-mono text-xs"
              />
            </label>

            <button
              type="button"
              onClick={() => setManageMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                manageMode
                  ? 'bg-[#1C4C76]/55 text-[#FAF6EF] border-[#3571A5]/60'
                  : 'btn-ivory-glass text-[#F5EFE6]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{manageMode ? 'Done Editing' : 'Customize'}</span>
            </button>

            <button
              type="button"
              onClick={openCreateForm}
              className="btn-emerald-glass inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={handleLockToggle}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors whitespace-nowrap shrink-0 ${
                isLocked
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/45'
                  : 'btn-ivory-glass text-[#F5EFE6]'
              }`}
            >
              {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isLocked ? 'Unlock' : 'Lock Record'}</span>
            </button>
          </div>
        </div>

        {/* Frosted Progress & 14-Day Matrix Strip */}
        <div className="liquid-glass-subtle rounded-[24px] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#B7ADA0]">
                Daily Progress {isLocked ? '· Locked' : ''}
              </span>
              <span className="font-mono text-[#FAF6EF] tabular-nums">
                {completedCount}/{enabledItems.length} items ({completionPct}%)
              </span>
            </div>
            <div className="h-2 w-full bg-[#0A0807]/60 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0E4A38] via-[#258767] to-[#3571A5] transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="flex items-center justify-between text-xs text-[#B7ADA0] mb-2.5">
              <span>14-Day Routine Consistency</span>
              <span className="font-mono text-[#9A8F83]">Select day to inspect</span>
            </div>
            <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
              {recentDays.map((day) => {
                const isSelected = day.date === selectedDate;
                const tone =
                  day.pct === 100
                    ? 'bg-[#17694F]/80 border-[#3FA17F]/80 text-[#FAF6EF] font-semibold'
                    : day.pct >= 50
                    ? 'bg-[#1C4C76]/55 border-[#3571A5]/65 text-[#FAF6EF]'
                    : day.pct > 0
                    ? 'bg-[#FAF6EF]/15 border-[#FAF6EF]/25 text-[#F5EFE6]'
                    : 'bg-[#0A0807]/45 border-[#FAF6EF]/10 text-[#82786D]';
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    title={`${day.date}: ${day.pct}% (${day.completed}/${day.total})`}
                    aria-label={`Select checklist date ${day.date} (${day.pct}% complete)`}
                    className={`h-8 rounded-xl border transition-all flex items-center justify-center text-[10px] font-mono tabular-nums ${tone} ${
                      isSelected
                        ? 'ring-2 ring-[#FAF6EF] ring-offset-2 ring-offset-[#0A0807]'
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
          className="liquid-glass rounded-[26px] p-6 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-[#FAF6EF]/15">
            <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
              {editingItemId ? 'Edit Checklist Item' : 'Create Custom Checklist Item'}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              aria-label="Close checklist item form"
              className="p-1.5 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-[#B7ADA0] mb-1.5">Category</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as ChecklistCategory)}
                className="tos-input w-full px-3.5 py-2.5 text-xs"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-[#B7ADA0] mb-1.5">Item Title</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Mark Previous Week High/Low and Midnight Open"
                className="tos-input w-full px-3.5 py-2.5 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1.5">Execution Criteria / Notes</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional verification criteria..."
              className="tos-input w-full px-3.5 py-2.5 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label className="inline-flex items-center gap-2.5 text-xs text-[#F5EFE6] cursor-pointer">
              <input
                type="checkbox"
                checked={formRequired}
                onChange={(e) => setFormRequired(e.target.checked)}
                className="rounded border-[#FAF6EF]/30 bg-[#0A0807] accent-[#258767]"
              />
              <span>Required before trade execution</span>
            </label>

            <div className="flex items-center gap-3">
              {formError && <span className="text-xs text-rose-400">{formError}</span>}
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-emerald-glass px-4 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
              >
                {editingItemId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Split: Open Hairline Checklist Stream (7 cols) + Luminous Liquid-Glass Readiness Sheet (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 space-y-8">
          {CATEGORIES.map((category) => {
            const catItems = items.filter((i) => i.category === category);
            if (catItems.length === 0) return null;

            return (
              <section key={category} className="space-y-1.5">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#FAF6EF]/12">
                  <h2 className="font-display text-sm font-semibold text-[#FAF6EF]">{category}</h2>
                  <span className="text-xs font-mono text-[#9A8F83] tabular-nums">
                    {catItems.filter((i) => i.enabled && record.completedIds.includes(i.id)).length}/
                    {catItems.filter((i) => i.enabled).length}
                  </span>
                </div>

                <div className="divide-y divide-[#FAF6EF]/10">
                  {catItems.map((item) => {
                    const checked = record.completedIds.includes(item.id);
                    const isConfirmingDelete = pendingDeleteId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`py-3.5 flex items-start justify-between gap-3 transition-opacity ${
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
                            className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              checked
                                ? 'bg-[#17694F] border-[#3FA17F] text-[#FAF6EF]'
                                : 'border-[#FAF6EF]/25 bg-[#0A0807]/70 group-hover:border-[#3FA17F]/75'
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 stroke-[2.75]" />}
                          </span>

                          <div className="min-w-0">
                            <div
                              className={`text-sm font-medium transition-colors ${
                                checked ? 'text-[#82786D] line-through' : 'text-[#FAF6EF]'
                              }`}
                            >
                              {item.title}
                              {item.required && (
                                <span className="ml-2 text-[11px] font-mono text-[#3FA17F]">
                                  Required
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-[#9A8F83] mt-0.5 leading-relaxed">
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
                              className="px-2.5 py-1 text-[11px] font-mono rounded-xl border border-[#FAF6EF]/15 text-[#D5CBC0] hover:text-[#FAF6EF]"
                            >
                              {item.enabled ? 'Active' : 'Hidden'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(item)}
                              aria-label={`Edit ${item.title}`}
                              className="p-1.5 text-[#B7ADA0] hover:text-[#3FA17F] rounded-xl"
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
                                  className="px-2.5 py-1 text-[11px] font-medium bg-rose-500/20 text-rose-300 rounded-xl"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(null)}
                                  className="px-2 py-1 text-[11px] text-[#B7ADA0]"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteId(item.id)}
                                aria-label={`Delete ${item.title}`}
                                className="p-1.5 text-[#B7ADA0] hover:text-rose-400 rounded-xl"
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

        {/* Right Column: Luminous Liquid-Glass Session Plan Workbench */}
        <aside className="lg:col-span-5 liquid-glass rounded-[28px] p-6 sm:p-7 space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#FAF6EF]/15">
            <h2 className="font-display text-base font-semibold text-[#FAF6EF]">
              Session Plan &amp; Readiness
            </h2>
            {!isLocked && record.completedIds.length > 0 && (
              <button
                type="button"
                onClick={() => onSaveRecord({ ...record, completedIds: [] })}
                className="inline-flex items-center gap-1 text-xs text-[#B7ADA0] hover:text-[#FAF6EF]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Checks</span>
              </button>
            )}
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-2">Higher-Timeframe Bias</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Bullish', 'Neutral / Range', 'Bearish'] as const).map((bias) => {
                const active = record.marketBias === bias;
                return (
                  <button
                    key={bias}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('marketBias', bias)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-xl border transition-colors ${
                      active
                        ? bias === 'Bullish'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/45'
                          : bias === 'Bearish'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/45'
                          : 'bg-[#1C4C76]/55 text-[#FAF6EF] border-[#3571A5]/60'
                        : 'bg-[#0A0807]/55 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                    }`}
                  >
                    {bias}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-2">Economic Calendar Risk</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low / Clear', 'Medium Impact', 'High Impact'] as const).map((lvl) => {
                const active = record.newsImpact === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    disabled={isLocked}
                    onClick={() => updateRecordField('newsImpact', lvl)}
                    className={`py-2 px-2.5 text-xs font-medium rounded-xl border transition-colors ${
                      active
                        ? 'bg-[#0E4A38]/60 text-[#FAF6EF] border-[#258767]/55'
                        : 'bg-[#0A0807]/55 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-2">Today&apos;s Active Watchlist</label>
            <div className="flex flex-wrap gap-2">
              {watchlist.map((sym) => {
                const active = record.activeWatchlist.includes(sym);
                return (
                  <button
                    key={sym}
                    type="button"
                    disabled={isLocked}
                    onClick={() => toggleWatchlistInstrument(sym)}
                    className={`px-3 py-1.5 text-xs font-mono rounded-xl border transition-colors ${
                      active
                        ? 'bg-[#0E4A38]/60 text-[#FAF6EF] border-[#258767]/55'
                        : 'bg-[#0A0807]/55 text-[#B7ADA0] border-[#FAF6EF]/12 hover:text-[#FAF6EF]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1.5">
              Higher-Timeframe S/R &amp; Structure Levels
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.htfLevelsNote}
              onChange={(e) => updateRecordField('htfLevelsNote', e.target.value)}
              placeholder="e.g., Daily bullish OB 2642, Weekly high 2688..."
              className="tos-input w-full px-3.5 py-2.5 text-xs disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1.5">
              Liquidity Pools &amp; Draw on Liquidity
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              value={record.liquidityNote}
              onChange={(e) => updateRecordField('liquidityNote', e.target.value)}
              placeholder="e.g., Equal highs at 2678, Asian low sweep zone 2655..."
              className="tos-input w-full px-3.5 py-2.5 text-xs disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <label htmlFor="readiness-slider" className="text-[#B7ADA0]">
                Psychological Readiness Score
              </label>
              <span className="font-mono text-[#3FA17F] font-semibold tabular-nums">
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
              className="w-full accent-[#258767]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#B7ADA0] mb-1.5">Daily Execution Rules</label>
            <textarea
              rows={3}
              disabled={isLocked}
              value={record.notes}
              onChange={(e) => updateRecordField('notes', e.target.value)}
              placeholder="A+ triggers, invalidation rules, max loss stop..."
              className="tos-input w-full px-3.5 py-2.5 text-xs disabled:opacity-60"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
