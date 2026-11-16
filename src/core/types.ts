export type NavSection = 'home' | 'checklist' | 'dashboard' | 'trades';

export type TradingSession = 'Asia' | 'London' | 'New York' | 'London/NY Overlap';

export type TradeDirection = 'Long' | 'Short';

export type TradeStatus = 'Closed' | 'Open';

export type QualityGrade = 'A+' | 'A' | 'B' | 'C';

export type ChecklistCategory =
  | 'Market Conditions'
  | 'Economic News'
  | 'Trading Sessions'
  | 'Watchlist'
  | 'Higher Timeframe'
  | 'Key Levels & Liquidity'
  | 'Potential Setups'
  | 'Psychological Readiness';

export interface InstrumentSpec {
  symbol: string;
  name: string;
  assetClass: 'Metals' | 'Forex' | 'Indices' | 'Crypto';
  contractSize: number; // Units per 1.00 standard lot (e.g., XAUUSD = 100 oz, EURUSD = 100000, NAS100 = 1 or 20)
  pipSize: number; // Price movement equal to 1 pip/point (e.g., XAUUSD = 0.10, EURUSD = 0.0001, USDJPY = 0.01, NAS100 = 1.0)
  tickSize: number; // Minimum price increment (e.g., XAUUSD = 0.01)
  quoteValuePerUnitPerLot: number; // USD value change per 1.0 price move per 1.00 lot (for USD quote pairs = contractSize; for USDJPY approximated or converted)
  minLot: number;
  maxLot: number;
  lotStep: number;
  decimals: number;
}

export interface FundedChallengeRules {
  enabled: boolean;
  firmName: string;
  phaseName: string; // e.g. "Phase 1 Evaluation", "Phase 2 Verification", "Funded Live"
  profitTargetPct: number; // e.g. 8 or 10
  maxDailyLossPct: number; // e.g. 5
  maxTotalDrawdownPct: number; // e.g. 10
  minProfitableDays: number; // e.g. 5
  profitableDayMinPct: number; // e.g. 0.5% of initial balance counts as a profitable day
}

export interface TradingAccount {
  id: string;
  name: string;
  broker: string;
  currency: 'USD' | 'EUR' | 'GBP';
  startingBalance: number;
  defaultRiskPct: number;
  maxDailyTrades: number;
  fundedRules: FundedChallengeRules;
}

export interface TradeScreenshot {
  id: string;
  phase: 'Before' | 'After';
  dataUrl: string;
  caption: string;
  annotations: string[];
  createdAt: string;
}

export interface Trade {
  id: string;
  accountId: string;
  instrument: string;
  direction: TradeDirection;
  status: TradeStatus;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice?: number;
  lotSize: number;
  riskPct: number;
  riskAmount: number;
  potentialReward: number;
  plannedRR: number;
  actualPnL: number; // Net realized P&L in account currency (or unrealized if open)
  commission: number;
  swap: number;
  session: TradingSession;
  strategy: string;
  setupType: string;
  confluencesUsed: string[];
  entryTime: string; // ISO string
  exitTime?: string; // ISO string
  marketCondition: 'Trending' | 'Ranging' | 'High Volatility' | 'Consolidation' | 'News Driven';
  entryReasoning: string;
  emotion: 'Calm & Disciplined' | 'Focused' | 'Anxious' | 'FOMO' | 'Revenge' | 'Overconfident' | 'Hesitant';
  mistakes: string[];
  lessonsLearned: string;
  setupQuality: QualityGrade;
  executionQuality: QualityGrade;
  followedPlan: boolean;
  isRevengeTrade: boolean;
  screenshots: TradeScreenshot[];
  externalTicketId?: string; // For MT5 history deduplication
}

export interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  description: string;
  required: boolean;
  enabled: boolean;
}

export interface DailyChecklistRecord {
  date: string; // YYYY-MM-DD
  completedIds: string[];
  marketBias: 'Bullish' | 'Bearish' | 'Neutral / Range';
  newsImpact: 'High Impact' | 'Medium Impact' | 'Low / Clear';
  activeWatchlist: string[];
  htfLevelsNote: string;
  liquidityNote: string;
  readinessScore: number; // 1-10
  notes: string;
  lockedAt?: string;
}

export interface OrbSessionConfig {
  id: string;
  sessionName: string; // e.g., "New York Equity ORB", "London Open ORB", "Asia Range ORB"
  enabled: boolean;
  startHourUtc: number; // 0-23
  startMinuteUtc: number; // 0-59
  rangeDurationMinutes: number; // Default 15
  breakoutCondition: '1m Candle Close' | '5m Candle Close' | '15m Candle Close' | 'Wick Breach + Retest';
  entryConfirmation: 'FVG Retest' | 'CISD Confirmation' | 'Order Block Mitigation' | 'Immediate Momentum';
  stopLossPlacement: 'Opposite ORB Boundary' | 'ORB Midpoint (50%)' | 'Swing Structure High/Low' | 'Fixed ATR Multiple';
  takeProfitModel: 'Fixed 2R' | 'Fixed 3R' | 'Previous Session High/Low' | 'External Liquidity Pool';
  maxRetestMinutes: number;
}

export interface ConfluenceRule {
  id: string;
  name: string; // Liquidity Sweep, Fair Value Gap (FVG), Order Block, CISD, Inversion FVG (iFVG)
  shortCode: string;
  enabled: boolean;
  weight: number; // 1-5 importance
  ruleDescription: string;
}

export interface StrategyConfig {
  id: string;
  name: string;
  description: string;
  orbSessions: OrbSessionConfig[];
  confluences: ConfluenceRule[];
  minConfluencesRequired: number;
}

export interface TosAppState {
  version: number;
  selectedInstrument: string;
  activeAccountId: string;
  accounts: TradingAccount[];
  instruments: InstrumentSpec[];
  trades: Trade[];
  checklistItems: ChecklistItem[];
  checklistRecords: Record<string, DailyChecklistRecord>; // Keyed by YYYY-MM-DD
  strategies: StrategyConfig[];
  activeStrategyId: string;
  watchlist: string[];
}
