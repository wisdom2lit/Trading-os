import { useEffect, useRef } from 'react';

interface RippleWave {
  x: number;
  y: number;
  startTime: number;
  maxRadius: number;
  hue: 'gold' | 'pale' | 'lime';
}

export function AtmosphericBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const waves: RippleWave[] = [];
    let animId = 0;
    let lastDraw = 0;
    let lastAmbientSpawn = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const spawnWave = (
      x: number,
      y: number,
      maxRadius: number,
      hue: RippleWave['hue']
    ) => {
      waves.push({
        x,
        y,
        startTime: performance.now(),
        maxRadius,
        hue,
      });
      if (waves.length > 10) {
        waves.shift();
      }
    };

    // Subtle reflective ripple on pointer interaction
    const handlePointerDown = (e: PointerEvent) => {
      if (reducedMotion) return;
      const roll = Math.random();
      const hue: RippleWave['hue'] = roll > 0.8 ? 'lime' : roll > 0.35 ? 'gold' : 'pale';
      spawnWave(e.clientX, e.clientY, Math.min(window.innerWidth, 440), hue);
    };
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    // Seed initial luminous liquid mirror ripple
    spawnWave(window.innerWidth * 0.56, window.innerHeight * 0.42, 480, 'gold');

    const renderFrame = (ts: number) => {
      animId = window.requestAnimationFrame(renderFrame);
      if (ts - lastDraw < 34) return; // Smooth ~30fps cap
      lastDraw = ts;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Subtle liquid light-caustic wave shimmer across dark mirror
      if (!reducedMotion) {
        const phase = ts * 0.00045;
        for (let band = 0; band < 3; band += 1) {
          const baseY = h * (0.28 + band * 0.24);
          ctx.beginPath();
          for (let x = 0; x <= w; x += 64) {
            const dy =
              Math.sin(x * 0.0038 + phase + band * 1.7) * 18 +
              Math.cos(x * 0.0021 - phase * 0.7) * 10;
            if (x === 0) ctx.moveTo(x, baseY + dy);
            else ctx.lineTo(x, baseY + dy);
          }
          ctx.strokeStyle =
            band === 1
              ? 'rgba(255, 211, 106, 0.032)'
              : band === 2
              ? 'rgba(183, 255, 0, 0.018)'
              : 'rgba(232, 215, 168, 0.025)';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      if (!reducedMotion && ts - lastAmbientSpawn > 3400) {
        lastAmbientSpawn = ts;
        const fx = w * (0.26 + Math.random() * 0.48);
        const fy = h * (0.24 + Math.random() * 0.52);
        const roll = Math.random();
        const hue: RippleWave['hue'] = roll > 0.82 ? 'lime' : roll > 0.4 ? 'gold' : 'pale';
        spawnWave(fx, fy, 360 + Math.random() * 220, hue);
      }

      const duration = 5600;
      for (let i = waves.length - 1; i >= 0; i -= 1) {
        const wave = waves[i];
        const age = ts - wave.startTime;
        if (age >= duration) {
          waves.splice(i, 1);
          continue;
        }
        const progress = age / duration;
        const ease = 1 - Math.pow(1 - progress, 2.2);
        const radius = 16 + wave.maxRadius * ease;
        const alpha = Math.sin(progress * Math.PI) * 0.16;

        // Primary liquid crest + trailing harmonic reflection ring
        for (let ring = 0; ring < 2; ring += 1) {
          const r = radius - ring * 28;
          if (r <= 4) continue;
          const ringAlpha = ring === 0 ? alpha : alpha * 0.52;
          const color =
            wave.hue === 'gold'
              ? `rgba(255, 211, 106, ${ringAlpha.toFixed(3)})`
              : wave.hue === 'lime'
              ? `rgba(183, 255, 0, ${(ringAlpha * 0.72).toFixed(3)})`
              : `rgba(232, 215, 168, ${ringAlpha.toFixed(3)})`;

          ctx.beginPath();
          ctx.ellipse(wave.x, wave.y, r, r * 0.6, 0, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = ring === 0 ? 1.25 : 0.85;
          ctx.stroke();
        }
      }
    };

    if (!reducedMotion) {
      animId = window.requestAnimationFrame(renderFrame);
    }

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#050505]"
    >
      {/* Deep Black (#050505) & Rich Dark Brown (#24180F) Liquid Mirror Depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_54%_22%,rgba(36,24,15,0.68)_0%,rgba(12,9,7,0.92)_48%,rgba(5,5,5,1)_82%)]" />
      <div className="absolute -top-44 right-[8%] h-[600px] w-[600px] rounded-full bg-[#24180F]/65 blur-[160px]" />
      <div className="absolute top-[16%] left-[-8%] h-[520px] w-[520px] rounded-full bg-[#FFD36A]/[0.045] blur-[165px]" />
      <div className="absolute bottom-[-14%] left-[24%] h-[460px] w-[620px] rounded-full bg-[#24180F]/55 blur-[160px]" />
      <div className="absolute bottom-[12%] right-[-10%] h-[420px] w-[420px] rounded-full bg-[#B7FF00]/[0.028] blur-[170px]" />

      {/* Subtle Pale-Gold Coordinate Grid */}
      <div className="absolute inset-0 architectural-grid opacity-60" />

      {/* Dark Reflective Liquid Water-Ripple & Caustic Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Soft Obsidian Perimeter Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_36%,rgba(5,5,5,0.85)_100%)]" />
    </div>
  );
}
