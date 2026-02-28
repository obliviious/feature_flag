import ScrollReveal from "./ScrollReveal";

const tiers = [
  {
    name: "Open Source",
    price: "Free",
    period: "forever",
    description: "Self-hosted, full control. Perfect for startups and side projects.",
    features: [
      "Unlimited flags",
      "Unlimited environments",
      "SSE real-time streaming",
      "Rust evaluation engine",
      "Community support",
      "MIT license",
    ],
    cta: "Deploy Now",
    ctaStyle: "border",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    description: "Managed hosting with advanced features for growing teams.",
    features: [
      "Everything in Open Source",
      "Managed cloud hosting",
      "Audit log & history",
      "Team RBAC controls",
      "Slack & webhook integrations",
      "99.9% uptime SLA",
      "Priority email support",
    ],
    cta: "Start Free Trial",
    ctaStyle: "filled",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Dedicated infrastructure, compliance, and white-glove onboarding.",
    features: [
      "Everything in Pro",
      "Dedicated infrastructure",
      "SOC2 & HIPAA compliance",
      "SSO / SAML",
      "Custom SLAs",
      "Dedicated support engineer",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    ctaStyle: "border",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="absolute inset-0 hatching pointer-events-none opacity-20" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <ScrollReveal>
            <div className="label-badge mb-8 mx-auto">Pricing</div>
          </ScrollReveal>
          <ScrollReveal delay={1}>
            <h2 className="font-serif text-display-md mb-6">
              Start free. Scale when you&apos;re ready.
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={2}>
            <p className="text-text-secondary leading-relaxed">
              The open-source core is free forever. Add managed hosting and
              enterprise features when your team needs them.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border">
          {tiers.map((tier, i) => (
            <ScrollReveal key={tier.name} delay={(i + 1) as 1 | 2 | 3}>
              <div
                className={`flex flex-col h-full p-8 md:p-10 relative ${
                  tier.highlighted
                    ? "bg-bg-card border-t-2 border-t-accent-red"
                    : "bg-bg-primary"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-accent-red/[0.04] to-transparent pointer-events-none" />
                )}

                {/* Tier name */}
                <div className="font-mono text-label-xs uppercase text-text-muted mb-4 relative">
                  {tier.name}
                </div>

                {/* Price */}
                <div className="mb-2 relative">
                  <span className="font-serif text-display-md text-text-primary">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-text-muted text-sm ml-1">
                      {tier.period}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-text-secondary text-sm leading-relaxed mb-8 relative">
                  {tier.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-10 flex-1 relative">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="text-accent-red mt-0.5 text-xs shrink-0">
                        {">>>"}
                      </span>
                      <span className="font-mono text-label-xs uppercase text-text-secondary">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href="#"
                  className={`block text-center font-mono text-label-sm uppercase py-3.5 transition-all relative ${
                    tier.ctaStyle === "filled"
                      ? "bg-accent-red text-white hover:bg-accent-red-hover"
                      : "border border-border-lighter text-text-secondary hover:text-text-primary hover:border-text-muted"
                  }`}
                >
                  {tier.cta}
                </a>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
