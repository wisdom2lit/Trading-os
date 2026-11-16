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
import { PWAInstallButton } from './PWAInstallButton';

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
    `group relative flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD36A] ${
      isActive
        ? 'glass-control-active text-[#FAF6EE]'
        : 'text-[#C9BA9E] hover:text-[#FAF6EE] hover:bg-[#E8D7A8]/[0.06] border border-transparent'
    }`;

  return (
    <footer className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 px-2.5 sm:px-6 lg:px-10 pointer-events-none">
      <div className="mx-auto max-w-[1260px] glass-dock rounded-[26px] pointer-events-auto">
        <div className="relative z-10 flex items-center justify-between gap-1.5 sm:gap-4 px-2 sm:px-5 py-2">
          {/* Far Left (Desktop): Brand Mark & Live Session Telemetry */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="inline-flex items-center gap-2 text-left whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD36A] rounded-xl px-1.5 py-1"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="text-[#E8D7A8] group-hover:text-[#FFD36A] transition-colors"
              >
                <path
                  d="M12 2.5L20.5 19.5H16L12 11.2L8 19.5H3.5L12 2.5Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M8.5 16H15.5" stroke="#FFD36A" strokeWidth="2.1" strokeLinecap="round" />
              </svg>
              <span className="font-display text-sm font-extrabold tracking-tight text-[#FAF6EE]">
                Axiom TOS
              </span>
            </button>

            <span className="h-4 w-px bg-[#E8D7A8]/20" aria-hidden="true" />

            <div
              className="hidden xl:flex items-center gap-2 text-xs font-mono font-bold tabular-nums whitespace-nowrap"
              aria-label="Live market session telemetry"
            >
              <span className="text-[#FFD36A]">{utcTimeLabel}</span>
              <span aria-hidden="true" className="text-[#E8D7A8]/35">
                ·
              </span>
              <span className="font-sans font-bold text-[#E8D7A8]">{activeSessionLabel}</span>
            </div>
          </div>

          {/* Center: Bottom Navigation Dock + Standout Electric-Lime Log Trade CTA */}
          <nav
            aria-label="Primary navigation"
            className="flex flex-1 lg:flex-initial items-center justify-around sm:justify-center gap-0.5 sm:gap-1.5"
          >
            <button
              type="button"
              onClick={() => onNavigate('home')}
              aria-current={activeSection === 'home' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'home')}
            >
              <Home
                className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${
                  activeSection === 'home' ? 'text-[#FFD36A]' : ''
                }`}
              />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('checklist')}
              aria-current={activeSection === 'checklist' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'checklist')}
            >
              <CheckSquare
                className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${
                  activeSection === 'checklist' ? 'text-[#FFD36A]' : ''
                }`}
              />
              <span>Checklist</span>
            </button>

            {/* Primary Action: Prominent Elevated Electric-Lime Log Trade Button */}
            <button
              type="button"
              onClick={onOpenNewTrade}
              aria-label="Log Trade"
              className="glass-log-trade-hero inline-flex items-center justify-center gap-2 h-[54px] sm:h-12 px-5 sm:px-7 rounded-2xl text-xs sm:text-sm font-extrabold tracking-wide whitespace-nowrap shrink-0 mx-0.5 sm:mx-2.5 -my-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FAF6EE]"
            >
              <Plus className="w-5 h-5 sm:w-[18px] sm:h-[18px] stroke-[3]" />
              <span className="hidden sm:inline">Log Trade</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              aria-current={activeSection === 'dashboard' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'dashboard')}
            >
              <BarChart3
                className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${
                  activeSection === 'dashboard' ? 'text-[#FFD36A]' : ''
                }`}
              />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('trades')}
              aria-current={activeSection === 'trades' ? 'page' : undefined}
              className={navButtonClass(activeSection === 'trades')}
            >
              <BookOpen
                className={`w-[18px] h-[18px] sm:w-4 sm:h-4 ${
                  activeSection === 'trades' ? 'text-[#FFD36A]' : ''
                }`}
              />
              <span>Trades</span>
            </button>
          </nav>

          {/* Far Right (Desktop/Tablet): Liquid Glass Workstation Tools */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenTool('risk')}
              aria-label="Open Position Size Calculator"
              title="Risk Calculator"
              className="glass-control inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
            >
              <Calculator className="w-3.5 h-3.5 text-[#FFD36A]" />
              <span className="hidden xl:inline">Risk</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTool('strategy')}
              aria-label="Open ORB Strategy Configurator"
              title="15m ORB Strategy"
              className="glass-control inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0"
            >
              <Layers className="w-3.5 h-3.5 text-[#FFD36A]" />
              <span className="hidden xl:inline">ORB</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenTool('accounts')}
              aria-label="Open Accounts, Ledger and Backup Settings"
              title="Accounts, Cash Ledger & Backup"
              className="glass-control inline-flex items-center justify-center p-2.5 rounded-xl shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#FFD36A]" />
            </button>

            <PWAInstallButton compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
