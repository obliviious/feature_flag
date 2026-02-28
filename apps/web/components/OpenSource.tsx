import ScrollReveal from "./ScrollReveal";

export default function OpenSource() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 hatching pointer-events-none opacity-20" />

      {/* Red accent glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent-red/[0.02] blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left — Repo visualization */}
          <ScrollReveal className="order-2 lg:order-1">
            <div className="card-technical p-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 1C5.03 1 1 5.03 1 10c0 3.97 2.58 7.34 6.16 8.53.45.08.62-.2.62-.43v-1.5c-2.51.55-3.04-1.21-3.04-1.21-.41-1.04-1-1.32-1-1.32-.82-.56.06-.55.06-.55.9.07 1.38.93 1.38.93.8 1.38 2.1.98 2.62.75.08-.58.31-.98.57-1.2-2-.23-4.1-1-4.1-4.46 0-.99.35-1.8.93-2.43-.09-.23-.4-1.15.09-2.4 0 0 .76-.24 2.48.93a8.6 8.6 0 014.52 0c1.72-1.17 2.48-.93 2.48-.93.49 1.25.18 2.17.09 2.4.58.63.93 1.44.93 2.43 0 3.47-2.11 4.23-4.12 4.45.32.28.61.83.61 1.68v2.49c0 .24.16.52.62.43A9.01 9.01 0 0019 10c0-4.97-4.03-9-9-9z" fill="#e8e4de" opacity="0.6" />
                </svg>
                <span className="font-mono text-label-xs text-text-secondary">
                  flagforge / flagforge
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <polygon points="7,1 8.5,5 13,5 9.5,8 11,12.5 7,10 3,12.5 4.5,8 1,5 5.5,5" fill="#e8e4de" opacity="0.4" />
                  </svg>
                  <span className="font-mono text-label-xs text-text-muted">2.4k</span>
                </div>
              </div>

              {/* File tree */}
              <div className="px-6 py-5 font-mono text-[0.7rem] leading-7 text-text-secondary">
                <div className="text-text-muted/40">.</div>
                <FileEntry icon="dir" name="apps/" accent />
                <FileEntry icon="dir" name="  server/" indent />
                <FileEntry icon="file" name="    src/main.rs" indent dim />
                <FileEntry icon="dir" name="  web/" indent />
                <FileEntry icon="dir" name="packages/" accent />
                <FileEntry icon="dir" name="  eval-core/" indent />
                <FileEntry icon="file" name="    src/lib.rs" indent dim />
                <FileEntry icon="dir" name="sdks/" accent />
                <FileEntry icon="dir" name="  typescript/" indent />
                <FileEntry icon="dir" name="  python/" indent />
                <FileEntry icon="file" name="Cargo.toml" />
                <FileEntry icon="file" name="LICENSE" dim />
                <FileEntry icon="file" name="README.md" dim />
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-6 px-6 py-3 border-t border-border bg-bg-card">
                <StatPill label="Rust" color="#dea584" />
                <StatPill label="TypeScript" color="#3178c6" />
                <StatPill label="Python" color="#3572a5" />
              </div>
            </div>
          </ScrollReveal>

          {/* Right — Copy */}
          <div className="order-1 lg:order-2">
            <ScrollReveal>
              <div className="label-badge mb-8">Open Source</div>
            </ScrollReveal>

            <ScrollReveal delay={1}>
              <h2 className="font-serif text-display-md mb-8">
                Built in the open. Backed by the community.
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={2}>
              <p className="text-text-secondary leading-relaxed mb-6">
                FlagForge is fully open source under the MIT license. Deploy
                it on your own infrastructure, audit every line of code, and
                contribute to the project. No vendor lock-in, ever.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={3}>
              <div className="grid grid-cols-3 gap-4 mb-10">
                <div className="text-center p-4 border border-border bg-bg-card">
                  <div className="font-serif text-2xl text-accent-red mb-1">23</div>
                  <div className="font-mono text-label-xs text-text-muted uppercase">Tests</div>
                </div>
                <div className="text-center p-4 border border-border bg-bg-card">
                  <div className="font-serif text-2xl text-accent-red mb-1">MIT</div>
                  <div className="font-mono text-label-xs text-text-muted uppercase">License</div>
                </div>
                <div className="text-center p-4 border border-border bg-bg-card">
                  <div className="font-serif text-2xl text-accent-red mb-1">Rust</div>
                  <div className="font-mono text-label-xs text-text-muted uppercase">Core</div>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={4}>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-mono text-label-sm uppercase px-6 py-3 border border-border-lighter text-text-secondary hover:text-text-primary hover:border-text-muted transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 0.8C3.84 0.8 0.47 4.17 0.47 8.33c0 3.32 2.15 6.14 5.14 7.13.38.07.52-.16.52-.36v-1.25c-2.09.46-2.53-1.01-2.53-1.01-.34-.87-.84-1.1-.84-1.1-.68-.47.05-.46.05-.46.75.05 1.15.77 1.15.77.67 1.15 1.76.82 2.19.63.07-.48.26-.82.47-1-1.67-.19-3.43-.84-3.43-3.72 0-.82.3-1.5.77-2.03-.08-.19-.34-.96.07-2 0 0 .63-.2 2.07.78a7.15 7.15 0 013.78 0c1.44-.98 2.07-.78 2.07-.78.41 1.04.15 1.81.07 2 .48.53.77 1.21.77 2.03 0 2.89-1.76 3.53-3.44 3.71.27.24.51.7.51 1.4v2.08c0 .2.14.44.52.36a8.33 8.33 0 005.14-7.13C15.53 4.17 12.16 0.8 8 0.8z" fill="currentColor" />
                  </svg>
                  Star on GitHub
                </a>
                <a href="#" className="red-link self-center">
                  View Source {">>>"}
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}

function FileEntry({
  icon,
  name,
  accent,
  indent,
  dim,
}: {
  icon: "dir" | "file";
  name: string;
  accent?: boolean;
  indent?: boolean;
  dim?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${dim ? "opacity-40" : ""}`}>
      <span className={`${indent ? "ml-0" : ""}`}>
        {icon === "dir" ? (
          <span className={accent ? "text-accent-red/60" : "text-text-muted/60"}>
            {name}
          </span>
        ) : (
          <span className="text-text-muted/60">{name}</span>
        )}
      </span>
    </div>
  );
}

function StatPill({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
      <span className="font-mono text-label-xs text-text-muted">{label}</span>
    </div>
  );
}
