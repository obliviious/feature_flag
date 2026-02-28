"use client";

export default function Hero() {
  return (
    <section className="relative h-screen min-h-[700px] max-h-[1000px] overflow-hidden bg-bg-primary">
      {/* ═══ BACKGROUND LAYERS ═══ */}
      <div className="absolute inset-0 hatching pointer-events-none opacity-50" />
      <div className="absolute inset-0 grid-dots pointer-events-none opacity-[0.07]" />

      {/* ═══ GRID LINES (structural visible grid like the image) ═══ */}
      {/* Vertical lines */}
      <div className="absolute top-0 bottom-0 left-[8%] w-px bg-text-primary/[0.06]" />
      <div className="absolute top-0 bottom-0 left-[33%] w-px bg-text-primary/[0.06]" />
      <div className="absolute top-0 bottom-0 left-[50%] w-px bg-text-primary/[0.08]" />
      <div className="absolute top-0 bottom-0 left-[67%] w-px bg-text-primary/[0.06]" />
      <div className="absolute top-0 bottom-0 right-[8%] w-px bg-text-primary/[0.06]" />

      {/* Horizontal lines */}
      <div className="absolute left-0 right-0 top-[12%] h-px bg-text-primary/[0.06]" />
      <div className="absolute left-0 right-0 top-[55%] h-px bg-text-primary/[0.08]" />
      <div className="absolute left-0 right-0 top-[65%] h-px bg-text-primary/[0.06]" />
      <div className="absolute left-0 right-0 bottom-[15%] h-px bg-text-primary/[0.06]" />

      {/* ═══ DIAGONAL RED DASHED LINE ═══ */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
        <line
          x1="30%"
          y1="0"
          x2="70%"
          y2="100%"
          stroke="#790f11"
          strokeWidth="1"
          strokeDasharray="6 6"
          opacity="0.35"
        />
      </svg>

      {/* ═══ LARGE WATERMARK TEXT ═══ */}
      <div className="absolute top-[16%] left-[8%] pointer-events-none select-none">
        <span className="font-serif text-[clamp(5rem,12vw,11rem)] font-bold text-text-primary/[0.04] leading-none tracking-tight">
          FLAGFORGE
        </span>
      </div>

      {/* ═══ CROSSHAIRS (+) scattered ═══ */}
      {[
        { x: "8%", y: "12%" },
        { x: "33%", y: "12%" },
        { x: "50%", y: "12%" },
        { x: "67%", y: "12%" },
        { x: "92%", y: "12%" },
        { x: "8%", y: "55%" },
        { x: "33%", y: "55%" },
        { x: "50%", y: "55%" },
        { x: "67%", y: "55%" },
        { x: "92%", y: "55%" },
        { x: "8%", y: "65%" },
        { x: "50%", y: "65%" },
        { x: "67%", y: "65%" },
        { x: "33%", y: "85%" },
        { x: "50%", y: "85%" },
        { x: "92%", y: "85%" },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute font-mono text-[11px] text-text-primary/[0.12] pointer-events-none select-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: pos.x, top: pos.y }}
        >
          +
        </div>
      ))}

      {/* ═══ NUMBERED FEATURE LABELS ═══ */}

      {/* 01 >> REAL-TIME SSE — top right area, red background like the image */}
      <div className="absolute top-[7%] left-[36%] md:left-[42%] z-10">
        <div className="bg-accent-red px-4 py-1.5 inline-block">
          <span className="font-mono text-[0.65rem] md:text-[0.7rem] text-text-primary uppercase tracking-[0.16em] font-medium">
            01 {">>"} Real-Time SSE
          </span>
        </div>
      </div>

      {/* 02 >> SMART TARGETING — middle, below the headline */}
      <div className="absolute top-[58%] left-[34%] z-10">
        <div className="bg-text-primary/[0.06] backdrop-blur-sm px-4 py-1.5 inline-block border-l-2 border-accent-red/40">
          <span className="font-mono text-[0.6rem] md:text-[0.65rem] text-text-secondary uppercase tracking-[0.16em]">
            02 {">>"} Smart Targeting
          </span>
        </div>
      </div>

      {/* 03 >> INSTANT ROLLBACK — right of center */}
      <div className="absolute top-[52%] right-[10%] z-10 hidden md:block">
        <span className="font-mono text-[0.6rem] md:text-[0.65rem] text-text-secondary/60 uppercase tracking-[0.16em]">
          03 {">>"} Instant Rollback
        </span>
      </div>

      {/* ═══ "10 / GRAPHICS" style label ═══ */}
      <div className="absolute top-[7%] left-[34%] hidden md:block">
        <span className="font-mono text-[0.55rem] text-text-muted/40 uppercase leading-tight">
          12<br />FLAGS
        </span>
      </div>

      {/* ═══ GLOBE WIREFRAME (top right area) ═══ */}
      <div className="absolute top-[14%] right-[16%] hidden md:block pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="opacity-30">
          <circle cx="40" cy="40" r="28" stroke="#C1BCA9" strokeWidth="0.6" />
          <ellipse cx="40" cy="40" rx="16" ry="28" stroke="#C1BCA9" strokeWidth="0.4" />
          <ellipse cx="40" cy="40" rx="28" ry="10" stroke="#C1BCA9" strokeWidth="0.4" />
          <line x1="12" y1="40" x2="68" y2="40" stroke="#C1BCA9" strokeWidth="0.3" />
          <line x1="40" y1="12" x2="40" y2="68" stroke="#C1BCA9" strokeWidth="0.3" />
          <ellipse cx="40" cy="28" rx="24" ry="5" stroke="#C1BCA9" strokeWidth="0.3" />
          <ellipse cx="40" cy="52" rx="24" ry="5" stroke="#C1BCA9" strokeWidth="0.3" />
        </svg>
      </div>

      {/* ═══ STARBURST / COMPASS (next to globe) ═══ */}
      <div className="absolute top-[16%] right-[8%] hidden md:block pointer-events-none">
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" className="opacity-25">
          {[0, 45, 90, 135].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 25 + Math.cos(rad) * 4;
            const y1 = 25 + Math.sin(rad) * 4;
            const x2 = 25 + Math.cos(rad) * 20;
            const y2 = 25 + Math.sin(rad) * 20;
            return (
              <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C1BCA9" strokeWidth={angle % 90 === 0 ? "1.2" : "0.6"} />
            );
          })}
          <circle cx="25" cy="25" r="2" fill="#C1BCA9" opacity="0.5" />
        </svg>
      </div>

      {/* ═══ BARCODE STRIP (top-right corner) ═══ */}
      <div className="absolute top-[6%] right-[2%] flex gap-[1.5px] pointer-events-none opacity-20 hidden lg:flex">
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="bg-text-primary"
            style={{
              width: i % 4 === 0 ? "2.5px" : i % 3 === 0 ? "1.5px" : "1px",
              height: `${20 + (i % 5) * 6}px`,
            }}
          />
        ))}
      </div>

      {/* ═══ BARCODE STRIP (bottom-left) ═══ */}
      <div className="absolute bottom-[26%] left-[9%] flex gap-[1.5px] pointer-events-none opacity-15 hidden md:flex">
        {Array.from({ length: 28 }, (_, i) => (
          <div
            key={i}
            className="bg-text-primary"
            style={{
              width: i % 3 === 0 ? "2px" : "1px",
              height: `${16 + (i % 7) * 5}px`,
            }}
          />
        ))}
      </div>

      {/* ═══ SMALL DOT GRID CLUSTER (bottom-right) ═══ */}
      <div className="absolute bottom-[20%] right-[10%] hidden lg:block pointer-events-none">
        <svg width="120" height="80" viewBox="0 0 120 80" fill="none" opacity="0.15">
          {Array.from({ length: 8 }, (_, row) =>
            Array.from({ length: 12 }, (_, col) => (
              <rect
                key={`${row}-${col}`}
                x={col * 10}
                y={row * 10}
                width="6"
                height="6"
                fill={
                  (row === 2 && col > 6) || (row === 3 && col > 4) || (row === 4 && col > 7)
                    ? "#790f11"
                    : "#C1BCA9"
                }
                opacity={
                  (row === 2 && col > 6) || (row === 3 && col > 4) || (row === 4 && col > 7)
                    ? 0.5
                    : 0.2
                }
                rx="0.5"
              />
            ))
          )}
        </svg>
      </div>

      {/* ═══════════════════════════════════════════
          MAIN HEADLINE (center-left, large serif)
          ═══════════════════════════════════════════ */}
      <div className="absolute inset-0 flex items-center z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full">
          <div className="max-w-3xl pl-0 md:pl-[2%]">
            <h1 className="font-serif text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.08] tracking-tight text-text-primary mb-0">
              Ship features{" "}
              <br className="hidden sm:block" />
              fearlessly, not{" "}
              <br className="hidden sm:block" />
              recklessly.
            </h1>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM-RIGHT MONOSPACE PARAGRAPH ═══ */}
      <div className="absolute bottom-[6%] right-[3%] md:right-[8%] max-w-[340px] z-10">
        <p className="font-mono text-[0.6rem] md:text-[0.65rem] text-text-muted/60 uppercase leading-relaxed tracking-wide text-right">
          Feature flags are the new deployment<br className="hidden sm:block" />
          primitive. Those who control the release<br className="hidden sm:block" />
          control the product.
        </p>
      </div>

      {/* ═══ BOTTOM-LEFT CTA BUTTONS ═══ */}
      <div className="absolute bottom-[6%] left-[3%] md:left-[8%] z-10 flex items-center gap-4">
        <a
          href="/sign-up"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] md:text-label-sm uppercase px-6 py-3 bg-accent-red text-text-primary hover:bg-accent-red-hover transition-all tracking-wider"
        >
          Start Building
          <span className="text-text-primary/50">{">>>"}</span>
        </a>
        <a
          href="/docs"
          className="inline-flex items-center gap-2 font-mono text-[0.6rem] md:text-label-sm uppercase px-6 py-3 border border-border-lighter text-text-secondary hover:text-text-primary hover:border-text-muted transition-all tracking-wider"
        >
          Docs
        </a>
      </div>

      {/* ═══ BOTTOM GRID LINE ═══ */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
