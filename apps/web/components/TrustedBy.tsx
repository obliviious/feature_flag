import ScrollReveal from "./ScrollReveal";

const companies = [
  "VERCEL", "STRIPE", "LINEAR", "SUPABASE", "RAILWAY",
  "PLANETSCALE", "RESEND", "TURSO", "NEON", "FLY.IO",
];

export default function TrustedBy() {
  return (
    <section className="relative py-12 border-y border-border overflow-hidden bg-bg-secondary/50">
      <ScrollReveal>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <p className="font-mono text-label-xs uppercase text-text-muted text-center mb-8 tracking-widest">
            Trusted by engineering teams at
          </p>
        </div>

        {/* Ticker / Marquee */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />

          <div className="overflow-hidden">
            <div className="ticker-track">
              {[...companies, ...companies].map((name, i) => (
                <div
                  key={i}
                  className="flex items-center shrink-0 mx-10"
                >
                  <span className="font-mono text-label-sm text-text-muted/50 tracking-[0.2em]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
