import ScrollReveal from "./ScrollReveal";

export default function DeepDive() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 vlines pointer-events-none opacity-30" />

      {/* Grid decorations */}
      <div className="absolute left-[8%] top-0 bottom-0 w-px bg-border" />
      <div className="absolute right-[8%] top-0 bottom-0 w-px bg-border opacity-50" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-16 lg:gap-24 items-center">
          {/* Left — Text content */}
          <div>
            <ScrollReveal>
              <h2 className="font-serif text-display-lg mb-10">
                Feature flags will become the standard for every deployment
                pipeline.
              </h2>
            </ScrollReveal>

            <div className="grid sm:grid-cols-2 gap-8 mb-10">
              <ScrollReveal delay={1}>
                <div className="mb-4">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="18" stroke="#C1BCA9" strokeWidth="0.8" fill="none" opacity="0.3" />
                    <ellipse cx="24" cy="24" rx="10" ry="18" stroke="#C1BCA9" strokeWidth="0.6" fill="none" opacity="0.25" />
                    <line x1="6" y1="24" x2="42" y2="24" stroke="#C1BCA9" strokeWidth="0.5" opacity="0.2" />
                    <line x1="24" y1="6" x2="24" y2="42" stroke="#C1BCA9" strokeWidth="0.5" opacity="0.2" />
                    <ellipse cx="24" cy="16" rx="15" ry="3" stroke="#C1BCA9" strokeWidth="0.4" fill="none" opacity="0.15" />
                    <ellipse cx="24" cy="32" rx="15" ry="3" stroke="#C1BCA9" strokeWidth="0.4" fill="none" opacity="0.15" />
                  </svg>
                </div>
                <p className="text-text-secondary text-[0.9rem] leading-relaxed">
                  Feature flags are fundamentally changing how teams release
                  software. Instead of big-bang deployments, progressive
                  delivery lets you test in production with real users while
                  maintaining full control over the experience.
                </p>
              </ScrollReveal>

              <ScrollReveal delay={2}>
                <div className="mb-4">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <line x1="24" y1="6" x2="24" y2="18" stroke="#C1BCA9" strokeWidth="1" opacity="0.3" />
                    <line x1="24" y1="30" x2="24" y2="42" stroke="#C1BCA9" strokeWidth="1" opacity="0.3" />
                    <line x1="6" y1="24" x2="18" y2="24" stroke="#C1BCA9" strokeWidth="1" opacity="0.3" />
                    <line x1="30" y1="24" x2="42" y2="24" stroke="#C1BCA9" strokeWidth="1" opacity="0.3" />
                    <path d="M30 18 L36 18 L36 12" stroke="#C1BCA9" strokeWidth="0.8" fill="none" opacity="0.3" />
                    <path d="M18 30 L12 30 L12 36" stroke="#C1BCA9" strokeWidth="0.8" fill="none" opacity="0.3" />
                  </svg>
                </div>
                <p className="text-text-secondary text-[0.9rem] leading-relaxed">
                  This enables teams to identify issues earlier, reduce
                  incident blast radius, and deliver personalized experiences
                  at scale — all while maintaining the safety and confidence
                  that comes from granular control.
                </p>
              </ScrollReveal>
            </div>

            <ScrollReveal delay={3}>
              <a href="#" className="red-link">
                Read Documentation {">>>"}
              </a>
            </ScrollReveal>
          </div>

          {/* Right — Globe / Binary visualization */}
          <ScrollReveal delay={1} className="hidden lg:block">
            <div className="relative aspect-square max-w-[500px] ml-auto">
              {/* Binary text background */}
              <div className="absolute inset-0 font-mono text-[0.55rem] leading-[1.1rem] text-text-muted/[0.08] overflow-hidden select-none break-all">
                {Array.from({ length: 40 }, (_, row) => (
                  <div key={row}>
                    {Array.from({ length: 45 }, () =>
                      Math.random() > 0.5 ? "1" : "0"
                    ).join(" ")}
                  </div>
                ))}
              </div>

              {/* Globe wireframe */}
              <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full" fill="none">
                <circle cx="200" cy="200" r="140" stroke="#C1BCA9" strokeWidth="0.6" opacity="0.15" />

                {[-80, -40, 0, 40, 80].map((offset) => (
                  <ellipse
                    key={`lat-${offset}`}
                    cx="200"
                    cy={200 + offset}
                    rx={Math.sqrt(140 * 140 - offset * offset)}
                    ry={12}
                    stroke="#C1BCA9"
                    strokeWidth="0.4"
                    opacity="0.08"
                  />
                ))}

                {[0, 30, 60, 90, 120, 150].map((angle) => {
                  const rad = (angle * Math.PI) / 180;
                  const rx = 140 * Math.cos(rad);
                  return (
                    <ellipse
                      key={`lon-${angle}`}
                      cx="200"
                      cy="200"
                      rx={Math.abs(rx) || 1}
                      ry="140"
                      stroke="#C1BCA9"
                      strokeWidth="0.4"
                      opacity="0.08"
                    />
                  );
                })}

                {/* Red orbital ring */}
                <ellipse
                  cx="200"
                  cy="200"
                  rx="170"
                  ry="50"
                  stroke="#790f11"
                  strokeWidth="1.2"
                  opacity="0.4"
                  transform="rotate(-20 200 200)"
                />

                {/* Second ring (dashed) */}
                <ellipse
                  cx="200"
                  cy="200"
                  rx="155"
                  ry="45"
                  stroke="#790f11"
                  strokeWidth="0.6"
                  opacity="0.2"
                  strokeDasharray="6 6"
                  transform="rotate(-20 200 200)"
                />

                {/* Data points on the globe */}
                {[
                  [160, 140], [240, 170], [180, 260], [220, 120],
                  [260, 220], [150, 200], [200, 160], [230, 280],
                ].map(([x, y], i) => (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={i < 3 ? "#790f11" : "#5c5848"}
                    opacity={i < 3 ? 0.6 : 0.3}
                  />
                ))}
              </svg>
            </div>
          </ScrollReveal>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
