import { Calculator, Layers, Plus, SlidersHorizontal } from 'lucide-react';
import { NavSection } from '../core/types';

interface TopNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  selectedInstrument: string;
  watchlist: string[];
  onSelectInstrument: (symbol: string) => void;
  activeSessionLabel: string;
  utcTimeLabel: string;
  onOpenNewTrade: () => void;
  onOpenTool: (tab: 'risk' | 'strategy' | 'accounts') => void;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'trades', label: 'Trades' },
];

export function TopNav({
  activeSection,
  onNavigate,
  selectedInstrument,
  watchlist,
  onSelectInstrument,
  activeSessionLabel,
  utcTimeLabel,
  onOpenNewTrade,
  onOpenTool,
}: TopNavProps) {
  return (
    <header className="fixed top-3 inset-x-0 z-40 px-3 sm:px-6 lg:px-10 pointer-events-none">
      <div className="mx-auto max-w-[1440px] liquid-glass-nav rounded-[22px] pointer-events-auto overflow-hidden">
        <div className="flex h-14 items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6">
          {/* Far Left: Refined Geometric Emblem + Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767] rounded-xl px-1 py-1"
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="text-[#F5EFE6] group-hover:text-white transition-colors"
            >
              <path
                d="M12 2.5L20.5 19.5H16L12 11.2L8 19.5H3.5L12 2.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M8.5 16H15.5" stroke="#258767" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="font-display text-base font-semibold tracking-tight text-[#FAF6EF]">
              Axiom TOS
            </span>
          </button>

          {/* Center: Integrated Live Telemetry & Instrument Selector */}
          <div
            className="hidden xl:flex items-center gap-3.5 text-xs font-mono tabular-nums whitespace-nowrap shrink-0"
            aria-label="Live market telemetry and focus instruments"
          >
            <span className="text-[#3571A5] font-medium">{utcTimeLabel}</span>
            <span aria-hidden="true" className="text-[#5C534A]">
              /
            </span>
            <span className="font-sans text-[#D5CBC0]">{activeSessionLabel}</span>
            <span aria-hidden="true" className="text-[#5C534A]">
              /
            </span>
            <div className="flex items-center gap-2" role="group" aria-label="Watchlist instrument selector">
              {watchlist.map((sym) => {
                const active = sym === selectedInstrument;
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => onSelectInstrument(sym)}
                    aria-pressed={active}
                    className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? 'text-[#FAF6EF] font-semibold bg-[#0E4A38]/45 border border-[#258767]/45'
                        : 'text-[#8C8276] hover:text-[#F5EFE6]'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Far Right: Primary Navigation + Workstation Tools */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide whitespace-nowrap shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767] ${
                      isActive
                        ? 'text-[#FAF6EF] bg-[#0E4A38]/55 border border-[#258767]/45 shadow-[inset_0_1px_0_rgba(255,252,245,0.24)]'
                        : 'text-[#B7ADA0] hover:text-[#FAF6EF] hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="hidden md:block h-4 w-px bg-[#FAF6EF]/15" aria-hidden="true" />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenTool('risk')}
                aria-label="Open Position Size Calculator"
                title="Risk Calculator"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[#D5CBC0] hover:text-[#FAF6EF] hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
              >
                <Calculator className="w-3.5 h-3.5 text-[#258767]" />
                <span>Risk</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenTool('strategy')}
                aria-label="Open ORB Strategy Configurator"
                title="15m ORB Strategy"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-[#D5CBC0] hover:text-[#FAF6EF] hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-[#3571A5]" />
                <span>ORB</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenTool('accounts')}
                aria-label="Open Accounts, Ledger and Backup Settings"
                title="Accounts, Cash Ledger & Backup"
                className="inline-flex items-center justify-center p-2 rounded-xl text-[#B7ADA0] hover:text-[#FAF6EF] hover:bg-white/[0.07] transition-colors shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onOpenNewTrade}
                className="btn-emerald-glass inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#FAF6EF] rounded-xl whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Trade</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Strip (<= 768px) */}
        <nav
          aria-label="Mobile navigation"
          className="flex md:hidden items-center justify-around border-t border-[#FAF6EF]/12 px-2 py-1.5 gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-medium whitespace-nowrap text-center transition-colors ${
                  isActive
                    ? 'bg-[#0E4A38]/55 text-[#FAF6EF] border border-[#258767]/40'
                    : 'text-[#B7ADA0] hover:text-[#FAF6EF]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
