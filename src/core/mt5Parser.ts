import { Trade, TradingSession } from './types';

export interface Mt5ParseResult {
  trades: Trade[];
  skippedRows: number;
  errors: string[];
}

function inferSessionFromUtcHour(hour: number): TradingSession {
  if (hour >= 12 && hour < 16) return 'London/NY Overlap';
  if (hour >= 7 && hour < 16) return 'London';
  if (hour >= 12 && hour < 21) return 'New York';
  return 'Asia';
}

function parseMt5Date(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // MT5 format often looks like "2026.11.12 14:32:10" or ISO "2026-11-12T14:32:10"
  const normalized = trimmed.replace(/\./g, '-').replace(' ', 'T');
  const withZ = normalized.endsWith('Z') || normalized.includes('+') ? normalized : `${normalized}Z`;
  const d = new Date(withZ);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses standard MetaTrader 5 Position History CSV/TSV exports.
 * Supports flexible column naming: Time/Open Time, Position/Ticket, Symbol, Type, Volume, Price, S/L, T/P, Close Time, Close Price, Commission, Swap, Profit.
 */
export function parseMt5HistoryCsv(
  rawText: string,
  accountId: string,
  accountBalance: number,
  existingTicketIds: Set<string> = new Set()
): Mt5ParseResult {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return {
      trades: [],
      skippedRows: 0,
      errors: ['Input must contain a header row and at least one trade row.'],
    };
  }

  const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map((h) => h.toLowerCase());

  const findCol = (candidates: string[]): number =>
    headers.findIndex((h) => candidates.some((c) => h === c || h.includes(c)));

  const colSymbol = findCol(['symbol', 'instrument', 'asset']);
  const colType = findCol(['type', 'direction', 'side']);
  const colVolume = findCol(['volume', 'lots', 'lot']);
  const colOpenTime = findCol(['open time', 'entry time', 'time']);
  const colCloseTime = findCol(['close time', 'exit time']);
  const colOpenPrice = findCol(['open price', 'entry price', 'price']);
  const colClosePrice = findCol(['close price', 'exit price']);
  const colSl = findCol(['s/l', 'sl', 'stop loss']);
  const colTp = findCol(['t/p', 'tp', 'take profit']);
  const colProfit = findCol(['profit', 'pnl', 'net profit']);
  const colCommission = findCol(['commission', 'comm']);
  const colSwap = findCol(['swap']);
  const colTicket = findCol(['position', 'ticket', 'order', 'id']);

  if (colSymbol === -1 || colType === -1 || colProfit === -1) {
    return {
      trades: [],
      skippedRows: lines.length - 1,
      errors: ['Missing required MT5 columns (Symbol, Type, Profit).'],
    };
  }

  const trades: Trade[] = [];
  const errors: string[] = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    const symbol = (cells[colSymbol] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const rawType = (cells[colType] || '').toLowerCase();

    if (!symbol || (!rawType.includes('buy') && !rawType.includes('sell') && !rawType.includes('long') && !rawType.includes('short'))) {
      skippedRows += 1;
      continue;
    }

    const ticket = colTicket !== -1 ? cells[colTicket] : `mt5-${i}-${symbol}`;
    if (ticket && existingTicketIds.has(ticket)) {
      skippedRows += 1;
      continue;
    }

    const direction = rawType.includes('buy') || rawType.includes('long') ? 'Long' : 'Short';
    const lotSize = parseFloat((cells[colVolume] || '0.01').replace(/\s+/g, '')) || 0.01;
    const entryPrice = parseFloat((cells[colOpenPrice] || '0').replace(/\s+/g, '')) || 0;
    const exitPrice = colClosePrice !== -1 ? parseFloat((cells[colClosePrice] || '0').replace(/\s+/g, '')) || undefined : undefined;
    const stopLoss = colSl !== -1 ? parseFloat((cells[colSl] || '0').replace(/\s+/g, '')) || 0 : 0;
    const takeProfit = colTp !== -1 ? parseFloat((cells[colTp] || '0').replace(/\s+/g, '')) || 0 : 0;
    const rawProfit = parseFloat((cells[colProfit] || '0').replace(/\s+/g, '')) || 0;
    const commission = colCommission !== -1 ? parseFloat((cells[colCommission] || '0').replace(/\s+/g, '')) || 0 : 0;
    const swap = colSwap !== -1 ? parseFloat((cells[colSwap] || '0').replace(/\s+/g, '')) || 0 : 0;
    const netPnL = Number((rawProfit + commission + swap).toFixed(2));

    const entryTime =
      (colOpenTime !== -1 ? parseMt5Date(cells[colOpenTime] || '') : null) ||
      new Date().toISOString();
    const exitTime =
      (colCloseTime !== -1 ? parseMt5Date(cells[colCloseTime] || '') : null) || entryTime;

    const slDistance = stopLoss > 0 && entryPrice > 0 ? Math.abs(entryPrice - stopLoss) : 0;
    const tpDistance = takeProfit > 0 && entryPrice > 0 ? Math.abs(takeProfit - entryPrice) : 0;
    const plannedRR = slDistance > 0 && tpDistance > 0 ? Number((tpDistance / slDistance).toFixed(2)) : 2;
    const estRiskAmount =
      accountBalance > 0 ? Number((accountBalance * 0.01).toFixed(2)) : Math.abs(netPnL) || 100;

    const hour = new Date(entryTime).getUTCHours();

    trades.push({
      id: `mt5-${ticket || Date.now()}-${i}`,
      accountId,
      instrument: symbol,
      direction,
      status: 'Closed',
      entryPrice,
      stopLoss: stopLoss || entryPrice,
      takeProfit: takeProfit || entryPrice,
      exitPrice,
      lotSize,
      riskPct: 1,
      riskAmount: estRiskAmount,
      potentialReward: Number((estRiskAmount * plannedRR).toFixed(2)),
      plannedRR,
      actualPnL: netPnL,
      commission,
      swap,
      session: inferSessionFromUtcHour(hour),
      strategy: 'Imported MT5',
      setupType: 'MT5 Execution',
      confluencesUsed: [],
      entryTime,
      exitTime,
      marketCondition: 'Trending',
      entryReasoning: 'Imported from MetaTrader 5 trade history.',
      emotion: 'Calm & Disciplined',
      mistakes: [],
      lessonsLearned: '',
      setupQuality: 'A',
      executionQuality: 'A',
      followedPlan: true,
      isRevengeTrade: false,
      screenshots: [],
      externalTicketId: ticket,
    });
  }

  if (trades.length === 0 && errors.length === 0) {
    errors.push('No valid Buy/Sell trade rows were found in the file.');
  }

  return { trades, skippedRows, errors };
}
