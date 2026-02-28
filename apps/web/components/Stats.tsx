"use client";

import ScrollReveal from "./ScrollReveal";

export default function Stats() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0 hatching pointer-events-none opacity-30" />

      {/* Grid lines */}
      <div className="absolute left-0 top-1/2 w-full h-px bg-border opacity-50" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          <ScrollReveal>
            <h2 className="font-serif text-display-md">
              Feature Flags Are Reducing Deployment Failures
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <p className="text-text-secondary leading-relaxed lg:pt-4">
              Over the past several years, teams shipping without feature
              flags have maintained roughly flat incident rates. Meanwhile,
              teams adopting progressive delivery are seeing dramatically
              lower failure rates and faster recovery times.
            </p>
          </ScrollReveal>
        </div>

        {/* Chart area */}
        <ScrollReveal delay={2}>
          <div className="relative">
            <div className="grid lg:grid-cols-[280px_1fr] gap-0">
              {/* Stat callout */}
              <div className="card-technical p-8 flex flex-col justify-end">
                <div className="font-serif text-display-md text-accent-red mb-4">
                  4.7X
                </div>
                <p className="font-mono text-label-xs uppercase text-text-secondary leading-relaxed">
                  Teams using feature flags show 4.7x faster incident recovery
                  and significantly lower deployment failure rates compared
                  to traditional releases.
                </p>
              </div>

              {/* Chart SVG */}
              <div className="card-technical p-6 md:p-8">
                <svg viewBox="0 0 700 320" className="w-full" fill="none">
                  {/* Y-axis labels */}
                  {[
                    { label: "50%", y: 40 },
                    { label: "40%", y: 100 },
                    { label: "30%", y: 160 },
                    { label: "20%", y: 220 },
                    { label: "10%", y: 280 },
                  ].map(({ label, y }) => (
                    <g key={label}>
                      <text x="25" y={y + 4} className="fill-text-muted font-mono" fontSize="10" textAnchor="end">
                        {label}
                      </text>
                      <line x1="35" y1={y} x2="680" y2={y} className="chart-grid-line" strokeDasharray="2 4" />
                    </g>
                  ))}

                  {/* X-axis labels */}
                  {["2019", "2020", "2021", "2022", "2023", "2024", "2025"].map((year, i) => (
                    <text
                      key={year}
                      x={90 + i * 90}
                      y={308}
                      className="fill-text-muted font-mono"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {year}
                    </text>
                  ))}

                  {/* Traditional line (gray, flat) */}
                  <polyline
                    points="90,240 180,236 270,232 360,230 450,228 540,225 630,224"
                    className="chart-line-traditional"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* FlagForge / progressive delivery line (red, ascending) */}
                  <polyline
                    points="90,238 180,225 270,200 360,165 450,120 540,75 630,48"
                    className="chart-line-flagforge"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Red area fill under the red line at the end */}
                  <path
                    d="M540,75 L630,48 L630,224 L540,225 Z"
                    fill="rgba(121,15,17,0.08)"
                  />
                  <path
                    d="M540,75 L630,48 L630,224 L540,225 Z"
                    fill="url(#hatch-red)"
                  />

                  {/* Hatching pattern def */}
                  <defs>
                    <pattern id="hatch-red" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(-45)">
                      <line x1="0" y1="0" x2="0" y2="4" stroke="#790f11" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                  </defs>

                  {/* Data point on red line end */}
                  <circle cx="630" cy="48" r="4" fill="#790f11" opacity="0.8" />
                  <circle cx="630" cy="48" r="7" fill="none" stroke="#790f11" strokeWidth="0.8" opacity="0.3" />

                  {/* Data point on gray line end */}
                  <circle cx="630" cy="224" r="3" fill="#5c5848" />

                  {/* 4.7X label */}
                  <text x="655" y="140" className="fill-accent-red font-mono font-bold" fontSize="14">
                    4.7X
                  </text>

                  {/* Legend */}
                  <g transform="translate(280, 308)">
                    <line x1="0" y1="0" x2="20" y2="0" stroke="#5c5848" strokeWidth="2" />
                    <circle cx="10" cy="0" r="2.5" fill="#5c5848" />
                    <text x="28" y="3.5" className="fill-text-muted font-mono" fontSize="9.5">
                      Traditional Deploys
                    </text>
                  </g>
                  <g transform="translate(460, 308)">
                    <line x1="0" y1="0" x2="20" y2="0" stroke="#790f11" strokeWidth="2" />
                    <circle cx="10" cy="0" r="2.5" fill="#790f11" />
                    <text x="28" y="3.5" className="fill-text-muted font-mono" fontSize="9.5">
                      Flag-Protected Deploys
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
