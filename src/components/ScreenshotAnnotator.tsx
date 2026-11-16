import { useEffect, useRef, useState } from 'react';
import { Check, Minus, Square, Trash2, Type, Undo2, X } from 'lucide-react';

export type AnnotationTool = 'line' | 'rect' | 'text';

export interface ShapeAnnotation {
  id: string;
  tool: AnnotationTool;
  color: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  text?: string;
}

interface ScreenshotAnnotatorProps {
  imageDataUrl: string;
  initialPhase: 'Before' | 'After';
  initialCaption?: string;
  onSave: (result: {
    phase: 'Before' | 'After';
    dataUrl: string;
    caption: string;
    annotations: string[];
  }) => void;
  onCancel: () => void;
}

const PALETTE = [
  { label: 'Cyan', hex: '#00BFFF' },
  { label: 'Purple', hex: '#8A2BE2' },
  { label: 'Emerald', hex: '#10B981' },
  { label: 'Rose', hex: '#F43F5E' },
  { label: 'White', hex: '#FFFFFF' },
];

export function ScreenshotAnnotator({
  imageDataUrl,
  initialPhase,
  initialCaption = '',
  onSave,
  onCancel,
}: ScreenshotAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [phase, setPhase] = useState<'Before' | 'After'>(initialPhase);
  const [caption, setCaption] = useState(initialCaption);
  const [activeTool, setActiveTool] = useState<AnnotationTool>('line');
  const [activeColor, setActiveColor] = useState<string>('#00BFFF');
  const [shapes, setShapes] = useState<ShapeAnnotation[]>([]);
  const [draftShape, setDraftShape] = useState<ShapeAnnotation | null>(null);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [canvasDims, setCanvasDims] = useState<{ w: number; h: number }>({ w: 960, h: 540 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const maxW = 1100;
      const scale = img.width > maxW ? maxW / img.width : 1;
      setCanvasDims({
        w: Math.max(320, Math.round(img.width * scale)),
        h: Math.max(200, Math.round(img.height * scale)),
      });
    };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (img) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#0B1020';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawList = draftShape ? [...shapes, draftShape] : shapes;
    for (const s of drawList) {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      if (s.tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();

        // Small endpoint nodes for clean institutional chart feel
        ctx.beginPath();
        ctx.arc(s.x1, s.y1, 3.5, 0, Math.PI * 2);
        ctx.arc(s.x2, s.y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.tool === 'rect') {
        const rx = Math.min(s.x1, s.x2);
        const ry = Math.min(s.y1, s.y2);
        const rw = Math.abs(s.x2 - s.x1);
        const rh = Math.abs(s.y2 - s.y1);
        ctx.globalAlpha = 0.16;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (s.tool === 'text' && s.text) {
        ctx.font = '600 15px "JetBrains Mono", monospace';
        const metrics = ctx.measureText(s.text);
        const padX = 8;
        const boxW = metrics.width + padX * 2;
        const boxH = 24;
        ctx.fillStyle = 'rgba(5, 5, 5, 0.85)';
        ctx.fillRect(s.x1 - 2, s.y1 - 18, boxW, boxH);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(s.x1 - 2, s.y1 - 18, boxW, boxH);
        ctx.fillStyle = s.color;
        ctx.fillText(s.text, s.x1 + padX - 2, s.y1 - 1);
      }
      ctx.restore();
    }
  }, [shapes, draftShape, canvasDims]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (activeTool === 'text') {
      setPendingTextPos(pt);
      setTextInput('');
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraftShape({
      id: `shp-${Date.now()}`,
      tool: activeTool,
      color: activeColor,
      x1: pt.x,
      y1: pt.y,
      x2: pt.x,
      y2: pt.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draftShape) return;
    const pt = getCanvasPoint(e);
    setDraftShape((prev) => (prev ? { ...prev, x2: pt.x, y2: pt.y } : null));
  };

  const handlePointerUp = () => {
    if (!draftShape) return;
    const dist = Math.hypot(draftShape.x2 - draftShape.x1, draftShape.y2 - draftShape.y1);
    if (dist > 4) {
      setShapes((prev) => [...prev, draftShape]);
    }
    setDraftShape(null);
  };

  const commitTextAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTextPos || !textInput.trim()) {
      setPendingTextPos(null);
      return;
    }
    setShapes((prev) => [
      ...prev,
      {
        id: `txt-${Date.now()}`,
        tool: 'text',
        color: activeColor,
        x1: pendingTextPos.x,
        y1: pendingTextPos.y,
        x2: pendingTextPos.x,
        y2: pendingTextPos.y,
        text: textInput.trim(),
      },
    ]);
    setPendingTextPos(null);
    setTextInput('');
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    const exportedUrl = canvas ? canvas.toDataURL('image/jpeg', 0.88) : imageDataUrl;
    const annotationSummary = shapes.map((s) =>
      s.tool === 'text'
        ? `Note: ${s.text}`
        : s.tool === 'rect'
        ? 'Zone / Structure Box'
        : 'Level / Trendline'
    );
    onSave({
      phase,
      dataUrl: exportedUrl,
      caption: caption.trim() || `${phase} Chart Analysis`,
      annotations: annotationSummary,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Chart Screenshot Annotation Studio"
    >
      <div className="glass-panel w-full max-w-5xl rounded-xl p-5 space-y-4">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">
              Chart Annotation Studio
            </h3>
            <p className="text-xs text-slate-400">
              Draw lines, zone rectangles, or click to place text callouts directly on your chart.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close annotation studio"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawing Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Phase Selector */}
            <div className="inline-flex rounded-lg bg-[#050505] p-1 border border-white/[0.08]">
              {(['Before', 'After'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhase(p)}
                  className={`px-3 py-1 text-xs font-medium rounded ${
                    phase === p ? 'bg-white/[0.12] text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Tool Buttons */}
            <div className="inline-flex rounded-lg bg-[#050505] p-1 border border-white/[0.08] gap-1">
              <button
                type="button"
                onClick={() => setActiveTool('line')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTool === 'line'
                    ? 'bg-[#00BFFF]/20 text-[#00BFFF]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Minus className="w-3.5 h-3.5 -rotate-45" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('rect')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTool === 'rect'
                    ? 'bg-[#00BFFF]/20 text-[#00BFFF]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Zone Box</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('text')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors ${
                  activeTool === 'text'
                    ? 'bg-[#00BFFF]/20 text-[#00BFFF]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Label</span>
              </button>
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 px-2">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setActiveColor(c.hex)}
                  aria-label={`Annotation color ${c.label}`}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    activeColor === c.hex
                      ? 'scale-110 ring-2 ring-white ring-offset-1 ring-offset-[#050505]'
                      : 'border-white/25 opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShapes((prev) => prev.slice(0, -1))}
              disabled={shapes.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] rounded-md disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setShapes([])}
              disabled={shapes.length === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-md disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Text Prompt Bar when Text Tool clicked */}
        {pendingTextPos && (
          <form
            onSubmit={commitTextAnnotation}
            className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-[#050505] border border-[#00BFFF]/40"
          >
            <span className="text-xs text-[#00BFFF] font-mono">Text label:</span>
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., 15m ORB Entry, CISD, FVG Sweep..."
              className="flex-1 min-w-[200px] px-3 py-1.5 rounded bg-white/[0.04] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00BFFF]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-semibold text-[#050505] bg-[#00BFFF] rounded"
            >
              Place Text
            </button>
            <button
              type="button"
              onClick={() => setPendingTextPos(null)}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Interactive Drawing Canvas */}
        <div className="rounded-lg border border-white/[0.1] bg-[#050505] overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={canvasDims.w}
            height={canvasDims.h}
            data-testid="screenshot-annotator-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="max-w-full max-h-[58vh] w-auto h-auto cursor-crosshair touch-none"
          />
        </div>

        {/* Footer: Caption & Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Screenshot caption (e.g., 5m FVG retest after NY 15m ORB break)"
            className="flex-1 px-3 py-2 rounded-lg bg-[#050505] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-[#00BFFF]"
          />

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#8A2BE2] to-[#00BFFF] rounded-lg hover:opacity-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Annotated Screenshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
