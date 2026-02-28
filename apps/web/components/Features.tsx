import ScrollReveal from "./ScrollReveal";

const features = [
  {
    num: "01",
    title: "Real-time Streaming",
    description: "INSTANT FLAG UPDATES VIA SSE. NO POLLING, NO DELAYS, NO STALE STATE.",
    visual: (
      <svg viewBox="0 0 360 240" fill="none" className="w-full h-full">
        {/* Vertical red line */}
        <line x1="180" y1="20" x2="180" y2="220" stroke="#790f11" strokeWidth="1" opacity="0.6" />
        {/* Horizontal axis */}
        <line x1="40" y1="130" x2="320" y2="130" stroke="#5c5848" strokeWidth="0.5" opacity="0.4" />

        {/* Converging lines from left */}
        {[60, 80, 100, 120, 140, 160].map((y, i) => (
          <line key={`l-${i}`} x1="30" y1={y + (i - 3) * 15} x2="180" y2="130" stroke="#C1BCA9" strokeWidth="0.5" opacity={0.15 + i * 0.05} />
        ))}

        {/* Right side dots (red = active) */}
        {[0, 1, 2].map((i) => (
          <g key={`r-${i}`}>
            <circle cx={210 + i * 36} cy={130} r="5" fill="#790f11" opacity={0.5 + i * 0.2} />
            <circle cx={210 + i * 36} cy={130} r="8" fill="none" stroke="#790f11" strokeWidth="0.5" opacity="0.2" />
          </g>
        ))}

        {/* Left side dots (muted) */}
        {[
          [50, 70], [70, 170], [40, 120], [90, 50], [60, 190], [80, 90], [45, 155],
        ].map(([x, y], i) => (
          <circle key={`g-${i}`} cx={x} cy={y} r="3.5" fill="#5c5848" opacity={0.3 + (i % 3) * 0.1} />
        ))}
      </svg>
    ),
  },
  {
    num: "02",
    title: "Smart Targeting",
    description: "RULE-BASED SEGMENTS, PERCENTAGE ROLLOUTS, AND USER OVERRIDES.",
    visual: (
      <svg viewBox="0 0 360 240" fill="none" className="w-full h-full">
        {/* Grid allocation diagram */}
        {Array.from({ length: 5 }, (_, row) =>
          Array.from({ length: 6 }, (_, col) => {
            const x = 55 + col * 45;
            const y = 30 + row * 40;
            const isHighlighted =
              (row === 0 && col === 0) ||
              (row === 2 && col === 2) ||
              (row === 4 && col === 5);
            const isDim =
              (row === 1 && col === 3) ||
              (row === 3 && col === 1) ||
              (row === 0 && col === 4);
            return (
              <rect
                key={`${row}-${col}`}
                x={x}
                y={y}
                width="36"
                height="28"
                rx="1"
                fill={isHighlighted ? "#790f11" : isDim ? "#352f26" : "none"}
                stroke={isHighlighted ? "#790f11" : "#3d3830"}
                strokeWidth={isHighlighted ? "1.5" : "0.5"}
                opacity={isHighlighted ? 0.8 : isDim ? 0.5 : 0.3}
              />
            );
          })
        )}
      </svg>
    ),
  },
  {
    num: "03",
    title: "Instant Rollbacks",
    description: "ONE-CLICK KILL SWITCH. THE SYSTEM CONSTANTLY MONITORS AND ADAPTS.",
    visual: (
      <svg viewBox="0 0 360 240" fill="none" className="w-full h-full">
        {/* Pie/radar chart */}
        <circle cx="180" cy="120" r="85" fill="none" stroke="#3d3830" strokeWidth="0.5" opacity="0.4" />
        <circle cx="180" cy="120" r="60" fill="none" stroke="#352f26" strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3" />

        {/* Red sector */}
        <path
          d="M180 120 L265 120 A85 85 0 0 0 240 55 Z"
          fill="rgba(121,15,17,0.2)"
          stroke="#790f11"
          strokeWidth="1"
        />

        {/* Data points */}
        {[
          [140, 80], [220, 100], [200, 150], [160, 160], [250, 70], [130, 130], [210, 60],
        ].map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={i < 3 ? "#790f11" : "#5c5848"}
            opacity={i < 3 ? 0.7 : 0.4}
          />
        ))}

        {/* Crosshair at center */}
        <line x1="172" y1="120" x2="188" y2="120" stroke="#5c5848" strokeWidth="0.5" opacity="0.4" />
        <line x1="180" y1="112" x2="180" y2="128" stroke="#5c5848" strokeWidth="0.5" opacity="0.4" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      {/* Top hatching strip */}
      <div className="absolute top-0 left-0 right-0 h-16 hatching-dense border-b border-border" />

      {/* Decorative red dashed line top-left */}
      <svg className="absolute top-0 left-0 w-48 h-12 pointer-events-none" viewBox="0 0 200 50" fill="none">
        <path d="M0 48 Q50 20 100 10 Q150 0 200 5" stroke="#790f11" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
      </svg>

      <Crosshair x="50%" y="16px" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10 pt-16">
        <div className="grid md:grid-cols-3 gap-px bg-border">
          {features.map((feat, i) => (
            <ScrollReveal key={feat.num} delay={(i + 1) as 1 | 2 | 3}>
              <div className="bg-bg-primary flex flex-col h-full">
                {/* Number badge */}
                <div className="px-6 pt-6 md:px-8 md:pt-8">
                  <div className="number-badge">{feat.num}</div>
                </div>

                {/* Visual */}
                <div className="px-4 py-8 md:px-6 aspect-[3/2] flex items-center justify-center">
                  {feat.visual}
                </div>

                {/* Text */}
                <div className="px-6 pb-6 md:px-8 md:pb-8 mt-auto border-t border-border pt-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-serif text-xl md:text-2xl text-text-primary">
                      {feat.title}
                    </h3>
                    <span className="red-link shrink-0 mt-1.5">{">>>"}</span>
                  </div>
                  <p className="font-mono text-label-xs uppercase text-text-secondary leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      {/* Vertical barcode decoration at bottom center */}
      <div className="flex justify-center mt-8 gap-[2px] opacity-20">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="bg-text-primary"
            style={{
              width: i % 3 === 0 ? "2px" : "1px",
              height: `${12 + Math.random() * 20}px`,
            }}
          />
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}

function Crosshair({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute font-mono text-sm text-text-primary/[0.08] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}
