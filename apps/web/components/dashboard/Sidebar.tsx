"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { useProject } from "@/lib/project-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    title: "Main",
    items: [
      {
        label: "Overview",
        href: "/dashboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
      },
      {
        label: "Flags",
        href: "/dashboard/flags",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="9" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M10 4L15 2V12L10 10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
      },
      {
        label: "Environments",
        href: "/dashboard/environments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 1.5C8 1.5 4 5 4 8s4 6.5 4 6.5" stroke="currentColor" strokeWidth="0.8" />
            <path d="M8 1.5C8 1.5 12 5 12 8s-4 6.5-4 6.5" stroke="currentColor" strokeWidth="0.8" />
            <line x1="1.5" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        ),
      },
      {
        label: "Segments",
        href: "/dashboard/segments",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="12" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="8" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="5.5" y1="5.5" x2="7" y2="10" stroke="currentColor" strokeWidth="0.8" />
            <line x1="10.5" y1="5.5" x2="9" y2="10" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        label: "SDK Keys",
        href: "/dashboard/sdk-keys",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="5" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="8.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.2" />
            <line x1="12" y1="8" x2="12" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="14" y1="8" x2="14" y2="10" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        label: "Audit Log",
        href: "/dashboard/audit-log",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1" width="12" height="14" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="0.8" />
            <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="0.8" />
            <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="0.8" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { project } = useProject();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-60 bg-[#100f0d] border-r border-border flex flex-col transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
              <rect x="2" y="4" width="16" height="20" rx="1" stroke="#790f11" strokeWidth="1.5" fill="none" />
              <path d="M18 8L26 4V24L18 20" stroke="#790f11" strokeWidth="1.5" fill="rgba(121,15,17,0.15)" />
            </svg>
            <span className="font-mono text-xs tracking-wider text-text-primary group-hover:text-accent-red transition-colors">
              FLAGFORGE
            </span>
          </Link>
        </div>

        {/* Project selector */}
        <div className="px-3 py-3 border-b border-border">
          <button className="w-full flex items-center gap-2.5 px-2.5 py-2 bg-bg-card border border-border hover:border-border-lighter transition-colors group">
            <div className="w-6 h-6 bg-accent-red/10 border border-accent-red/20 flex items-center justify-center shrink-0">
              <span className="font-mono text-[0.55rem] text-accent-red">FF</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="font-mono text-[0.65rem] text-text-primary truncate">
                {project?.name || "No Project"}
              </div>
              <div className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
                {project?.slug || "—"}
              </div>
            </div>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-text-muted shrink-0">
              <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {navigation.map((group) => (
            <div key={group.title}>
              <div className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-text-muted/60 px-2.5 mb-1.5">
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-2.5 py-[7px] mb-px transition-all font-mono text-[0.65rem] uppercase tracking-wider ${
                      active
                        ? "text-accent-red bg-accent-red/[0.06] border-l-2 border-accent-red -ml-[2px] pl-[12px]"
                        : "text-text-muted hover:text-text-secondary hover:bg-bg-card"
                    }`}
                  >
                    <span className={active ? "text-accent-red" : "text-text-muted"}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom — SSE status + user */}
        <div className="border-t border-border px-3 py-3 space-y-2.5 shrink-0">
          {/* Connection indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-mono text-[0.5rem] text-text-muted uppercase tracking-wider">
              SSE Connected
            </span>
          </div>

          {/* User */}
          <div className="flex items-center gap-2.5 px-2.5 py-1.5">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-6 h-6 rounded-none border border-[#352f26]",
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[0.6rem] text-text-primary truncate">
                {isLoaded && user ? (user.firstName || user.primaryEmailAddress?.emailAddress || "User") : "..."}
              </div>
              <div className="font-mono text-[0.5rem] text-text-muted truncate">
                {isLoaded && user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
