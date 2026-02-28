"use client";

import ScrollReveal from "./ScrollReveal";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-16 overflow-hidden">
      {/* Background hatching */}
      <div className="absolute inset-0 hatching pointer-events-none" />
      <div className="absolute inset-0 vlines pointer-events-none opacity-40" />

      {/* Grid crosshair decorations */}
      <Crosshair x="5%" y="15%" />
      <Crosshair x="95%" y="15%" />
      <Crosshair x="50%" y="50%" />
      <Crosshair x="5%" y="85%" />
      <Crosshair x="95%" y="85%" />

      {/* Red accent line */}
      <div className="absolute top-0 left-[20%] w-px h-32 bg-gradient-to-b from-accent-red/40 to-transparent" />
      <div className="absolute top-12 right-[15%] w-24 h-px bg-gradient-to-r from-accent-red/30 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center min-h-[80vh]">
          {/* Left — Copy */}
          <div>
            <ScrollReveal>
              <div className="label-badge mb-8">Feature Flag Platform</div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h1 className="font-serif text-display-xl mb-8">
                Ship features{" "}
                <span className="text-accent-red">fearlessly.</span>{" "}
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
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-7 py-3.5 bg-accent-red text-white hover:bg-accent-red-hover transition-all"
                >
                  Start Building
                  <span className="text-white/60">{">>>"}</span>
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
              <p className="font-mono text-label-xs uppercase text-text-muted max-w-sm">
                Real-time SSE streaming. Granular user targeting. Zero
                downtime rollbacks. Open source under MIT.
              </p>
            </ScrollReveal>
          </div>

          {/* Right — Terminal / Code illustration */}
          <ScrollReveal delay={2} className="hidden lg:block">
            <div className="relative">
              {/* Terminal window */}
              <div className="card-technical p-0 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-bg-card">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-red/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-text-muted/30" />
                  <span className="ml-3 font-mono text-label-xs text-text-muted">
                    flagforge-sdk.ts
                  </span>
                </div>

                {/* Code content */}
                <div className="p-6 font-mono text-[0.75rem] leading-6 text-text-secondary">
                  <Line n={1}>
                    <span className="text-text-muted">{"// Initialize the FlagForge SDK"}</span>
                  </Line>
                  <Line n={2}>
                    <K>import</K> {"{ FlagForge }"} <K>from</K>{" "}
                    <S>&apos;@flagforge/sdk&apos;</S>
                  </Line>
                  <Line n={3}>&nbsp;</Line>
                  <Line n={4}>
                    <K>const</K> ff = <K>new</K>{" "}
                    <span className="text-accent-red">FlagForge</span>({"{"}
                  </Line>
                  <Line n={5}>
                    {"  "}sdkKey: <S>&apos;srv_k8x...&apos;</S>,
                  </Line>
                  <Line n={6}>
                    {"  "}streaming: <K>true</K>,
                  </Line>
                  <Line n={7}>{"}"});</Line>
                  <Line n={8}>&nbsp;</Line>
                  <Line n={9}>
                    <span className="text-text-muted">{"// Evaluate flags in real time"}</span>
                  </Line>
                  <Line n={10}>
                    <K>const</K> result = <K>await</K> ff.
                    <span className="text-accent-red">evaluate</span>({"{"}
                  </Line>
                  <Line n={11}>
                    {"  "}flagKey: <S>&apos;new-checkout-flow&apos;</S>,
                  </Line>
                  <Line n={12}>
                    {"  "}context: {"{"} userId, plan {"}"},
                  </Line>
                  <Line n={13}>{"}"});</Line>
                  <Line n={14}>&nbsp;</Line>
                  <Line n={15}>
                    <K>if</K> (result.<span className="text-accent-red">enabled</span>) {"{"}
                  </Line>
                  <Line n={16}>
                    {"  "}showNewCheckout();
                  </Line>
                  <Line n={17}>{"}"}</Line>
                </div>
              </div>

              {/* Floating status indicator */}
              <div className="absolute -bottom-4 -right-4 card-technical px-4 py-2.5 flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-label-xs text-text-secondary">
                  SSE CONNECTED — STREAMING
                </span>
              </div>

              {/* Decorative crosshairs around the card */}
              <div className="absolute -top-2 -left-2 font-mono text-xs text-text-muted/20">+</div>
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
      className="absolute font-mono text-sm text-white/[0.06] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}

function Line({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex">
      <span className="w-8 text-right mr-4 text-text-muted/40 select-none shrink-0">
        {n}
      </span>
      <span>{children}</span>
    </div>
  );
}

function K({ children }: { children: React.ReactNode }) {
  return <span className="text-accent-red/80">{children}</span>;
}

function S({ children }: { children: React.ReactNode }) {
  return <span className="text-green-600/80">{children}</span>;
}
