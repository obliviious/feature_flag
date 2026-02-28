export default function Footer() {
  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Documentation", href: "#" },
        { label: "Changelog", href: "#" },
        { label: "Roadmap", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Blog", href: "/blog" },
        { label: "Guides", href: "#" },
        { label: "API Reference", href: "#" },
        { label: "SDK Libraries", href: "#" },
        { label: "Status Page", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Contact", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "GitHub", href: "#" },
        { label: "Discord", href: "#" },
        { label: "Twitter", href: "#" },
        { label: "Contributing", href: "#" },
        { label: "Code of Conduct", href: "#" },
      ],
    },
  ];

  return (
    <footer className="relative border-t border-border bg-bg-secondary/30">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-20">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="4" width="16" height="20" rx="1" stroke="#790f11" strokeWidth="1.5" fill="none" />
                <path d="M18 8L26 4V24L18 20" stroke="#790f11" strokeWidth="1.5" fill="rgba(121,15,17,0.15)" />
              </svg>
              <span className="font-mono text-sm tracking-wider text-text-primary">
                FLAGFORGE
              </span>
            </a>
            <p className="font-mono text-label-xs text-text-muted leading-relaxed uppercase max-w-[200px]">
              Open-source feature flags for modern teams.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-label-xs uppercase text-text-primary mb-4 tracking-wider">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-mono text-label-xs text-text-muted hover:text-text-secondary transition-colors uppercase"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-mono text-label-xs text-text-muted uppercase">
            &copy; {new Date().getFullYear()} FlagForge. MIT License.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-text-muted hover:text-text-secondary transition-colors" aria-label="GitHub">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0.8C3.84 0.8 0.47 4.17 0.47 8.33c0 3.32 2.15 6.14 5.14 7.13.38.07.52-.16.52-.36v-1.25c-2.09.46-2.53-1.01-2.53-1.01-.34-.87-.84-1.1-.84-1.1-.68-.47.05-.46.05-.46.75.05 1.15.77 1.15.77.67 1.15 1.76.82 2.19.63.07-.48.26-.82.47-1-1.67-.19-3.43-.84-3.43-3.72 0-.82.3-1.5.77-2.03-.08-.19-.34-.96.07-2 0 0 .63-.2 2.07.78a7.15 7.15 0 013.78 0c1.44-.98 2.07-.78 2.07-.78.41 1.04.15 1.81.07 2 .48.53.77 1.21.77 2.03 0 2.89-1.76 3.53-3.44 3.71.27.24.51.7.51 1.4v2.08c0 .2.14.44.52.36a8.33 8.33 0 005.14-7.13C15.53 4.17 12.16 0.8 8 0.8z" />
              </svg>
            </a>
            <a href="#" className="text-text-muted hover:text-text-secondary transition-colors" aria-label="Twitter">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.6 1.5h2.2L9.9 7.1l5.8 7.4h-4.6l-3.5-4.5-4 4.5H1.4l5.2-5.9L1.1 1.5h4.7l3.2 4.1 3.6-4.1zm-.8 11.6h1.2L5.1 2.8H3.8l8 10.3z" />
              </svg>
            </a>
            <a href="#" className="text-text-muted hover:text-text-secondary transition-colors" aria-label="Discord">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.5 3.2A12.3 12.3 0 0010.5 2a.05.05 0 00-.05.02c-.13.24-.28.55-.38.8a11.4 11.4 0 00-3.44 0 8.6 8.6 0 00-.39-.8.05.05 0 00-.05-.02 12.3 12.3 0 00-3 1.2.05.05 0 00-.02.02C1.3 6.3.8 9.3 1.04 12.27a.05.05 0 00.02.04 12.4 12.4 0 003.74 1.9.05.05 0 00.06-.02c.29-.39.54-.8.76-1.24a.05.05 0 00-.03-.07 8.2 8.2 0 01-1.17-.56.05.05 0 01-.01-.08c.08-.06.16-.12.23-.18a.05.05 0 01.05-.01c2.45 1.12 5.1 1.12 7.52 0a.05.05 0 01.05.01c.08.06.15.13.24.18a.05.05 0 01-.01.08c-.37.22-.76.4-1.17.56a.05.05 0 00-.03.07c.22.44.48.85.76 1.24a.05.05 0 00.05.02 12.4 12.4 0 003.75-1.9.05.05 0 00.02-.04c.28-3.37-.47-6.34-2-8.95a.04.04 0 00-.02-.02zM5.68 10.5c-.77 0-1.4-.71-1.4-1.58s.62-1.58 1.4-1.58 1.42.72 1.41 1.58c0 .87-.62 1.58-1.41 1.58zm5.24 0c-.77 0-1.4-.71-1.4-1.58s.61-1.58 1.4-1.58c.78 0 1.41.72 1.4 1.58 0 .87-.62 1.58-1.4 1.58z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
