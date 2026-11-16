export function AtmosphericBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0A0807]"
    >
      {/* Warm Espresso & Umber Subtle Gradient Depth */}
      <div className="absolute -top-48 right-[-8%] h-[620px] w-[620px] rounded-full bg-[#2B2018]/45 blur-[150px]" />
      <div className="absolute top-[22%] left-[-12%] h-[540px] w-[540px] rounded-full bg-[#0E4A38]/18 blur-[150px]" />
      <div className="absolute bottom-[-18%] right-[16%] h-[480px] w-[660px] rounded-full bg-[#1B4970]/12 blur-[150px]" />
      <div className="absolute top-[52%] right-[28%] h-[420px] w-[420px] rounded-full bg-[#3A2B20]/20 blur-[140px]" />

      {/* Subtle Warm Architectural Coordinate Grid */}
      <div className="absolute inset-0 architectural-grid opacity-65" />

      {/* Faint Warm Ivory & Forest Horizon Line */}
      <svg
        viewBox="0 0 1440 360"
        preserveAspectRatio="none"
        className="absolute bottom-0 inset-x-0 w-full h-[34vh] opacity-[0.16]"
      >
        <defs>
          <linearGradient id="horizonStrokeWarm" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#17694F" stopOpacity="0.1" />
            <stop offset="48%" stopColor="#E6DCCB" stopOpacity="0.48" />
            <stop offset="82%" stopColor="#1C4C76" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#17694F" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="horizonFillWarm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#17694F" stopOpacity="0.14" />
            <stop offset="60%" stopColor="#2B2018" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#0A0807" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 294 L110 282 L185 286 L290 252 L375 262 L480 218 L560 228 L675 182 L770 198 L890 148 L975 164 L1110 116 L1235 130 L1340 92 L1440 100 L1440 360 L0 360 Z"
          fill="url(#horizonFillWarm)"
        />
        <path
          d="M0 294 L110 282 L185 286 L290 252 L375 262 L480 218 L560 228 L675 182 L770 198 L890 148 L975 164 L1110 116 L1235 130 L1340 92 L1440 100"
          fill="none"
          stroke="url(#horizonStrokeWarm)"
          strokeWidth="1.2"
        />
      </svg>

      {/* Soft Espresso Perimeter Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,transparent_42%,rgba(10,8,7,0.78)_100%)]" />
    </div>
  );
}
