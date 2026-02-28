"use client";

import { RedirectToSignIn, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  return (
    <>
    <SignedOut>
      <RedirectToSignIn />
    </SignedOut>
    <SignedIn>
    <div className="min-h-screen bg-bg-primary relative">
      {/* Background */}
      <div className="absolute inset-0 hatching pointer-events-none opacity-15" />

      {/* Top bar */}
      <header className="border-b border-border bg-bg-secondary/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
                <rect x="2" y="4" width="16" height="20" rx="1" stroke="#c23b3b" strokeWidth="1.5" fill="none" />
                <path d="M18 8L26 4V24L18 20" stroke="#c23b3b" strokeWidth="1.5" fill="rgba(194,59,59,0.15)" />
              </svg>
              <span className="font-mono text-xs tracking-wider text-text-primary">
                FLAGFORGE
              </span>
            </Link>
            <span className="text-border-lighter">|</span>
            <span className="font-mono text-label-xs text-text-muted uppercase">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-label-xs text-text-muted hidden sm:block">
              {isLoaded && user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7 rounded-none border border-[#2a2a2a]",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 relative z-10">
        {/* Welcome */}
        <div className="mb-12">
          <div className="label-badge mb-4">Overview</div>
          <h1 className="font-serif text-display-md mb-3">
            Welcome{isLoaded && user ? `, ${user.firstName || "back"}` : ""}.
          </h1>
          <p className="text-text-secondary max-w-xl">
            Your feature flag dashboard is ready. Create projects, manage
            flags, and monitor deployments from here.
          </p>
        </div>

        {/* Quick action cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border mb-12">
          {[
            {
              num: "01",
              title: "Create Project",
              desc: "Set up a new project with environments and SDK keys.",
              action: "New Project",
            },
            {
              num: "02",
              title: "Create Flag",
              desc: "Add a new feature flag with variants and targeting rules.",
              action: "New Flag",
            },
            {
              num: "03",
              title: "View Documentation",
              desc: "Read the guides, API reference, and SDK documentation.",
              action: "Open Docs",
            },
          ].map((card) => (
            <div
              key={card.num}
              className="bg-bg-primary p-8 flex flex-col h-full group cursor-pointer hover:bg-bg-card transition-colors"
            >
              <div className="number-badge mb-6">{card.num}</div>
              <h3 className="font-serif text-xl mb-3 text-text-primary group-hover:text-accent-red transition-colors">
                {card.title}
              </h3>
              <p className="font-mono text-label-xs uppercase text-text-muted leading-relaxed mb-6 flex-1">
                {card.desc}
              </p>
              <span className="red-link">{card.action} {">>>"}</span>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="card-technical p-12 text-center">
          <div className="mb-6">
            <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 mx-auto opacity-30">
              <rect x="8" y="12" width="32" height="40" rx="2" stroke="#e8e4de" strokeWidth="1.5" fill="none" />
              <path d="M40 20L56 12V52L40 44" stroke="#c23b3b" strokeWidth="1.5" fill="rgba(194,59,59,0.1)" />
              <rect x="14" y="20" width="20" height="2" rx="1" fill="#e8e4de" opacity="0.2" />
              <rect x="14" y="26" width="14" height="2" rx="1" fill="#e8e4de" opacity="0.15" />
              <rect x="14" y="32" width="18" height="2" rx="1" fill="#e8e4de" opacity="0.1" />
            </svg>
          </div>
          <h3 className="font-serif text-xl mb-3 text-text-secondary">
            No projects yet
          </h3>
          <p className="font-mono text-label-xs uppercase text-text-muted tracking-wider mb-8 max-w-sm mx-auto">
            Create your first project to start managing feature flags across
            your environments.
          </p>
          <button className="font-mono text-label-sm uppercase px-8 py-3 bg-accent-red text-white hover:bg-accent-red-hover transition-colors inline-flex items-center gap-2">
            Create First Project
            <span className="text-white/60">{">>>"}</span>
          </button>
        </div>

        {/* Stats placeholders */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border mt-12">
          {[
            { label: "Projects", value: "0" },
            { label: "Flags", value: "0" },
            { label: "Environments", value: "0" },
            { label: "Evaluations", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="bg-bg-primary p-6 text-center">
              <div className="font-serif text-2xl text-accent-red mb-1">
                {stat.value}
              </div>
              <div className="font-mono text-label-xs text-text-muted uppercase tracking-wider">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </SignedIn>
    </>
  );
}
