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
        setRotLon((prev) => (prev + 0.3) % 360);
      }
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = 400;
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 152;
    const tilt = 18;

    // Seamless ambient liquid halo (Glowing Gold + Rich Espresso + Pale Gold fading into #050505)
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.32);
    halo.addColorStop(0, 'rgba(255, 211, 106, 0.14)');
    halo.addColorStop(0.45, 'rgba(36, 24, 15, 0.36)');
    halo.addColorStop(0.78, 'rgba(232, 215, 168, 0.05)');
    halo.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.32, 0, Math.PI * 2);
    ctx.fill();

    // Obsidian & Warm Espresso liquid crystal sphere core
    const sphereGrad = ctx.createRadialGradient(
      cx - radius * 0.34,
      cy - radius * 0.36,
      radius * 0.08,
      cx,
      cy,
      radius
    );
    sphereGrad.addColorStop(0, 'rgba(64, 42, 26, 0.88)');
    sphereGrad.addColorStop(0.55, 'rgba(22, 15, 10, 0.94)');
    sphereGrad.addColorStop(1, 'rgba(5, 5, 5, 0.98)');
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Glossy optical specular dome highlight inside upper-left hemisphere
    const glassArc = ctx.createRadialGradient(
      cx - radius * 0.42,
      cy - radius * 0.44,
      6,
      cx - radius * 0.2,
      cy - radius * 0.2,
      radius * 0.88
    );
    glassArc.addColorStop(0, 'rgba(255, 248, 224, 0.22)');
    glassArc.addColorStop(0.35, 'rgba(232, 215, 168, 0.09)');
    glassArc.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = glassArc;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle secondary bottom-right liquid rim bounce
    const rimBounce = ctx.createRadialGradient(
      cx + radius * 0.48,
      cy + radius * 0.5,
      4,
      cx + radius * 0.35,
      cy + radius * 0.35,
      radius * 0.65
    );
    rimBounce.addColorStop(0, 'rgba(183, 255, 0, 0.08)');
    rimBounce.addColorStop(0.45, 'rgba(255, 211, 106, 0.05)');
    rimBounce.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = rimBounce;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Latitude parallels
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lon = -180; lon <= 180; lon += 5) {
        const pt = projectPoint(lat, lon, rotLon, tilt, radius, cx, cy);
        if (pt.z >= -0.04) {
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
        lat === 0 ? 'rgba(255, 211, 106, 0.38)' : 'rgba(232, 215, 168, 0.1)';
      ctx.lineWidth = lat === 0 ? 1.25 : 0.75;
      ctx.stroke();
    }

    // Longitude meridians
    for (let lon = -180; lon < 180; lon += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -84; lat <= 84; lat += 5) {
        const pt = projectPoint(lat, lon, rotLon, tilt, radius, cx, cy);
        if (pt.z >= -0.04) {
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
      ctx.strokeStyle = 'rgba(232, 215, 168, 0.085)';
      ctx.lineWidth = 0.75;
      ctx.stroke();
    }

    // Great-circle global liquidity arcs
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
      const steps = 32;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const lat = a.lat + (b.lat - a.lat) * t + Math.sin(t * Math.PI) * 10;
        let dLon = b.lon - a.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        const lon = a.lon + dLon * t;
        const elev = 1 + Math.sin(t * Math.PI) * 0.065;
        const pt = projectPoint(lat, lon, rotLon, tilt, radius * elev, cx, cy);
        if (pt.z > -0.08) {
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
        ? 'rgba(183, 255, 0, 0.84)'
        : aOpen || bOpen
        ? 'rgba(255, 211, 106, 0.62)'
        : 'rgba(232, 215, 168, 0.24)';
      ctx.lineWidth = arcActive ? 1.85 : 1.15;
      ctx.stroke();
    }

    // Refractive crystal edge rim
    const rimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
    rimGrad.addColorStop(0, 'rgba(255, 248, 224, 0.56)');
    rimGrad.addColorStop(0.45, 'rgba(255, 211, 106, 0.42)');
    rimGrad.addColorStop(1, 'rgba(183, 255, 0, 0.3)');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = rimGrad;
    ctx.lineWidth = 1.35;
    ctx.stroke();

    // Financial center nodes
    for (const hub of HUBS) {
      const pt = projectPoint(hub.lat, hub.lon, rotLon, tilt, radius, cx, cy);
      if (pt.z < -0.15) continue;

      const isOpen = Boolean(sessionMap.get(hub.id)?.isOpen);
      const isSelected = selectedHubId === hub.id;
      const alpha = pt.z < 0.1 ? 0.45 : 1;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (isOpen || isSelected) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 12 : 9, 0, Math.PI * 2);
        ctx.fillStyle = isOpen ? 'rgba(183, 255, 0, 0.22)' : 'rgba(255, 211, 106, 0.24)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, isSelected ? 4.8 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = isOpen ? '#B7FF00' : isSelected ? '#FFD36A' : '#E8D7A8';
      ctx.fill();

      ctx.font = '700 11.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isOpen ? '#FAF6EE' : '#C9BA9E';
      ctx.fillText(hub.city, pt.x + 10, pt.y + 4);
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
    <div className="relative flex flex-col items-center w-full max-w-full">
      {/* Free-Floating Reflective Sphere with Liquid-Ripple Rings (Zero Enclosing Box) */}
      <div className="relative flex items-center justify-center">
        <div
          aria-hidden="true"
          className="liquid-ripple-orbit pointer-events-none absolute left-1/2 top-1/2 h-[265px] w-[265px] sm:h-[380px] sm:w-[380px] rounded-full border border-[#FFD36A]/22"
        />
        <div
          aria-hidden="true"
          className="liquid-ripple-orbit-delayed pointer-events-none absolute left-1/2 top-1/2 h-[265px] w-[265px] sm:h-[380px] sm:w-[380px] rounded-full border border-[#B7FF00]/18"
        />

        <canvas
          ref={canvasRef}
          data-testid="market-session-globe"
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
          className="relative z-10 h-[290px] w-[290px] sm:h-[360px] sm:w-[360px] lg:h-[400px] lg:w-[400px] cursor-grab active:cursor-grabbing touch-none select-none"
        />
      </div>

      {/* Unboxed Liquid-Glass Session Buttons & Bold Live Session Readout */}
      <div className="relative z-10 -mt-2 flex flex-col items-center gap-3.5 text-center">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {HUBS.map((hub) => {
            const st = sessionMap.get(hub.id);
            const active = selectedHubId === hub.id;
            return (
              <button
                key={hub.id}
                type="button"
                onClick={() => focusHub(hub)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  active
                    ? 'glass-control-active text-[#FAF6EE]'
                    : 'glass-control text-[#E8D7A8] hover:text-[#FAF6EE]'
                }`}
              >
                <span>{hub.city}</span>
                <span
                  className={`ml-1.5 font-mono text-[11px] font-bold ${
                    st?.isOpen ? 'text-[#FFD36A]' : 'text-[#9C8C72]'
                  }`}
                >
                  {st?.isOpen ? 'ON' : 'OFF'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs sm:text-sm font-mono font-bold tabular-nums text-[#C9BA9E]">
          <span className="text-[#FAF6EE]">{selectedHub.city}</span>
          <span aria-hidden="true" className="text-[#E8D7A8]/30">
            ·
          </span>
          <span className={selectedStatus?.isOpen ? 'text-[#B7FF00]' : 'text-[#C9BA9E]'}>
            {selectedStatus?.isOpen
              ? `Open · ${formatMinutesAsClock(selectedStatus.minutesUntilChange)} left`
              : `Opens in ${formatMinutesAsClock(selectedStatus?.minutesUntilChange || 0)}`}
          </span>
          <span aria-hidden="true" className="text-[#E8D7A8]/30">
            ·
          </span>
          <span className="text-[#FFD36A]">{utcTimeLabel}</span>
          <span aria-hidden="true" className="text-[#E8D7A8]/30 hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline text-[#9C8C72]">ORB {selectedHub.orbUtc}</span>
        </div>
      </div>
    </div>
  );
}
