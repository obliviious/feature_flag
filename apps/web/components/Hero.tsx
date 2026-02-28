"use client";

import ScrollReveal from "./ScrollReveal";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 hatching pointer-events-none" />
      <div className="absolute inset-0 vlines pointer-events-none opacity-40" />

      {/* Subtle radial glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-accent-red/[0.03] blur-[200px] pointer-events-none" />

      {/* Grid crosshair decorations */}
      <Crosshair x="5%" y="15%" />
      <Crosshair x="95%" y="15%" />
      <Crosshair x="50%" y="50%" />
      <Crosshair x="5%" y="85%" />
      <Crosshair x="95%" y="85%" />

      {/* Accent lines */}
      <div className="absolute top-0 left-[20%] w-px h-32 bg-gradient-to-b from-accent-red/40 to-transparent" />
      <div className="absolute top-12 right-[15%] w-24 h-px bg-gradient-to-r from-accent-red/30 to-transparent" />
      <div className="absolute bottom-24 left-[10%] w-16 h-px bg-gradient-to-r from-accent-red/20 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
          {/* Left — Copy */}
          <div>
            <ScrollReveal>
              <div className="label-badge mb-8">Feature Flag Platform</div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h1 className="font-serif text-display-xl mb-8">
                Ship features{" "}
                <span className="text-accent-red-light">fearlessly.</span>{" "}
                Control every release.
              </h1>
            </ScrollReveal>

            <ScrollReveal delay={2}>
              <p className="text-text-secondary text-lg md:text-xl leading-relaxed max-w-lg mb-10 font-sans">
                An open-source platform that lets engineering teams deploy,
                target, and roll back features in real time — without
                redeploying code.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={3}>
              <div className="flex flex-wrap gap-4 mb-12">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-7 py-3.5 bg-accent-red text-text-primary hover:bg-accent-red-hover transition-all"
                >
                  Start Building
                  <span className="text-text-primary/60">{">>>"}</span>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-7 py-3.5 border border-border-lighter text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
                >
                  View Documentation
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={4}>
              <div className="flex items-center gap-6 flex-wrap">
                {[
                  { val: "<1ms", label: "Eval Latency" },
                  { val: "2M+", label: "Evals / sec" },
                  { val: "100%", label: "Open Source" },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2.5">
                    <span className="font-serif text-lg text-accent-red-light">{stat.val}</span>
                    <span className="font-mono text-label-xs uppercase text-text-muted">{stat.label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Right — Architecture Diagram */}
          <ScrollReveal delay={2} className="hidden lg:block">
            <div className="relative">
              {/* Main architecture diagram */}
              <div className="card-technical p-0 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-card">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-red/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                  <span className="ml-3 font-mono text-label-xs text-text-muted">
                    architecture.svg
                  </span>
                </div>

                {/* Architecture visualization */}
                <div className="p-4">
                  <svg viewBox="0 0 520 380" fill="none" className="w-full">
                    <defs>
                      <pattern id="hero-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="10" cy="10" r="0.5" fill="#C1BCA9" opacity="0.08" />
                      </pattern>
                      <linearGradient id="stream-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#790f11" stopOpacity="0" />
                        <stop offset="50%" stopColor="#790f11" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#790f11" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="node-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#790f11" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#790f11" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Background grid */}
                    <rect width="520" height="380" fill="url(#hero-grid)" />

                    {/* === SERVER NODE (center top) === */}
                    <rect x="185" y="20" width="150" height="68" rx="2" fill="#1a1814" stroke="#2a2720" strokeWidth="1" />
                    <rect x="185" y="20" width="150" height="68" rx="2" fill="url(#node-glow)" />
                    <rect x="185" y="20" width="150" height="20" rx="2" fill="#790f11" opacity="0.12" />
                    <text x="260" y="34" textAnchor="middle" className="font-mono" fontSize="8" fill="#790f11" letterSpacing="0.1em">FLAGFORGE SERVER</text>
                    <text x="260" y="54" textAnchor="middle" className="font-mono" fontSize="9" fill="#C1BCA9" opacity="0.7">Rust + Axum</text>
                    <text x="260" y="68" textAnchor="middle" className="font-mono" fontSize="7" fill="#5c5848">eval-core engine</text>

                    {/* === REDIS NODE (left) === */}
                    <rect x="20" y="140" width="120" height="52" rx="2" fill="#1a1814" stroke="#2a2720" strokeWidth="1" />
                    <rect x="20" y="140" width="120" height="16" rx="2" fill="#352f26" />
                    <text x="80" y="152" textAnchor="middle" className="font-mono" fontSize="7" fill="#8a8574" letterSpacing="0.1em">REDIS</text>
                    <text x="80" y="172" textAnchor="middle" className="font-mono" fontSize="8" fill="#C1BCA9" opacity="0.6">Pub/Sub</text>

                    {/* === POSTGRES NODE (right) === */}
                    <rect x="380" y="140" width="120" height="52" rx="2" fill="#1a1814" stroke="#2a2720" strokeWidth="1" />
                    <rect x="380" y="140" width="120" height="16" rx="2" fill="#352f26" />
                    <text x="440" y="152" textAnchor="middle" className="font-mono" fontSize="7" fill="#8a8574" letterSpacing="0.1em">POSTGRESQL</text>
                    <text x="440" y="172" textAnchor="middle" className="font-mono" fontSize="8" fill="#C1BCA9" opacity="0.6">Flag Store</text>

                    {/* === CONNECTIONS: Server to Redis/Postgres === */}
                    <line x1="215" y1="88" x2="120" y2="140" stroke="#2a2720" strokeWidth="1" strokeDasharray="4 3" />
                    <line x1="305" y1="88" x2="400" y2="140" stroke="#2a2720" strokeWidth="1" strokeDasharray="4 3" />

                    {/* === SSE STREAMING LAYER === */}
                    <rect x="120" y="220" width="280" height="24" rx="2" fill="#790f11" fillOpacity="0.06" stroke="#790f11" strokeWidth="0.5" strokeOpacity="0.3" />
                    <text x="260" y="236" textAnchor="middle" className="font-mono" fontSize="7" fill="#790f11" letterSpacing="0.14em">SSE REAL-TIME STREAM</text>

                    {/* Animated stream lines from server to SSE layer */}
                    <line x1="260" y1="88" x2="260" y2="220" stroke="url(#stream-grad)" strokeWidth="1.5">
                      <animate attributeName="strokeDasharray" values="0 30 10 0;10 0 0 30" dur="2s" repeatCount="indefinite" />
                    </line>

                    {/* Data pulses on the SSE line */}
                    <circle r="3" fill="#790f11" opacity="0.8">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path="M260,100 L260,220" />
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                    </circle>
                    <circle r="3" fill="#790f11" opacity="0.5">
                      <animateMotion dur="1.5s" repeatCount="indefinite" begin="0.75s" path="M260,100 L260,220" />
                      <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
                    </circle>

                    {/* === SDK CLIENT NODES (bottom row) === */}
                    {[
                      { x: 55, label: "React SDK", sub: "Client" },
                      { x: 185, label: "Node SDK", sub: "Server" },
                      { x: 315, label: "Python SDK", sub: "Server" },
                      { x: 445, label: "Mobile SDK", sub: "Client" },
                    ].map((sdk, i) => (
                      <g key={i}>
                        {/* Connection from SSE to SDK */}
                        <line x1={sdk.x} y1="244" x2={sdk.x} y2="290" stroke="#2a2720" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={sdk.x} cy="267" r="2" fill="#790f11" opacity="0.4">
                          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
                        </circle>

                        {/* SDK box */}
                        <rect x={sdk.x - 48} y="290" width="96" height="48" rx="2" fill="#1a1814" stroke="#2a2720" strokeWidth="1" />
                        <text x={sdk.x} y="310" textAnchor="middle" className="font-mono" fontSize="8" fill="#C1BCA9" opacity="0.8">{sdk.label}</text>
                        <text x={sdk.x} y="326" textAnchor="middle" className="font-mono" fontSize="7" fill="#5c5848">{sdk.sub}</text>
                      </g>
                    ))}

                    {/* === EVALUATION FLOW CALLOUT === */}
                    <rect x="370" y="60" width="130" height="56" rx="2" fill="#1a1814" stroke="#790f11" strokeWidth="0.5" opacity="0.8" />
                    <text x="435" y="76" textAnchor="middle" className="font-mono" fontSize="7" fill="#790f11" letterSpacing="0.05em">EVALUATION</text>
                    <text x="435" y="90" textAnchor="middle" className="font-mono" fontSize="9" fill="#C1BCA9" opacity="0.9">{"<"}1ms latency</text>
                    <text x="435" y="106" textAnchor="middle" className="font-mono" fontSize="7" fill="#5c5848">2M evals/sec</text>
                    {/* Arrow from server to callout */}
                    <line x1="335" y1="54" x2="370" y2="72" stroke="#790f11" strokeWidth="0.5" opacity="0.4" />

                    {/* === TOGGLE INDICATOR === */}
                    <g transform="translate(30, 60)">
                      <rect width="80" height="36" rx="2" fill="#1a1814" stroke="#790f11" strokeWidth="0.5" opacity="0.6" />
                      <circle cx="56" cy="18" r="8" fill="#790f11" opacity="0.2" />
                      <circle cx="56" cy="18" r="5" fill="#790f11" opacity="0.6" />
                      <rect x="14" y="14" width="24" height="8" rx="4" fill="#352f26" />
                      <text x="48" y="32" textAnchor="middle" className="font-mono" fontSize="6" fill="#5c5848">ON</text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Floating metric cards */}
              <div className="absolute -bottom-4 -right-4 card-technical px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-label-xs text-text-secondary">
                  SSE CONNECTED — STREAMING
                </span>
              </div>

              <div className="absolute -top-3 -left-3 card-technical px-3 py-2 flex items-center gap-2">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1L7.5 4.5L11 5.5L8.5 8L9 11.5L6 10L3 11.5L3.5 8L1 5.5L4.5 4.5L6 1Z" fill="#790f11" opacity="0.7" />
                </svg>
                <span className="font-mono text-label-xs text-text-muted">
                  2.4K STARS
                </span>
              </div>

              {/* Decorative crosshairs */}
              <div className="absolute -top-2 -right-2 font-mono text-xs text-text-muted/20">+</div>
              <div className="absolute -bottom-2 -left-2 font-mono text-xs text-text-muted/20">+</div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Bottom grid line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}

function Crosshair({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute font-mono text-sm text-text-primary/[0.06] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}
