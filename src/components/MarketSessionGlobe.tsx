import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMinutesAsClock, SessionWindowStatus } from '../core/sessions';
import { TradingSession } from '../core/types';

interface MarketSessionGlobeProps {
  sessions: SessionWindowStatus[];
  utcTimeLabel: string;
}

interface HubNode {
  id: TradingSession;
  city: string;
  lat: number;
  lon: number;
  orbUtc: string;
}

const HUBS: HubNode[] = [
  { id: 'Asia', city: 'Tokyo', lat: 35.68, lon: 139.69, orbUtc: '00:00–00:15 UTC' },
  { id: 'London', city: 'London', lat: 51.51, lon: -0.13, orbUtc: '07:00–07:15 UTC' },
  { id: 'New York', city: 'New York', lat: 40.71, lon: -74.0, orbUtc: '13:30–13:45 UTC' },
];

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function projectPoint(
  latDeg: number,
  lonDeg: number,
  rotLonDeg: number,
  tiltDeg: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; z: number } {
  const lat = degToRad(latDeg);
  const lon = degToRad(lonDeg + rotLonDeg);
  const tilt = degToRad(tiltDeg);

  const x0 = Math.cos(lat) * Math.sin(lon);
  const y0 = Math.sin(lat);
  const z0 = Math.cos(lat) * Math.cos(lon);

  const y1 = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
  const z1 = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);

  return {
    x: cx + x0 * radius,
    y: cy - y1 * radius,
    z: z1,
  };
}

export function MarketSessionGlobe({ sessions, utcTimeLabel }: MarketSessionGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<TradingSession>(() => {
    const open = sessions.find((s) => s.isOpen);
    return open?.name || 'New York';
  });

  const [rotLon, setRotLon] = useState<number>(() => {
    const open = sessions.find((s) => s.isOpen);
    if (open?.name === 'Asia') return -130;
    if (open?.name === 'London') return 10;
    return 62;
  });

  const isDraggingRef = useRef(false);
  const lastXRef = useRef(0);

  const sessionMap = useMemo(() => {
    const m = new Map<TradingSession, SessionWindowStatus>();
    sessions.forEach((s) => m.set(s.name, s));
    return m;
  }, [sessions]);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      if (!isDraggingRef.current) {
        setRotLon((prev) => (prev + 0.35) % 360);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 276;
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 106;
    const tilt = 18;

    // Warm ivory & forest emerald ambient halo
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius * 1.28);
    halo.addColorStop(0, 'rgba(23, 105, 79, 0.16)');
    halo.addColorStop(0.6, 'rgba(255, 248, 236, 0.06)');
    halo.addColorStop(1, 'rgba(10, 8, 7, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.28, 0, Math.PI * 2);
    ctx.fill();

    // Warm espresso sphere base
    const sphereGrad = ctx.createRadialGradient(
      cx - radius * 0.32,
      cy - radius * 0.36,
      radius * 0.08,
      cx,
      cy,
      radius
    );
    sphereGrad.addColorStop(0, 'rgba(48, 39, 32, 0.85)');
    sphereGrad.addColorStop(0.68, 'rgba(22, 17, 14, 0.92)');
    sphereGrad.addColorStop(1, 'rgba(10, 8, 7, 0.98)');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Latitude parallels
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 6) {
        const pt = projectPoint(lat, lon, rotLon, tilt, radius, cx, cy);
        if (pt.z >= -0.05) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle =
        lat === 0 ? 'rgba(37, 135, 103, 0.36)' : 'rgba(255, 248, 236, 0.08)';
      ctx.lineWidth = lat === 0 ? 1.1 : 0.75;
      ctx.stroke();
    }

    // Longitude meridians
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -84; lat <= 84; lat += 6) {
        const pt = projectPoint(lat, lon, rotLon, tilt, radius, cx, cy);
        if (pt.z >= -0.05) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = 'rgba(255, 248, 236, 0.07)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    // Great-circle liquidity arcs
    const arcPairs: Array<[HubNode, HubNode]> = [
      [HUBS[0], HUBS[1]],
      [HUBS[1], HUBS[2]],
      [HUBS[2], HUBS[0]],
    ];

    for (const [a, b] of arcPairs) {
      const aOpen = sessionMap.get(a.id)?.isOpen;
      const bOpen = sessionMap.get(b.id)?.isOpen;
      const arcActive = aOpen && bOpen;

      ctx.beginPath();
      let started = false;
      const steps = 28;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const lat = a.lat + (b.lat - a.lat) * t + Math.sin(t * Math.PI) * 10;
        let dLon = b.lon - a.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        const lon = a.lon + dLon * t;
        const elev = 1 + Math.sin(t * Math.PI) * 0.06;
        const pt = projectPoint(lat, lon, rotLon, tilt, radius * elev, cx, cy);
        if (pt.z > -0.1) {
          if (!started) {
            ctx.moveTo(pt.x, pt.y);
            started = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          started = false;
        }
      }
      ctx.strokeStyle = arcActive
        ? 'rgba(46, 153, 116, 0.78)'
        : aOpen || bOpen
        ? 'rgba(53, 113, 165, 0.52)'
        : 'rgba(245, 239, 230, 0.16)';
      ctx.lineWidth = arcActive ? 1.6 : 1;
      ctx.stroke();
    }

    // Luminous ivory glass rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 249, 238, 0.28)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Financial center nodes
    for (const hub of HUBS) {
      const pt = projectPoint(hub.lat, hub.lon, rotLon, tilt, radius, cx, cy);
      if (pt.z < -0.15) continue;

      const isOpen = Boolean(sessionMap.get(hub.id)?.isOpen);
      const isSelected = selectedHubId === hub.id;
      const alpha = pt.z < 0.1 ? 0.42 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (isOpen || isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 10 : 7, 0, Math.PI * 2);
        ctx.fillStyle = isOpen ? 'rgba(37, 135, 103, 0.26)' : 'rgba(53, 113, 165, 0.25)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 4.3 : 3.3, 0, Math.PI * 2);
      ctx.fillStyle = isOpen ? '#2FA47C' : isSelected ? '#4682B4' : '#B7ADA0';
      ctx.fill();

      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isOpen ? '#FAF6EF' : '#B7ADA0';
      ctx.fillText(hub.city, pt.x + 8, pt.y + 3);
      ctx.restore();
    }
  }, [rotLon, sessions, sessionMap, selectedHubId]);

  const focusHub = (hub: HubNode) => {
    setSelectedHubId(hub.id);
    setRotLon(-hub.lon);
  };

  const selectedHub = HUBS.find((h) => h.id === selectedHubId) || HUBS[2];
  const selectedStatus = sessionMap.get(selectedHub.id);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Interactive Drag-to-Rotate Canvas Sphere */}
      <div className="relative shrink-0">
        <canvas
          ref={canvasRef}
          data-testid="market-session-globe"
          style={{ width: 276, height: 276 }}
          onPointerDown={(e) => {
            isDraggingRef.current = true;
            lastXRef.current = e.clientX;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!isDraggingRef.current) return;
            const dx = e.clientX - lastXRef.current;
            lastXRef.current = e.clientX;
            setRotLon((prev) => prev + dx * 0.6);
          }}
          onPointerUp={() => {
            isDraggingRef.current = false;
          }}
          onPointerCancel={() => {
            isDraggingRef.current = false;
          }}
          aria-label="Interactive global market session globe — drag to rotate"
          className="cursor-grab active:cursor-grabbing touch-none select-none"
        />
        <div className="mt-1 text-center text-[11px] font-mono text-[#9A8F83]">
          Drag globe · {utcTimeLabel}
        </div>
      </div>

      {/* Hub Selector & Real-Time Telemetry */}
      <div className="flex-1 w-full space-y-4">
        <div className="flex items-center gap-2 border-b border-[#FAF6EF]/15 pb-2.5">
          {HUBS.map((hub) => {
            const st = sessionMap.get(hub.id);
            const active = selectedHubId === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => focusHub(hub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[#0E4A38]/55 text-[#FAF6EF] border border-[#258767]/45'
                    : 'text-[#B7ADA0] hover:text-[#FAF6EF] hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <span>{hub.city}</span>
                <span
                  className={`ml-1.5 font-mono text-[10px] ${
                    st?.isOpen ? 'text-emerald-400' : 'text-[#82786D]'
                  }`}
                >
                  {st?.isOpen ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="text-[#B7ADA0]">Liquidity Center</span>
            <span className="font-display text-sm font-semibold text-[#FAF6EF]">
              {selectedHub.city} ({selectedHub.id})
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-[#B7ADA0] font-sans">Session State</span>
            <span className={selectedStatus?.isOpen ? 'text-emerald-400' : 'text-[#9A8F83]'}>
              {selectedStatus?.isOpen
                ? `Open · Closes in ${formatMinutesAsClock(selectedStatus.minutesUntilChange)}`
                : `Closed · Opens in ${formatMinutesAsClock(
                    selectedStatus?.minutesUntilChange || 0
                  )}`}
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono tabular-nums">
            <span className="text-[#B7ADA0] font-sans">15m ORB Window</span>
            <span className="text-[#F5EFE6]">{selectedHub.orbUtc}</span>
          </div>

          <div className="pt-1">
            <div className="h-2 w-full bg-[#0A0807]/60 border border-[#FAF6EF]/12 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0E4A38] via-[#258767] to-[#3571A5] transition-all duration-300"
                style={{ width: `${selectedStatus?.isOpen ? selectedStatus.progressPct : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
