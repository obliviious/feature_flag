import ScrollReveal from "./ScrollReveal";

const steps = [
  {
    num: "01",
    title: "Wrap Features in Flags",
    description:
      "Add a simple SDK call around any new feature. Ship the code to production — the flag stays off until you're ready.",
    code: `if (ff.isEnabled("new-pricing")) {\n  showNewPricing();\n}`,
  },
  {
    num: "02",
    title: "Define Targeting Rules",
    description:
      "Create segments based on user attributes, geography, plan tier, or any custom property. Set percentage rollouts for gradual releases.",
    code: `segment: plan === "enterprise"\nrollout: 25% → 50% → 100%`,
  },
  {
    num: "03",
    title: "Release in Real Time",
    description:
      "Toggle flags from the dashboard. Changes stream instantly to all connected SDKs via SSE — no redeploy, no cache invalidation.",
    code: `event: config\ndata: { "new-pricing": true }`,
  },
  {
    num: "04",
    title: "Monitor and Rollback",
    description:
      "Watch metrics in real time. If something breaks, kill the flag instantly. Full audit log tracks every change and who made it.",
    code: `flag: "new-pricing" → OFF\nrecovery: 0ms (instant)`,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="absolute inset-0 grid-dots pointer-events-none opacity-30" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <ScrollReveal>
          <div className="label-badge mb-8">How It Works</div>
        </ScrollReveal>

        <ScrollReveal delay={1}>
          <h2 className="font-serif text-display-md max-w-2xl mb-16">
            From code to production in four steps. No complexity, no
            ceremony.
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-px bg-border">
          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={(i % 4 + 1) as 1 | 2 | 3 | 4}>
              <div className="bg-bg-primary p-8 md:p-10 h-full flex flex-col relative group">
                {/* Number */}
                <div className="number-badge mb-6">{step.num}</div>

                {/* Title */}
                <h3 className="font-serif text-xl md:text-2xl mb-4 text-text-primary">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-text-secondary text-sm leading-relaxed mb-6">
                  {step.description}
                </p>

                {/* Code snippet */}
                <div className="mt-auto bg-bg-card border border-border p-4 font-mono text-label-xs text-text-muted">
                  {step.code.split("\n").map((line, j) => (
                    <div key={j} className="whitespace-pre">
                      {line}
                    </div>
                  ))}
                </div>

                {/* Connecting line to next step */}
                {i < 3 && (
                  <div className="absolute -bottom-[1px] left-1/2 w-px h-3 bg-border-lighter opacity-0 md:opacity-100 z-10" />
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
