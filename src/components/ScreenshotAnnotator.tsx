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
  { label: 'Ivory', hex: '#FAF6EF' },
  { label: 'Emerald', hex: '#2FA47C' },
  { label: 'Sapphire', hex: '#3571A5' },
  { label: 'Profit Green', hex: '#10B981' },
  { label: 'Loss Rose', hex: '#F43F5E' },
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
  const [activeColor, setActiveColor] = useState<string>('#2FA47C');
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
      ctx.fillStyle = '#15110E';
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

        ctx.beginPath();
        ctx.arc(s.x1, s.y1, 3.5, 0, Math.PI * 2);
        ctx.arc(s.x2, s.y2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (s.tool === 'rect') {
        const rx = Math.min(s.x1, s.x2);
        const ry = Math.min(s.y1, s.y2);
        const rw = Math.abs(s.x2 - s.x1);
        const rh = Math.abs(s.y2 - s.y1);
        ctx.globalAlpha = 0.18;
        ctx.fillRect(rx, ry, rw, rh);
        ctx.globalAlpha = 1;
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (s.tool === 'text' && s.text) {
        ctx.font = '600 15px "JetBrains Mono", monospace';
        const metrics = ctx.measureText(s.text);
        const padX = 8;
        const boxW = metrics.width + padX * 2;
        const boxH = 24;
        ctx.fillStyle = 'rgba(10, 8, 7, 0.88)';
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Chart Screenshot Annotation Studio"
    >
      <div className="liquid-glass-elevated w-full max-w-5xl rounded-[28px] p-6 sm:p-7 space-y-5 my-auto">
        {/* Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#FAF6EF]/15">
          <div>
            <h3 className="font-display text-lg font-semibold text-[#FAF6EF]">
              Chart Annotation Studio
            </h3>
            <p className="text-xs text-[#B7ADA0]">
              Draw lines, zone rectangles, or click to place text callouts directly on your chart.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close annotation studio"
            className="p-2 text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawing Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Phase Selector */}
            <div className="inline-flex rounded-xl liquid-glass-inset p-1 gap-1">
              {(['Before', 'After'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhase(p)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                    phase === p
                      ? 'bg-[#0E4A38]/70 text-[#FAF6EF] border border-[#258767]/50'
                      : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Tool Buttons */}
            <div className="inline-flex rounded-xl liquid-glass-inset p-1 gap-1">
              <button
                type="button"
                onClick={() => setActiveTool('line')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTool === 'line'
                    ? 'bg-[#0E4A38]/70 text-[#FAF6EF] border border-[#258767]/50'
                    : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
                }`}
              >
                <Minus className="w-3.5 h-3.5 -rotate-45" />
                <span>Line</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('rect')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTool === 'rect'
                    ? 'bg-[#0E4A38]/70 text-[#FAF6EF] border border-[#258767]/50'
                    : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Zone Box</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTool('text')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  activeTool === 'text'
                    ? 'bg-[#0E4A38]/70 text-[#FAF6EF] border border-[#258767]/50'
                    : 'text-[#B7ADA0] hover:text-[#FAF6EF] border border-transparent'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Text Label</span>
              </button>
            </div>

            {/* Color Swatches */}
            <div className="flex items-center gap-2 px-2">
              {PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setActiveColor(c.hex)}
                  aria-label={`Annotation color ${c.label}`}
                  className={`w-5 h-5 rounded-lg border transition-transform ${
                    activeColor === c.hex
                      ? 'scale-110 ring-2 ring-[#FAF6EF] ring-offset-2 ring-offset-[#1D1713]'
                      : 'border-[#FAF6EF]/30 opacity-75 hover:opacity-100'
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
              className="btn-ivory-glass inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#FAF6EF] rounded-xl disabled:opacity-40"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={() => setShapes([])}
              disabled={shapes.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-xl disabled:opacity-40 transition-colors"
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
            className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-2xl liquid-glass-inset border border-[#258767]/50"
          >
            <span className="text-xs text-[#3FA17F] font-mono">Text label:</span>
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g., 15m ORB Entry, CISD, FVG Sweep..."
              className="tos-input flex-1 min-w-[200px] px-3.5 py-2 text-xs"
            />
            <button
              type="submit"
              className="btn-emerald-glass px-3.5 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
            >
              Place Text
            </button>
            <button
              type="button"
              onClick={() => setPendingTextPos(null)}
              className="px-2.5 py-2 text-xs text-[#B7ADA0] hover:text-[#FAF6EF]"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Interactive Drawing Canvas */}
        <div className="rounded-2xl border border-[#FAF6EF]/15 bg-[#120E0C] overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={canvasDims.w}
            height={canvasDims.h}
            data-testid="screenshot-annotator-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="max-w-full max-h-[56vh] w-auto h-auto cursor-crosshair touch-none"
          />
        </div>

        {/* Footer: Caption & Save */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Screenshot caption (e.g., 5m FVG retest after NY 15m ORB break)"
            className="tos-input flex-1 px-3.5 py-2.5 text-xs"
          />

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-medium text-[#B7ADA0] hover:text-[#FAF6EF] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-emerald-glass inline-flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold text-[#FAF6EF] rounded-xl"
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
