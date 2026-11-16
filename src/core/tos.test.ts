import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePositionSize } from './risk';
import { computeAnalytics, getHeatmapTier } from './analytics';
import { parseMt5HistoryCsv } from './mt5Parser';
import { evaluateOrbWindows, getMarketSessionSnapshot } from './sessions';
import { DEFAULT_ACCOUNTS, DEFAULT_INSTRUMENTS, DEFAULT_STRATEGIES, createInitialSeedState } from './seed';
import { exportBackupJson, parseBackupJson } from './storage';
import { Trade } from './types';

test('Position size calculator computes accurate XAUUSD lot size and RR', () => {
  const xau = DEFAULT_INSTRUMENTS.find((i) => i.symbol === 'XAUUSD')!;
  const res = calculatePositionSize({
    accountBalance: 100000,
    riskPct: 1,
    entryPrice: 2650.0,
    stopLoss: 2645.0,
    takeProfit: 2665.0,
    direction: 'Long',
    instrument: xau,
  });

  // $1,000 risk / ($5 move * 100 oz/lot) = 2.00 lots
  assert.equal(res.valid, true);
  assert.equal(res.riskAmount, 1000);
  assert.equal(res.stopDistancePrice, 5);
  assert.equal(res.stopDistancePips, 50);
  assert.equal(res.lotSize, 2);
  assert.equal(res.potentialLoss, 1000);
  assert.equal(res.potentialReward, 3000);
  assert.equal(res.riskRewardRatio, 3);
});

test('Position size calculator computes accurate EURUSD lot size and rejects invalid SL side', () => {
  const eurusd = DEFAULT_INSTRUMENTS.find((i) => i.symbol === 'EURUSD')!;
  const validShort = calculatePositionSize({
    accountBalance: 50000,
    riskPct: 1,
    entryPrice: 1.085,
    stopLoss: 1.0875, // 25 pips
    takeProfit: 1.08, // 50 pips
    direction: 'Short',
    instrument: eurusd,
  });

  // $500 risk / (0.0025 * 100000) = 500 / 250 = 2.00 lots
  assert.equal(validShort.valid, true);
  assert.equal(validShort.lotSize, 2);
  assert.equal(validShort.stopDistancePips, 25);
  assert.equal(validShort.riskRewardRatio, 2);

  const invalidLong = calculatePositionSize({
    accountBalance: 50000,
    riskPct: 1,
    entryPrice: 1.085,
    stopLoss: 1.0875,
    direction: 'Long',
    instrument: eurusd,
  });
  assert.equal(invalidLong.valid, false);
  assert.ok(invalidLong.errors.length > 0);
});

test('Analytics engine calculates net P&L, drawdown, streaks, funded progress, and psychology accurately', () => {
  const account = DEFAULT_ACCOUNTS[0]; // 100k FTMO, 10% target ($10,000), 5% daily ($5,000), 10% max dd ($10,000), 4 prof days >= $500
  const refDate = new Date('2026-11-15T14:00:00.000Z');

  const trades: Trade[] = [
    {
      id: 't1',
      accountId: account.id,
      instrument: 'XAUUSD',
      direction: 'Long',
      status: 'Closed',
      entryPrice: 2640,
      stopLoss: 2635,
      takeProfit: 2655,
      exitPrice: 2655,
      lotSize: 1,
      riskPct: 0.5,
      riskAmount: 500,
      potentialReward: 1500,
      plannedRR: 3,
      actualPnL: 1500,
      commission: 0,
      swap: 0,
      session: 'New York',
      strategy: '15m ORB',
      setupType: 'NY ORB',
      confluencesUsed: ['FVG'],
      entryTime: '2026-11-10T13:45:00.000Z',
      exitTime: '2026-11-10T14:45:00.000Z',
      marketCondition: 'Trending',
      entryReasoning: 'Test',
      emotion: 'Calm & Disciplined',
      mistakes: [],
      lessonsLearned: '',
      setupQuality: 'A+',
      executionQuality: 'A+',
      followedPlan: true,
      isRevengeTrade: false,
      screenshots: [],
    },
    {
      id: 't2',
      accountId: account.id,
      instrument: 'XAUUSD',
      direction: 'Short',
      status: 'Closed',
      entryPrice: 2660,
      stopLoss: 2665,
      takeProfit: 2650,
      exitPrice: 2665,
      lotSize: 1,
      riskPct: 0.5,
      riskAmount: 500,
      potentialReward: 1000,
      plannedRR: 2,
      actualPnL: -500,
      commission: 0,
      swap: 0,
      session: 'London',
      strategy: '15m ORB',
      setupType: 'Fade',
      confluencesUsed: [],
      entryTime: '2026-11-15T08:00:00.000Z',
      exitTime: '2026-11-15T08:30:00.000Z',
      marketCondition: 'Ranging',
      entryReasoning: 'Test',
      emotion: 'Revenge',
      mistakes: ['Revenge Trade'],
      lessonsLearned: '',
      setupQuality: 'C',
      executionQuality: 'C',
      followedPlan: false,
      isRevengeTrade: true,
      screenshots: [],
    },
  ];

  const stats = computeAnalytics(trades, account, refDate);
  assert.equal(stats.closedTrades, 2);
  assert.equal(stats.wins, 1);
  assert.equal(stats.losses, 1);
  assert.equal(stats.winRate, 50);
  assert.equal(stats.netPnL, 1000);
  assert.equal(stats.currentBalance, 101000);
  assert.equal(stats.profitFactor, 3);
  assert.equal(stats.dailyPnL, -500);
  assert.equal(stats.monthlyPnL, 1000);
  assert.equal(stats.maxDrawdownAbs, 500);
  assert.equal(stats.averageHoldMinutes, 45);
  assert.equal(stats.psychology.planAdherenceRate, 50);
  assert.equal(stats.psychology.revengeTradesCount, 1);
  assert.equal(stats.fundedProgress.profitTargetProgressPct, 10); // $1000 / $10000
  assert.equal(stats.fundedProgress.dailyLossUsedPct, 10); // $500 / $5000
  assert.equal(stats.fundedProgress.profitableDaysAchieved, 1);
});

test('MT5 CSV parser extracts valid trades and skips duplicates', () => {
  const csv = [
    'Position,Symbol,Type,Volume,Open Time,Open Price,S/L,T/P,Close Time,Close Price,Commission,Swap,Profit',
    '88101,XAUUSD,buy,1.50,2026.11.14 13:45:00,2650.00,2645.00,2660.00,2026.11.14 14:30:00,2660.00,-10.50,0.00,1500.00',
    '88102,NAS100,sell,5.00,2026.11.14 15:00:00,20500.0,20540.0,20420.0,2026.11.14 15:20:00,20540.0,-5.00,0.00,-200.00',
  ].join('\n');

  const res = parseMt5HistoryCsv(csv, 'acc-funded-100k', 100000, new Set(['88102']));
  assert.equal(res.errors.length, 0);
  assert.equal(res.trades.length, 1);
  assert.equal(res.skippedRows, 1);
  assert.equal(res.trades[0].instrument, 'XAUUSD');
  assert.equal(res.trades[0].direction, 'Long');
  assert.equal(res.trades[0].actualPnL, 1489.5);
  assert.equal(res.trades[0].session, 'London/NY Overlap');
});

test('Session snapshot and ORB window evaluator detect NY 15m ORB formation accurately', () => {
  // Friday Nov 13, 2026 at 13:37 UTC -> Inside London/NY Overlap & NY Equity 15m ORB Forming Range
  const now = new Date('2026-11-13T13:37:00.000Z');
  const snap = getMarketSessionSnapshot(now);
  assert.equal(snap.isWeekend, false);
  assert.equal(snap.activeLabel, 'London / NY Overlap');

  const orbWindows = evaluateOrbWindows(DEFAULT_STRATEGIES[0].orbSessions, now);
  const nyOrb = orbWindows.find((w) => w.id === 'orb-ny')!;
  assert.equal(nyOrb.phase, 'Forming Range');
  assert.equal(nyOrb.minutesRemainingInPhase, 8);
});

test('Backup export and import roundtrip validates state', () => {
  const seed = createInitialSeedState('2026-11-15');
  const exported = exportBackupJson(seed);
  const imported = parseBackupJson(exported);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.state.trades.length, seed.trades.length);
    assert.equal(imported.state.selectedInstrument, 'XAUUSD');
  }
});

test('Heatmap intensity tiers scale green and red days proportionally', () => {
  assert.deepEqual(getHeatmapTier(2000, 2000, 1000), { direction: 'profit', tier: 4 });
  assert.deepEqual(getHeatmapTier(1100, 2000, 1000), { direction: 'profit', tier: 3 });
  assert.deepEqual(getHeatmapTier(600, 2000, 1000), { direction: 'profit', tier: 2 });
  assert.deepEqual(getHeatmapTier(200, 2000, 1000), { direction: 'profit', tier: 1 });

  assert.deepEqual(getHeatmapTier(-900, 2000, 1000), { direction: 'loss', tier: 4 });
  assert.deepEqual(getHeatmapTier(-300, 2000, 1000), { direction: 'loss', tier: 2 });
  assert.deepEqual(getHeatmapTier(0, 2000, 1000), { direction: 'flat', tier: 0 });
});
