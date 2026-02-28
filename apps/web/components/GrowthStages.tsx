import ScrollReveal from "./ScrollReveal";

const stages = [
  {
    title: "Deploy",
    description: "WRAP NEW FEATURES IN FLAGS AND SHIP CODE WITHOUT RISK.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Bar chart icon */}
        <rect x="6" y="30" width="5" height="10" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.4" />
        <rect x="14" y="24" width="5" height="16" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.5" />
        <rect x="22" y="18" width="5" height="22" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.6" />
        <rect x="30" y="12" width="5" height="28" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.7" />
        <rect x="38" y="8" width="5" height="32" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.8" />
        <line x1="4" y1="40" x2="44" y2="40" stroke="#e8e4de" strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
  },
  {
    title: "Target",
    description: "GRANULAR USER SEGMENTATION AND PERCENTAGE ROLLOUTS.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Curved growth dotted line */}
        <path
          d="M6 38 Q12 36 18 30 Q24 22 30 16 Q36 10 42 8"
          stroke="#c23b3b"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 3"
          opacity="0.7"
        />
        <circle cx="18" cy="30" r="2" fill="#c23b3b" opacity="0.5" />
        <circle cx="30" cy="16" r="2" fill="#c23b3b" opacity="0.7" />
        <circle cx="42" cy="8" r="2.5" fill="#c23b3b" opacity="0.9" />
      </svg>
    ),
  },
  {
    title: "Rollout",
    description: "PROGRESSIVE DELIVERY WITH REAL-TIME MONITORING AND CONTROLS.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Overlapping squares */}
        <rect x="8" y="14" width="18" height="18" stroke="#e8e4de" strokeWidth="1" fill="none" opacity="0.3" strokeDasharray="3 2" />
        <rect x="18" y="8" width="18" height="18" stroke="#c23b3b" strokeWidth="1.2" fill="none" opacity="0.6" />
        <rect x="22" y="12" width="10" height="10" fill="rgba(194,59,59,0.12)" stroke="#c23b3b" strokeWidth="0.5" opacity="0.8" />
      </svg>
    ),
  },
  {
    title: "Scale",
    description: "ENTERPRISE-GRADE PERFORMANCE WITH SSE STREAMING TO ALL SDKS.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Starburst / expansion */}
        <circle cx="24" cy="24" r="3" fill="#c23b3b" opacity="0.6" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 24 + Math.cos(rad) * 6;
          const y1 = 24 + Math.sin(rad) * 6;
          const x2 = 24 + Math.cos(rad) * 16;
          const y2 = 24 + Math.sin(rad) * 16;
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#c23b3b"
              strokeWidth="1"
              opacity="0.5"
              strokeDasharray={angle % 90 === 0 ? "none" : "2 2"}
            />
          );
        })}
      </svg>
    ),
  },
];

export default function GrowthStages() {
  return (
    <section className="relative py-24 md:py-32">
      {/* Background */}
      <div className="absolute inset-0 hatching pointer-events-none opacity-50" />

      {/* Grid line decorations */}
      <Crosshair x="4%" y="4%" />
      <Crosshair x="96%" y="4%" />
      <Crosshair x="4%" y="96%" />
      <Crosshair x="96%" y="96%" />
      <Crosshair x="50%" y="0%" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-20">
          {/* Left — Copy */}
          <div>
            <ScrollReveal>
              <div className="label-badge mb-8">Deployment Lifecycle</div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h2 className="font-serif text-display-lg mb-8">
                Supporting teams at every stage. Flags are the new
                deployment primitive.
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={2}>
              <p className="font-mono text-label-xs uppercase text-text-muted max-w-md leading-relaxed mb-8">
                A complete feature management platform that decouples code
                deployment from feature releases, enabling teams to ship
                faster with confidence.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={3}>
              <a href="#features" className="red-link">
                Explore Features {">>>"}
              </a>
            </ScrollReveal>
          </div>

          {/* Right — Stage cards 2x2 */}
          <div className="grid grid-cols-2 gap-px bg-border">
            {stages.map((stage, i) => (
              <ScrollReveal key={stage.title} delay={(i + 1) as 1 | 2 | 3 | 4}>
                <div className="bg-bg-card p-6 md:p-8 h-full flex flex-col hover:bg-bg-card-hover transition-colors">
                  <div className="mb-6">{stage.icon}</div>
                  <h3 className="font-serif text-xl md:text-2xl mb-3 text-text-primary">
                    {stage.title}
                  </h3>
                  <p className="font-mono text-label-xs uppercase text-text-secondary leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA Bar */}
      <ScrollReveal className="mt-20 md:mt-24 mx-6 md:mx-10">
        <a href="#" className="cta-bar block max-w-[1400px] mx-auto">
          START DEPLOYING WITH FLAGS
        </a>
      </ScrollReveal>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}

function Crosshair({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute font-mono text-sm text-white/[0.08] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}
