import { OrbSessionConfig, TradingSession } from './types';

export interface SessionWindowStatus {
  name: TradingSession;
  city: string;
  openHourUtc: number;
  closeHourUtc: number;
  isOpen: boolean;
  minutesUntilChange: number;
  progressPct: number;
}

export interface OrbWindowStatus {
  id: string;
  sessionName: string;
  phase: 'Pending' | 'Forming Range' | 'Breakout Window' | 'Disabled';
  minutesRemainingInPhase: number;
  startLabelUtc: string;
  endRangeLabelUtc: string;
}

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0');
}

export function getMarketSessionSnapshot(now: Date = new Date()): {
  utcTimeLabel: string;
  isWeekend: boolean;
  sessions: SessionWindowStatus[];
  activeLabel: string;
  primarySession: TradingSession;
} {
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const totalMinutes = hour * 60 + minute;

  // Forex/Gold weekend closure: Friday 22:00 UTC to Sunday 22:00 UTC
  const isWeekend =
    day === 6 ||
    (day === 5 && totalMinutes >= 22 * 60) ||
    (day === 0 && totalMinutes < 22 * 60);

  const defs: Array<{ name: TradingSession; city: string; open: number; close: number }> = [
    { name: 'Asia', city: 'Tokyo', open: 0, close: 9 },
    { name: 'London', city: 'London', open: 7, close: 16 },
    { name: 'New York', city: 'New York', open: 12, close: 21 },
  ];

  const sessions: SessionWindowStatus[] = defs.map((d) => {
    const openMin = d.open * 60;
    const closeMin = d.close * 60;
    const isOpen = !isWeekend && totalMinutes >= openMin && totalMinutes < closeMin;

    let minutesUntilChange = 0;
    if (isOpen) {
      minutesUntilChange = closeMin - totalMinutes;
    } else if (totalMinutes < openMin) {
      minutesUntilChange = openMin - totalMinutes;
    } else {
      minutesUntilChange = 24 * 60 - totalMinutes + openMin;
    }

    const duration = closeMin - openMin;
    const progressPct = isOpen ? Math.min(100, Math.max(0, ((totalMinutes - openMin) / duration) * 100)) : 0;

    return {
      name: d.name,
      city: d.city,
      openHourUtc: d.open,
      closeHourUtc: d.close,
      isOpen,
      minutesUntilChange,
      progressPct: Number(progressPct.toFixed(1)),
    };
  });

  const londonOpen = sessions[1].isOpen;
  const nyOpen = sessions[2].isOpen;
  const asiaOpen = sessions[0].isOpen;

  let activeLabel = 'Off-Session';
  let primarySession: TradingSession = 'New York';

  if (isWeekend) {
    activeLabel = 'Market Closed (Weekend)';
    primarySession = 'New York';
  } else if (londonOpen && nyOpen) {
    activeLabel = 'London / NY Overlap';
    primarySession = 'London/NY Overlap';
  } else if (nyOpen) {
    activeLabel = 'New York Session';
    primarySession = 'New York';
  } else if (londonOpen) {
    activeLabel = 'London Session';
    primarySession = 'London';
  } else if (asiaOpen) {
    activeLabel = 'Asia Session';
    primarySession = 'Asia';
  }

  return {
    utcTimeLabel: `${pad2(hour)}:${pad2(minute)} UTC`,
    isWeekend,
    sessions,
    activeLabel,
    primarySession,
  };
}

export function evaluateOrbWindows(configs: OrbSessionConfig[], now: Date = new Date()): OrbWindowStatus[] {
  const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  return configs.map((cfg) => {
    const startMin = cfg.startHourUtc * 60 + cfg.startMinuteUtc;
    const endRangeMin = startMin + cfg.rangeDurationMinutes;
    const windowCloseMin = startMin + 240; // 4-hour active ORB execution horizon

    const startLabelUtc = `${pad2(cfg.startHourUtc)}:${pad2(cfg.startMinuteUtc)} UTC`;
    const endH = Math.floor(endRangeMin / 60) % 24;
    const endM = endRangeMin % 60;
    const endRangeLabelUtc = `${pad2(endH)}:${pad2(endM)} UTC`;

    if (!cfg.enabled) {
      return {
        id: cfg.id,
        sessionName: cfg.sessionName,
        phase: 'Disabled',
        minutesRemainingInPhase: 0,
        startLabelUtc,
        endRangeLabelUtc,
      };
    }

    if (totalMinutes >= startMin && totalMinutes < endRangeMin) {
      return {
        id: cfg.id,
        sessionName: cfg.sessionName,
        phase: 'Forming Range',
        minutesRemainingInPhase: endRangeMin - totalMinutes,
        startLabelUtc,
        endRangeLabelUtc,
      };
    }

    if (totalMinutes >= endRangeMin && totalMinutes < windowCloseMin) {
      return {
        id: cfg.id,
        sessionName: cfg.sessionName,
        phase: 'Breakout Window',
        minutesRemainingInPhase: windowCloseMin - totalMinutes,
        startLabelUtc,
        endRangeLabelUtc,
      };
    }

    const minutesUntilStart =
      totalMinutes < startMin ? startMin - totalMinutes : 24 * 60 - totalMinutes + startMin;

    return {
      id: cfg.id,
      sessionName: cfg.sessionName,
      phase: 'Pending',
      minutesRemainingInPhase: minutesUntilStart,
      startLabelUtc,
      endRangeLabelUtc,
    };
  });
}

export function formatMinutesAsClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
