import { InstrumentSpec, TradeDirection } from './types';

export interface PositionSizeInput {
  accountBalance: number;
  riskPct: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit?: number;
  direction: TradeDirection;
  instrument: InstrumentSpec;
  conversionRateToAccount?: number; // Default 1 for USD-quoted instruments (e.g. XAUUSD, EURUSD, NAS100)
}

export interface PositionSizeResult {
  valid: boolean;
  errors: string[];
  riskAmount: number;
  stopDistancePrice: number;
  stopDistancePips: number;
  takeProfitDistancePrice: number;
  takeProfitDistancePips: number;
  rawLotSize: number;
  lotSize: number;
  potentialLoss: number;
  potentialReward: number;
  riskRewardRatio: number;
  dollarPerPipAtLotSize: number;
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) return value;
  const inv = Math.round(1 / step);
  return Math.floor(value * inv + 1e-9) / inv;
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const errors: string[] = [];
  const {
    accountBalance,
    riskPct,
    entryPrice,
    stopLoss,
    takeProfit,
    direction,
    instrument,
    conversionRateToAccount = 1,
  } = input;

  if (!Number.isFinite(accountBalance) || accountBalance <= 0) {
    errors.push('Account balance must be greater than zero.');
  }
  if (!Number.isFinite(riskPct) || riskPct <= 0 || riskPct > 100) {
    errors.push('Risk percentage must be between 0.01% and 100%.');
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    errors.push('Entry price must be greater than zero.');
  }
  if (!Number.isFinite(stopLoss) || stopLoss <= 0) {
    errors.push('Stop loss must be greater than zero.');
  }
  if (entryPrice === stopLoss) {
    errors.push('Stop loss cannot equal entry price.');
  }

  if (Number.isFinite(entryPrice) && Number.isFinite(stopLoss) && entryPrice > 0 && stopLoss > 0) {
    if (direction === 'Long' && stopLoss >= entryPrice) {
      errors.push('For a Long trade, Stop Loss must be below Entry Price.');
    }
    if (direction === 'Short' && stopLoss <= entryPrice) {
      errors.push('For a Short trade, Stop Loss must be above Entry Price.');
    }
  }

  if (takeProfit !== undefined && Number.isFinite(takeProfit) && takeProfit > 0) {
    if (direction === 'Long' && takeProfit <= entryPrice) {
      errors.push('For a Long trade, Take Profit must be above Entry Price.');
    }
    if (direction === 'Short' && takeProfit >= entryPrice) {
      errors.push('For a Short trade, Take Profit must be below Entry Price.');
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      riskAmount: 0,
      stopDistancePrice: 0,
      stopDistancePips: 0,
      takeProfitDistancePrice: 0,
      takeProfitDistancePips: 0,
      rawLotSize: 0,
      lotSize: 0,
      potentialLoss: 0,
      potentialReward: 0,
      riskRewardRatio: 0,
      dollarPerPipAtLotSize: 0,
    };
  }

  const riskAmount = accountBalance * (riskPct / 100);
  const stopDistancePrice = Math.abs(entryPrice - stopLoss);
  const stopDistancePips = stopDistancePrice / instrument.pipSize;

  // Value per 1.0 price unit per 1.00 standard lot in account currency
  const valuePerPriceUnitPerLot = instrument.quoteValuePerUnitPerLot * conversionRateToAccount;
  const riskPerStandardLot = stopDistancePrice * valuePerPriceUnitPerLot;

  const rawLotSize = riskPerStandardLot > 0 ? riskAmount / riskPerStandardLot : 0;
  const steppedLot = roundToStep(rawLotSize, instrument.lotStep);
  const lotSize = Math.min(instrument.maxLot, Math.max(instrument.minLot, steppedLot));

  const potentialLoss = lotSize * riskPerStandardLot;

  let takeProfitDistancePrice = 0;
  let takeProfitDistancePips = 0;
  let potentialReward = 0;
  let riskRewardRatio = 0;

  if (takeProfit !== undefined && Number.isFinite(takeProfit) && takeProfit > 0) {
    takeProfitDistancePrice = Math.abs(takeProfit - entryPrice);
    takeProfitDistancePips = takeProfitDistancePrice / instrument.pipSize;
    potentialReward = lotSize * takeProfitDistancePrice * valuePerPriceUnitPerLot;
    riskRewardRatio = stopDistancePrice > 0 ? takeProfitDistancePrice / stopDistancePrice : 0;
  }

  const dollarPerPipAtLotSize = lotSize * instrument.pipSize * valuePerPriceUnitPerLot;

  return {
    valid: true,
    errors: [],
    riskAmount: Number(riskAmount.toFixed(2)),
    stopDistancePrice: Number(stopDistancePrice.toFixed(instrument.decimals)),
    stopDistancePips: Number(stopDistancePips.toFixed(1)),
    takeProfitDistancePrice: Number(takeProfitDistancePrice.toFixed(instrument.decimals)),
    takeProfitDistancePips: Number(takeProfitDistancePips.toFixed(1)),
    rawLotSize: Number(rawLotSize.toFixed(4)),
    lotSize: Number(lotSize.toFixed(2)),
    potentialLoss: Number(potentialLoss.toFixed(2)),
    potentialReward: Number(potentialReward.toFixed(2)),
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    dollarPerPipAtLotSize: Number(dollarPerPipAtLotSize.toFixed(2)),
  };
}
