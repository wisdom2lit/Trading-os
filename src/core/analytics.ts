import {
  AccountTransaction,
  Trade,
  TradeDirection,
  TradingAccount,
  TradingSession,
} from './types';

export interface EquityPoint {
  index: number;
  tradeId: string;
  kind: 'start' | 'trade' | 'deposit' | 'withdrawal';
  label: string;
  dateIso: string;
  instrument: string;
  pnl: number;
  balance: number;
  drawdownAbs: number;
  drawdownPct: number;
}

export interface DailyCalendarStats {
  date: string;
  pnl: number;
  tradesCount: number;
  wins: number;
  losses: number;
  breakevens: number;
}

export interface GroupBreakdown {
  key: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnL: number;
  profitFactor: number;
  avgRR: number;
}

export interface FundedAccountProgress {
  enabled: boolean;
  firmName: string;
  phaseName: string;
  profitTargetAmount: number;
  currentProfitAmount: number;
  profitTargetProgressPct: number;
  maxDailyLossAmount: number;
  todayPnL: number;
  dailyLossUsedPct: number;
  dailyLossRemaining: number;
  maxTotalDrawdownAmount: number;
  currentDrawdownFromStartOrPeak: number;
  totalDrawdownUsedPct: number;
  totalDrawdownRemaining: number;
  minProfitableDays: number;
  profitableDaysAchieved: number;
  profitableDayThresholdAmount: number;
  status: 'Target Reached' | 'Active' | 'Daily Limit Breached' | 'Max Drawdown Breached';
}

export interface PsychologyAnalytics {
  planAdherenceRate: number;
  followedPlanPnL: number;
  brokenPlanPnL: number;
  revengeTradesCount: number;
  revengeTradesPnL: number;
  overtradingDaysCount: number;
  byEmotion: GroupBreakdown[];
  topMistakes: Array<{ mistake: string; count: number; totalPnL: number }>;
  bySetupQuality: GroupBreakdown[];
}

export interface PerformanceAnalytics {
  hasAccount: boolean;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  wins: number;
  losses: number;
  breakevens: number;
  startingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netCashFlow: number;
  capitalBase: number;
  currentBalance: number;
  currentEquity: number;
  netPnL: number;
  netReturnPct: number;
  grossProfit: number;
  grossLoss: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  averagePlannedRR: number;
  averageRealizedR: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  maxDrawdownAbs: number;
  maxDrawdownPct: number;
  currentDrawdownAbs: number;
  currentDrawdownPct: number;
  consistencyScore: number;
  averageHoldMinutes: number;
  longestWinStreak: number;
  longestLossStreak: number;
  currentStreak: { type: 'Win' | 'Loss' | 'None'; count: number };
  equityCurve: EquityPoint[];
  dailyCalendar: Record<string, DailyCalendarStats>;
  bySession: GroupBreakdown[];
  byInstrument: GroupBreakdown[];
  byStrategy: GroupBreakdown[];
  byDirection: GroupBreakdown[];
  strongestSession: GroupBreakdown | null;
  weakestSession: GroupBreakdown | null;
  mostProfitableInstrument: GroupBreakdown | null;
  mostProfitableStrategy: GroupBreakdown | null;
  fundedProgress: FundedAccountProgress;
  psychology: PsychologyAnalytics;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function getStartOfUtcWeek(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setUTCDate(copy.getUTCDate() - diff);
  return copy;
}

function buildGroupBreakdown(groups: Map<string, Trade[]>): GroupBreakdown[] {
  const results: GroupBreakdown[] = [];
  for (const [key, list] of groups.entries()) {
    const closed = list.filter((t) => t.status === 'Closed');
    const wins = closed.filter((t) => t.actualPnL > 0);
    const losses = closed.filter((t) => t.actualPnL < 0);
    const grossWin = wins.reduce((acc, t) => acc + t.actualPnL, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.actualPnL, 0));
    const netPnL = closed.reduce((acc, t) => acc + t.actualPnL, 0);
    const avgRR =
      closed.length > 0
        ? closed.reduce((acc, t) => acc + (t.riskAmount > 0 ? t.actualPnL / t.riskAmount : t.plannedRR), 0) /
          closed.length
        : 0;

    results.push({
      key,
      trades: closed.length,
      wins: wins.length,
      losses: losses.length,
      winRate: closed.length > 0 ? Number(((wins.length / closed.length) * 100).toFixed(1)) : 0,
      netPnL: Number(netPnL.toFixed(2)),
      profitFactor:
        grossLoss > 0 ? Number((grossWin / grossLoss).toFixed(2)) : grossWin > 0 ? 99.9 : 0,
      avgRR: Number(avgRR.toFixed(2)),
    });
  }
  return results.sort((a, b) => b.netPnL - a.netPnL);
}

export function createZeroAnalytics(): PerformanceAnalytics {
  return {
    hasAccount: false,
    totalTrades: 0,
    closedTrades: 0,
    openTrades: 0,
    wins: 0,
    losses: 0,
    breakevens: 0,
    startingBalance: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    netCashFlow: 0,
    capitalBase: 0,
    currentBalance: 0,
    currentEquity: 0,
    netPnL: 0,
    netReturnPct: 0,
    grossProfit: 0,
    grossLoss: 0,
    dailyPnL: 0,
    weeklyPnL: 0,
    monthlyPnL: 0,
    winRate: 0,
    profitFactor: 0,
    expectancy: 0,
    averagePlannedRR: 0,
    averageRealizedR: 0,
    averageWin: 0,
    averageLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    maxDrawdownAbs: 0,
    maxDrawdownPct: 0,
    currentDrawdownAbs: 0,
    currentDrawdownPct: 0,
    consistencyScore: 0,
    averageHoldMinutes: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    currentStreak: { type: 'None', count: 0 },
    equityCurve: [],
    dailyCalendar: {},
    bySession: [],
    byInstrument: [],
    byStrategy: [],
    byDirection: [],
    strongestSession: null,
    weakestSession: null,
    mostProfitableInstrument: null,
    mostProfitableStrategy: null,
    fundedProgress: {
      enabled: false,
      firmName: 'No Account Connected',
      phaseName: 'Unconnected',
      profitTargetAmount: 0,
      currentProfitAmount: 0,
      profitTargetProgressPct: 0,
      maxDailyLossAmount: 0,
      todayPnL: 0,
      dailyLossUsedPct: 0,
      dailyLossRemaining: 0,
      maxTotalDrawdownAmount: 0,
      currentDrawdownFromStartOrPeak: 0,
      totalDrawdownUsedPct: 0,
      totalDrawdownRemaining: 0,
      minProfitableDays: 0,
      profitableDaysAchieved: 0,
      profitableDayThresholdAmount: 0,
      status: 'Active',
    },
    psychology: {
      planAdherenceRate: 0,
      followedPlanPnL: 0,
      brokenPlanPnL: 0,
      revengeTradesCount: 0,
      revengeTradesPnL: 0,
      overtradingDaysCount: 0,
      byEmotion: [],
      topMistakes: [],
      bySetupQuality: [],
    },
  };
}

export function computeAnalytics(
  trades: Trade[],
  account: TradingAccount | null | undefined,
  transactions: AccountTransaction[] = [],
  referenceDate: Date = new Date()
): PerformanceAnalytics {
  if (!account) {
    return createZeroAnalytics();
  }

  const accountTrades = trades.filter((t) => t.accountId === account.id);
  const closedTrades = accountTrades
    .filter((t) => t.status === 'Closed')
    .sort((a, b) => {
      const ta = new Date(a.exitTime || a.entryTime).getTime();
      const tb = new Date(b.exitTime || b.entryTime).getTime();
      return ta - tb;
    });
  const openTrades = accountTrades.filter((t) => t.status === 'Open');

  const accountTransactions = transactions
    .filter((tx) => tx.accountId === account.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const tx of accountTransactions) {
    const mag = Math.abs(tx.amount);
    if (tx.type === 'Deposit' || tx.type === 'Adjustment') {
      totalDeposits += tx.type === 'Adjustment' && tx.amount < 0 ? 0 : mag;
      if (tx.type === 'Adjustment' && tx.amount < 0) {
        totalWithdrawals += mag;
      }
    } else if (tx.type === 'Withdrawal' || tx.type === 'Fee') {
      totalWithdrawals += mag;
    }
  }

  totalDeposits = Number(totalDeposits.toFixed(2));
  totalWithdrawals = Number(totalWithdrawals.toFixed(2));
  const netCashFlow = Number((totalDeposits - totalWithdrawals).toFixed(2));

  const startingBalance = Number(account.startingBalance.toFixed(2));
  const capitalBase = Number((startingBalance + totalDeposits).toFixed(2));
  const realizedNetPnL = closedTrades.reduce((acc, t) => acc + t.actualPnL, 0);
  const openFloatingPnL = openTrades.reduce((acc, t) => acc + t.actualPnL, 0);

  const currentBalance = Number((startingBalance + netCashFlow + realizedNetPnL).toFixed(2));
  const currentEquity = Number((currentBalance + openFloatingPnL).toFixed(2));

  const wins = closedTrades.filter((t) => t.actualPnL > 0);
  const losses = closedTrades.filter((t) => t.actualPnL < 0);
  const breakevens = closedTrades.filter((t) => t.actualPnL === 0);

  const grossProfit = Number(wins.reduce((acc, t) => acc + t.actualPnL, 0).toFixed(2));
  const grossLoss = Number(Math.abs(losses.reduce((acc, t) => acc + t.actualPnL, 0)).toFixed(2));

  const winRate =
    closedTrades.length > 0 ? Number(((wins.length / closedTrades.length) * 100).toFixed(1)) : 0;
  const profitFactor =
    grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const averageWin = wins.length > 0 ? Number((grossProfit / wins.length).toFixed(2)) : 0;
  const averageLoss = losses.length > 0 ? Number((grossLoss / losses.length).toFixed(2)) : 0;
  const expectancy =
    closedTrades.length > 0 ? Number((realizedNetPnL / closedTrades.length).toFixed(2)) : 0;

  const largestWin = wins.length > 0 ? Math.max(...wins.map((t) => t.actualPnL)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map((t) => t.actualPnL)) : 0;

  const averagePlannedRR =
    closedTrades.length > 0
      ? Number(
          (closedTrades.reduce((acc, t) => acc + t.plannedRR, 0) / closedTrades.length).toFixed(2)
        )
      : 0;

  const rMultiples = closedTrades
    .filter((t) => t.riskAmount > 0)
    .map((t) => t.actualPnL / t.riskAmount);
  const averageRealizedR =
    rMultiples.length > 0
      ? Number((rMultiples.reduce((acc, r) => acc + r, 0) / rMultiples.length).toFixed(2))
      : 0;

  const todayKey = toDateKey(referenceDate.toISOString());
  const weekStartMs = getStartOfUtcWeek(referenceDate).getTime();
  const monthPrefix = todayKey.slice(0, 7);

  let dailyPnL = 0;
  let weeklyPnL = 0;
  let monthlyPnL = 0;

  // Build unified chronological ledger events (trades + cash flows) for accurate equity curve
  // while tracking trading drawdown independently from external deposits/withdrawals.
  type LedgerEvent =
    | { kind: 'trade'; ts: number; dateIso: string; trade: Trade }
    | { kind: 'tx'; ts: number; dateIso: string; tx: AccountTransaction };

  const events: LedgerEvent[] = [
    ...closedTrades.map((trade) => {
      const iso = trade.exitTime || trade.entryTime;
      return { kind: 'trade' as const, ts: new Date(iso).getTime(), dateIso: iso, trade };
    }),
    ...accountTransactions.map((tx) => ({
      kind: 'tx' as const,
      ts: new Date(tx.timestamp).getTime(),
      dateIso: tx.timestamp,
      tx,
    })),
  ].sort((a, b) => a.ts - b.ts);

  let runningBalance = startingBalance;
  let tradingHighWater = startingBalance;
  let maxDrawdownAbs = 0;
  let maxDrawdownPct = 0;
  let currentDrawdownAbs = 0;
  let currentDrawdownPct = 0;

  const equityCurve: EquityPoint[] = [
    {
      index: 0,
      tradeId: 'initial',
      kind: 'start',
      label: 'Start',
      dateIso: events[0]?.dateIso || referenceDate.toISOString(),
      instrument: 'Account',
      pnl: 0,
      balance: startingBalance,
      drawdownAbs: 0,
      drawdownPct: 0,
    },
  ];

  let tradeSeq = 0;
  for (const ev of events) {
    if (ev.kind === 'tx') {
      const signed =
        ev.tx.type === 'Deposit'
          ? Math.abs(ev.tx.amount)
          : ev.tx.type === 'Adjustment'
          ? ev.tx.amount
          : -Math.abs(ev.tx.amount);
      runningBalance = Number((runningBalance + signed).toFixed(2));
      // Shift high-water mark proportionally with external cash flows so deposits/withdrawals aren't distorted as trading DD
      tradingHighWater = Math.max(0, Number((tradingHighWater + signed).toFixed(2)));
      if (runningBalance > tradingHighWater) {
        tradingHighWater = runningBalance;
      }
      currentDrawdownAbs = Number(Math.max(0, tradingHighWater - runningBalance).toFixed(2));
      currentDrawdownPct =
        tradingHighWater > 0
          ? Number(((currentDrawdownAbs / tradingHighWater) * 100).toFixed(2))
          : 0;

      equityCurve.push({
        index: equityCurve.length,
        tradeId: ev.tx.id,
        kind: signed >= 0 ? 'deposit' : 'withdrawal',
        label: ev.tx.type,
        dateIso: ev.dateIso,
        instrument: ev.tx.type,
        pnl: signed,
        balance: runningBalance,
        drawdownAbs: currentDrawdownAbs,
        drawdownPct: currentDrawdownPct,
      });
    } else {
      tradeSeq += 1;
      const trade = ev.trade;
      runningBalance = Number((runningBalance + trade.actualPnL).toFixed(2));
      if (runningBalance > tradingHighWater) {
        tradingHighWater = runningBalance;
      }
      const ddAbs = Number(Math.max(0, tradingHighWater - runningBalance).toFixed(2));
      const ddPct =
        tradingHighWater > 0 ? Number(((ddAbs / tradingHighWater) * 100).toFixed(2)) : 0;
      if (ddAbs > maxDrawdownAbs) maxDrawdownAbs = ddAbs;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;
      currentDrawdownAbs = ddAbs;
      currentDrawdownPct = ddPct;

      equityCurve.push({
        index: equityCurve.length,
        tradeId: trade.id,
        kind: 'trade',
        label: `#${tradeSeq} · ${trade.instrument}`,
        dateIso: ev.dateIso,
        instrument: trade.instrument,
        pnl: trade.actualPnL,
        balance: runningBalance,
        drawdownAbs: ddAbs,
        drawdownPct: ddPct,
      });
    }
  }

  const dailyCalendar: Record<string, DailyCalendarStats> = {};
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let activeWinStreak = 0;
  let activeLossStreak = 0;
  let totalHoldMinutes = 0;
  let holdCount = 0;

  closedTrades.forEach((trade) => {
    const closeIso = trade.exitTime || trade.entryTime;
    const closeKey = toDateKey(closeIso);
    const closeMs = new Date(closeIso).getTime();

    if (closeKey === todayKey) dailyPnL += trade.actualPnL;
    if (closeMs >= weekStartMs) weeklyPnL += trade.actualPnL;
    if (closeKey.startsWith(monthPrefix)) monthlyPnL += trade.actualPnL;

    if (!dailyCalendar[closeKey]) {
      dailyCalendar[closeKey] = {
        date: closeKey,
        pnl: 0,
        tradesCount: 0,
        wins: 0,
        losses: 0,
        breakevens: 0,
      };
    }
    dailyCalendar[closeKey].pnl = Number((dailyCalendar[closeKey].pnl + trade.actualPnL).toFixed(2));
    dailyCalendar[closeKey].tradesCount += 1;
    if (trade.actualPnL > 0) dailyCalendar[closeKey].wins += 1;
    else if (trade.actualPnL < 0) dailyCalendar[closeKey].losses += 1;
    else dailyCalendar[closeKey].breakevens += 1;

    if (trade.actualPnL > 0) {
      activeWinStreak += 1;
      activeLossStreak = 0;
      if (activeWinStreak > longestWinStreak) longestWinStreak = activeWinStreak;
    } else if (trade.actualPnL < 0) {
      activeLossStreak += 1;
      activeWinStreak = 0;
      if (activeLossStreak > longestLossStreak) longestLossStreak = activeLossStreak;
    }

    if (trade.exitTime && trade.entryTime) {
      const diffMin =
        (new Date(trade.exitTime).getTime() - new Date(trade.entryTime).getTime()) / 60000;
      if (Number.isFinite(diffMin) && diffMin >= 0) {
        totalHoldMinutes += diffMin;
        holdCount += 1;
      }
    }
  });

  let currentStreak: { type: 'Win' | 'Loss' | 'None'; count: number } = { type: 'None', count: 0 };
  if (activeWinStreak > 0) currentStreak = { type: 'Win', count: activeWinStreak };
  else if (activeLossStreak > 0) currentStreak = { type: 'Loss', count: activeLossStreak };

  const positiveDays = Object.values(dailyCalendar).filter((d) => d.pnl > 0);
  let consistencyScore = 0;
  if (positiveDays.length > 0 && grossProfit > 0) {
    const totalDayProfits = positiveDays.reduce((acc, d) => acc + d.pnl, 0);
    const maxSingleDayProfit = Math.max(...positiveDays.map((d) => d.pnl));
    const concentrationRatio = totalDayProfits > 0 ? maxSingleDayProfit / totalDayProfits : 1;
    consistencyScore =
      positiveDays.length === 1
        ? 50
        : Number(Math.max(0, Math.min(100, (1 - concentrationRatio) * 115)).toFixed(1));
  }

  const sessionMap = new Map<TradingSession, Trade[]>();
  const instrumentMap = new Map<string, Trade[]>();
  const strategyMap = new Map<string, Trade[]>();
  const directionMap = new Map<TradeDirection, Trade[]>();
  const emotionMap = new Map<string, Trade[]>();
  const setupQualityMap = new Map<string, Trade[]>();
  const mistakeStats = new Map<string, { count: number; totalPnL: number }>();

  let followedPlanCount = 0;
  let followedPlanPnL = 0;
  let brokenPlanPnL = 0;
  let revengeTradesCount = 0;
  let revengeTradesPnL = 0;

  for (const t of closedTrades) {
    sessionMap.set(t.session, [...(sessionMap.get(t.session) || []), t]);
    instrumentMap.set(t.instrument, [...(instrumentMap.get(t.instrument) || []), t]);
    strategyMap.set(t.strategy, [...(strategyMap.get(t.strategy) || []), t]);
    directionMap.set(t.direction, [...(directionMap.get(t.direction) || []), t]);
    emotionMap.set(t.emotion, [...(emotionMap.get(t.emotion) || []), t]);
    setupQualityMap.set(t.setupQuality, [...(setupQualityMap.get(t.setupQuality) || []), t]);

    if (t.followedPlan) {
      followedPlanCount += 1;
      followedPlanPnL += t.actualPnL;
    } else {
      brokenPlanPnL += t.actualPnL;
    }

    if (t.isRevengeTrade || t.emotion === 'Revenge') {
      revengeTradesCount += 1;
      revengeTradesPnL += t.actualPnL;
    }

    for (const m of t.mistakes) {
      if (!m || m === 'None') continue;
      const existing = mistakeStats.get(m) || { count: 0, totalPnL: 0 };
      mistakeStats.set(m, {
        count: existing.count + 1,
        totalPnL: Number((existing.totalPnL + t.actualPnL).toFixed(2)),
      });
    }
  }

  const bySession = buildGroupBreakdown(sessionMap);
  const byInstrument = buildGroupBreakdown(instrumentMap);
  const byStrategy = buildGroupBreakdown(strategyMap);
  const byDirection = buildGroupBreakdown(directionMap);
  const byEmotion = buildGroupBreakdown(emotionMap);
  const bySetupQuality = buildGroupBreakdown(setupQualityMap);

  const overtradingDaysCount = Object.values(dailyCalendar).filter(
    (d) => d.tradesCount > account.maxDailyTrades
  ).length;

  const topMistakes = Array.from(mistakeStats.entries())
    .map(([mistake, data]) => ({ mistake, count: data.count, totalPnL: data.totalPnL }))
    .sort((a, b) => b.count - a.count);

  const fr = account.fundedRules;
  const fundedBasis = startingBalance > 0 ? startingBalance : capitalBase;
  const profitTargetAmount = Number(((fundedBasis * fr.profitTargetPct) / 100).toFixed(2));
  const maxDailyLossAmount = Number(((fundedBasis * fr.maxDailyLossPct) / 100).toFixed(2));
  const maxTotalDrawdownAmount = Number(
    ((fundedBasis * fr.maxTotalDrawdownPct) / 100).toFixed(2)
  );
  const profitableDayThresholdAmount = Number(
    ((fundedBasis * fr.profitableDayMinPct) / 100).toFixed(2)
  );

  const profitableDaysAchieved = Object.values(dailyCalendar).filter(
    (d) => d.pnl >= profitableDayThresholdAmount && profitableDayThresholdAmount > 0
  ).length;

  const dailyLossAmountToday = dailyPnL < 0 ? Math.abs(dailyPnL) : 0;
  const dailyLossUsedPct =
    maxDailyLossAmount > 0
      ? Number(Math.min(100, (dailyLossAmountToday / maxDailyLossAmount) * 100).toFixed(1))
      : 0;
  const dailyLossRemaining = Number(Math.max(0, maxDailyLossAmount - dailyLossAmountToday).toFixed(2));

  const totalDrawdownFromStart = Math.max(0, fundedBasis - (fundedBasis + realizedNetPnL));
  const effectiveDrawdown = Math.max(totalDrawdownFromStart, currentDrawdownAbs);
  const totalDrawdownUsedPct =
    maxTotalDrawdownAmount > 0
      ? Number(Math.min(100, (effectiveDrawdown / maxTotalDrawdownAmount) * 100).toFixed(1))
      : 0;
  const totalDrawdownRemaining = Number(
    Math.max(0, maxTotalDrawdownAmount - effectiveDrawdown).toFixed(2)
  );

  const profitTargetProgressPct =
    profitTargetAmount > 0
      ? Number(Math.max(0, Math.min(100, (realizedNetPnL / profitTargetAmount) * 100)).toFixed(1))
      : 0;

  let fundedStatus: FundedAccountProgress['status'] = 'Active';
  if (dailyLossAmountToday >= maxDailyLossAmount && maxDailyLossAmount > 0) {
    fundedStatus = 'Daily Limit Breached';
  } else if (effectiveDrawdown >= maxTotalDrawdownAmount && maxTotalDrawdownAmount > 0) {
    fundedStatus = 'Max Drawdown Breached';
  } else if (
    profitTargetAmount > 0 &&
    realizedNetPnL >= profitTargetAmount &&
    profitableDaysAchieved >= fr.minProfitableDays
  ) {
    fundedStatus = 'Target Reached';
  }

  return {
    hasAccount: true,
    totalTrades: accountTrades.length,
    closedTrades: closedTrades.length,
    openTrades: openTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakevens: breakevens.length,
    startingBalance,
    totalDeposits,
    totalWithdrawals,
    netCashFlow,
    capitalBase,
    currentBalance,
    currentEquity,
    netPnL: Number(realizedNetPnL.toFixed(2)),
    netReturnPct:
      capitalBase > 0 ? Number(((realizedNetPnL / capitalBase) * 100).toFixed(2)) : 0,
    grossProfit,
    grossLoss,
    dailyPnL: Number(dailyPnL.toFixed(2)),
    weeklyPnL: Number(weeklyPnL.toFixed(2)),
    monthlyPnL: Number(monthlyPnL.toFixed(2)),
    winRate,
    profitFactor,
    expectancy,
    averagePlannedRR,
    averageRealizedR,
    averageWin,
    averageLoss,
    largestWin,
    largestLoss,
    maxDrawdownAbs,
    maxDrawdownPct,
    currentDrawdownAbs,
    currentDrawdownPct,
    consistencyScore,
    averageHoldMinutes: holdCount > 0 ? Math.round(totalHoldMinutes / holdCount) : 0,
    longestWinStreak,
    longestLossStreak,
    currentStreak,
    equityCurve,
    dailyCalendar,
    bySession,
    byInstrument,
    byStrategy,
    byDirection,
    strongestSession: bySession[0] || null,
    weakestSession: bySession.length > 1 ? bySession[bySession.length - 1] : null,
    mostProfitableInstrument: byInstrument[0] || null,
    mostProfitableStrategy: byStrategy[0] || null,
    fundedProgress: {
      enabled: fr.enabled,
      firmName: fr.firmName,
      phaseName: fr.phaseName,
      profitTargetAmount,
      currentProfitAmount: Number(realizedNetPnL.toFixed(2)),
      profitTargetProgressPct,
      maxDailyLossAmount,
      todayPnL: Number(dailyPnL.toFixed(2)),
      dailyLossUsedPct,
      dailyLossRemaining,
      maxTotalDrawdownAmount,
      currentDrawdownFromStartOrPeak: Number(effectiveDrawdown.toFixed(2)),
      totalDrawdownUsedPct,
      totalDrawdownRemaining,
      minProfitableDays: fr.minProfitableDays,
      profitableDaysAchieved,
      profitableDayThresholdAmount,
      status: fundedStatus,
    },
    psychology: {
      planAdherenceRate:
        closedTrades.length > 0
          ? Number(((followedPlanCount / closedTrades.length) * 100).toFixed(1))
          : 0,
      followedPlanPnL: Number(followedPlanPnL.toFixed(2)),
      brokenPlanPnL: Number(brokenPlanPnL.toFixed(2)),
      revengeTradesCount,
      revengeTradesPnL: Number(revengeTradesPnL.toFixed(2)),
      overtradingDaysCount,
      byEmotion,
      topMistakes,
      bySetupQuality,
    },
  };
}

export type HeatmapIntensityTier = 0 | 1 | 2 | 3 | 4;

export function getHeatmapTier(
  pnl: number,
  maxProfit: number,
  maxLossAbs: number
): { direction: 'profit' | 'loss' | 'flat'; tier: HeatmapIntensityTier } {
  if (pnl > 0) {
    const ratio = maxProfit > 0 ? pnl / maxProfit : 1;
    const tier: HeatmapIntensityTier =
      ratio >= 0.75 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
    return { direction: 'profit', tier };
  }
  if (pnl < 0) {
    const abs = Math.abs(pnl);
    const ratio = maxLossAbs > 0 ? abs / maxLossAbs : 1;
    const tier: HeatmapIntensityTier =
      ratio >= 0.75 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
    return { direction: 'loss', tier };
  }
  return { direction: 'flat', tier: 0 };
}
