import {
  BarChart3,
  BookOpen,
  Calculator,
  CheckSquare,
  Home,
  Layers,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import { NavSection } from '../core/types';

interface BottomNavProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  activeSessionLabel: string;
  utcTimeLabel: string;
  onOpenNewTrade: () => void;
  onOpenTool: (tab: 'risk' | 'strategy' | 'accounts') => void;
}

export function BottomNav({
  activeSection,
  onNavigate,
  activeSessionLabel,
  utcTimeLabel,
  onOpenNewTrade,
  onOpenTool,
}: BottomNavProps) {
  const navButtonClass = (isActive: boolean) =>
    `group relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767] ${
      isActive
        ? 'text-[#FAF6EF] bg-[#0E4A38]/60 border border-[#258767]/50 shadow-[inset_0_1px_0_rgba(255,252,245,0.28)]'
        : 'text-[#B7ADA0] hover:text-[#FAF6EF] hover:bg-white/[0.06] border border-transparent'
    }`;

  return (
    <footer className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 px-3 sm:px-6 lg:px-10 pointer-events-none">
      <div className="mx-auto max-w-[1160px] liquid-glass-nav rounded-[24px] pointer-events-auto">
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-2 sm:px-5 py-1.5 sm:py-2">
          {/* Far Left (Desktop): Brand Mark & Live Session Telemetry */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-left whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767] rounded-xl px-1.5 py-1"
            >
              <svg
                width="17"
                height="17"
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
              <span className="font-display text-sm font-semibold tracking-tight text-[#FAF6EF]">
                Axiom TOS
              </span>
            </button>

            <span className="h-4 w-px bg-[#FAF6EF]/15" aria-hidden="true" />

            <div
              className="hidden xl:flex items-center gap-2 text-[11px] font-mono tabular-nums whitespace-nowrap"
              aria-label="Live market session telemetry"
            >
              <span className="text-[#3571A5] font-medium">{utcTimeLabel}</span>
              <span aria-hidden="true" className="text-[#5C534A]">
                ·
              </span>
              <span className="font-sans text-[#D5CBC0]">{activeSessionLabel}</span>
            </div>
          </div>

          {/* Center: TikTok / Instagram-Style Primary Navigation + Center Create CTA */}
          <nav
            aria-label="Primary navigation"
            className="flex flex-1 lg:flex-initial items-center justify-around sm:justify-center gap-1 sm:gap-1.5"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-current={activeSection === 'home' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'home')}
            >
              <Home className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('checklist')}
              aria-current={activeSection === 'checklist' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'checklist')}
            >
              <CheckSquare className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              <span>Checklist</span>
            </button>

            {/* Center Primary Action (TikTok / Instagram '+' Create Style) */}
            <button
              type="button"
              onClick={onOpenNewTrade}
              aria-label="Log Trade"
              className="btn-emerald-glass inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-4 sm:px-4 rounded-2xl text-xs font-semibold text-[#FAF6EF] whitespace-nowrap shrink-0 mx-0.5 sm:mx-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#258767]"
            >
              <Plus className="w-4 h-4 stroke-[2.4]" />
              <span className="hidden sm:inline">Log Trade</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              aria-current={activeSection === 'dashboard' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'dashboard')}
            >
              <BarChart3 className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('trades')}
              aria-current={activeSection === 'trades' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'trades')}
            >
              <BookOpen className="w-[18px] h-[18px] sm:w-4 sm:h-4" />
              <span>Trades</span>
            </button>
          </nav>

          {/* Far Right (Tablet/Desktop): Workstation Quick Tools */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onOpenTool('risk')}
              aria-label="Open Position Size Calculator"
              title="Risk Calculator"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-[#D5CBC0] hover:text-[#FAF6EF] hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
            >
              <Calculator className="w-3.5 h-3.5 text-[#3FA17F]" />
              <span className="hidden xl:inline">Risk</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTool('strategy')}
              aria-label="Open ORB Strategy Configurator"
              title="15m ORB Strategy"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-[#D5CBC0] hover:text-[#FAF6EF] hover:bg-white/[0.07] transition-colors whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#3571A5]" />
              <span className="hidden xl:inline">ORB</span>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
