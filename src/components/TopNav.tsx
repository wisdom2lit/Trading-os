import { Calculator, Layers, Plus, SlidersHorizontal } from 'lucide-react';
import { NavSection } from '../core/types';

interface TopNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  selectedInstrument: string;
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
  activeSessionLabel,
  utcTimeLabel,
  onOpenNewTrade,
  onOpenTool,
}: TopNavProps) {
  return (
    <header className="fixed top-0 inset-x-0 z-40 border-b border-white/[0.08] bg-[#050505]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="font-display text-lg font-semibold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-[#00BFFF] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/60 rounded"
        >
          Axiom TOS
        </button>

        {/* Center: Unboxed Navigation + Market/Instrument Context */}
        <div className="hidden md:flex items-center gap-8">
          <nav aria-label="Primary navigation" className="flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-4 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]/60 ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#00BFFF] to-[#8A2BE2]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div
            className="hidden xl:flex items-center gap-2.5 pl-6 border-l border-white/[0.08] text-xs text-slate-400 font-mono tabular-nums whitespace-nowrap shrink-0"
            aria-label="Active session and selected instrument"
          >
            <span className="text-slate-200 font-medium">{selectedInstrument}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span>{activeSessionLabel}</span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <span className="text-[#00BFFF]">{utcTimeLabel}</span>
          </div>
        </div>

        {/* Right: Essential Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenTool('risk')}
            aria-label="Open Position Size Calculator"
            title="Risk Calculator"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Calculator className="w-3.5 h-3.5 text-[#00BFFF]" />
            <span>Risk</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenTool('strategy')}
            aria-label="Open ORB Strategy Configurator"
            title="15m ORB Strategy"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-[#8A2BE2]" />
            <span>ORB</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenTool('accounts')}
            aria-label="Open Accounts and Backup Settings"
            title="Accounts & Backup"
            className="inline-flex items-center justify-center p-2 text-slate-300 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenNewTrade}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] hover:opacity-95 rounded-md transition-opacity whitespace-nowrap shrink-0 accent-glow-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00BFFF]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Trade</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Strip (<= 768px) */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-around border-t border-white/[0.06] bg-[#050505]/95 px-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative py-2.5 px-3 text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-white' : 'text-slate-400'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-1 bottom-0 h-[2px] bg-gradient-to-r from-[#00BFFF] to-[#8A2BE2]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
