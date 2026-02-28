import ScrollReveal from "./ScrollReveal";

const testimonials = [
  {
    quote:
      "FlagForge replaced our homegrown feature flag system in a week. The real-time streaming means our mobile SDK gets updates instantly — no more polling delays.",
    name: "Sarah Chen",
    title: "VP of Engineering",
    company: "TechScale",
  },
  {
    quote:
      "We cut our deployment incident rate by 73% in three months. The ability to instantly kill a flag when metrics degrade has been transformative for our on-call team.",
    name: "Marcus Rodriguez",
    title: "Staff SRE",
    company: "DataFlow",
  },
  {
    quote:
      "The Rust evaluation engine processes our targeting rules in microseconds. We evaluated 2M flag checks per second in load testing without breaking a sweat.",
    name: "Aiko Tanaka",
    title: "Principal Engineer",
    company: "CloudPeak",
  },
];

export default function Testimonials() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <ScrollReveal>
          <div className="label-badge mb-8">What Teams Say</div>
        </ScrollReveal>

        <ScrollReveal delay={1}>
          <h2 className="font-serif text-display-md max-w-2xl mb-16">
            Trusted by engineering teams building at scale.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-px bg-border">
          {testimonials.map((t, i) => (
            <ScrollReveal key={t.name} delay={(i + 1) as 1 | 2 | 3}>
              <div className="bg-bg-primary p-8 md:p-10 h-full flex flex-col">
                {/* Quote mark */}
                <div className="font-serif text-4xl text-accent-red/30 mb-4 leading-none select-none">
                  &ldquo;
                </div>

                {/* Quote text */}
                <p className="text-text-secondary text-sm leading-relaxed mb-8 flex-1">
                  {t.quote}
                </p>

                {/* Author */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    {/* Avatar placeholder */}
                    <div className="w-8 h-8 bg-bg-card border border-border flex items-center justify-center font-mono text-label-xs text-text-muted">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="font-mono text-label-xs text-text-primary uppercase">
                        {t.name}
                      </div>
                      <div className="font-mono text-label-xs text-text-muted">
                        {t.title}, {t.company}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
