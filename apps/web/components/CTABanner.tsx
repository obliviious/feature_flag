import ScrollReveal from "./ScrollReveal";

export default function CTABanner() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        <ScrollReveal>
          <div className="relative overflow-hidden bg-accent-red p-12 md:p-20 text-center">
            {/* Hatching overlay */}
            <div className="absolute inset-0 hatching pointer-events-none opacity-40" />

            {/* Grid decorations */}
            <div className="absolute top-4 left-4 font-mono text-xs text-text-primary/20">+</div>
            <div className="absolute top-4 right-4 font-mono text-xs text-text-primary/20">+</div>
            <div className="absolute bottom-4 left-4 font-mono text-xs text-text-primary/20">+</div>
            <div className="absolute bottom-4 right-4 font-mono text-xs text-text-primary/20">+</div>

            <div className="relative z-10">
              <h2 className="font-serif text-display-md text-text-primary mb-6 max-w-3xl mx-auto">
                Start shipping features with confidence today.
              </h2>
              <p className="font-mono text-label-sm uppercase text-text-primary/60 mb-10 max-w-xl mx-auto tracking-wider">
                Deploy the open-source server in minutes. No credit card
                required. Full feature set from day one.
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-8 py-4 bg-text-primary text-bg-primary hover:bg-[#d4cfbc] transition-colors"
                >
                  Get Started Free
                  <span className="text-accent-red">{">>>"}</span>
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-8 py-4 border border-text-primary/30 text-text-primary hover:border-text-primary/60 transition-colors"
                >
                  View Documentation
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
