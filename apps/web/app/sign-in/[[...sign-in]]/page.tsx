"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hatching pointer-events-none opacity-30" />
      <div className="absolute inset-0 vlines pointer-events-none opacity-20" />

      {/* Grid crosshairs */}
      <Crosshair x="5%" y="8%" />
      <Crosshair x="95%" y="8%" />
      <Crosshair x="5%" y="92%" />
      <Crosshair x="95%" y="92%" />
      <Crosshair x="50%" y="50%" />

      {/* Decorative red lines */}
      <div className="absolute top-0 left-[30%] w-px h-48 bg-gradient-to-b from-accent-red/30 to-transparent" />
      <div className="absolute bottom-0 right-[25%] w-px h-32 bg-gradient-to-t from-accent-red/20 to-transparent" />
      <div className="absolute top-[20%] right-0 w-32 h-px bg-gradient-to-l from-accent-red/20 to-transparent" />

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 xl:p-16 border-r border-border relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
            <rect x="2" y="4" width="16" height="20" rx="1" stroke="#790f11" strokeWidth="1.5" fill="none" />
            <path d="M18 8L26 4V24L18 20" stroke="#790f11" strokeWidth="1.5" fill="rgba(121,15,17,0.15)" />
            <rect x="6" y="9" width="8" height="1.5" rx="0.5" fill="#790f11" opacity="0.6" />
            <rect x="6" y="13" width="5" height="1.5" rx="0.5" fill="#790f11" opacity="0.4" />
          </svg>
          <span className="font-mono text-sm tracking-wider text-text-primary group-hover:text-accent-red transition-colors">
            FLAGFORGE
          </span>
        </Link>

        {/* Hero text */}
        <div className="max-w-md">
          <div className="label-badge mb-8">Welcome Back</div>
          <h1 className="font-serif text-display-lg mb-6">
            Control every release with confidence.
          </h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            Sign in to manage your feature flags, targeting rules, and
            deployment workflows across all your environments.
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            {[
              "Real-time SSE flag streaming",
              "Granular user targeting",
              "Instant one-click rollbacks",
              "Full audit trail",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <span className="text-accent-red font-mono text-label-xs">{">>>"}</span>
                <span className="font-mono text-label-xs uppercase text-text-muted tracking-wider">
                  {feat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="flex items-center gap-4">
          <div className="flex gap-[2px]">
            {Array.from({ length: 20 }, (_, i) => (
              <div
                key={i}
                className="bg-text-muted/20"
                style={{
                  width: i % 3 === 0 ? "2px" : "1px",
                  height: `${8 + Math.sin(i * 0.5) * 6}px`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-label-xs text-text-muted/40 uppercase">
            FlagForge v0.1.0
          </span>
        </div>
      </div>

      {/* Right panel — Sign-in form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10 group">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
            <rect x="2" y="4" width="16" height="20" rx="1" stroke="#790f11" strokeWidth="1.5" fill="none" />
            <path d="M18 8L26 4V24L18 20" stroke="#790f11" strokeWidth="1.5" fill="rgba(121,15,17,0.15)" />
          </svg>
          <span className="font-mono text-sm tracking-wider text-text-primary">FLAGFORGE</span>
        </Link>

        <div className="w-full max-w-md">
          {/* Top label */}
          <div className="mb-8 text-center lg:text-left">
            <div className="number-badge inline-flex mb-4">01</div>
            <h2 className="font-serif text-2xl md:text-3xl mb-2">Sign In</h2>
            <p className="font-mono text-label-xs uppercase text-text-muted tracking-wider">
              Access your FlagForge dashboard
            </p>
          </div>

          {/* Clerk SignIn component */}
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                cardBox: "w-full shadow-none",
                card: "w-full bg-transparent border-0 shadow-none p-0",
                header: "hidden",
                footer: "justify-center",
              },
            }}
            forceRedirectUrl="/dashboard"
          />

          {/* Bottom info */}
          <div className="mt-10 pt-6 border-t border-border text-center">
            <p className="font-mono text-label-xs text-text-muted uppercase tracking-wider">
              Protected by Clerk Authentication
            </p>
            <div className="flex justify-center gap-6 mt-4">
              <span className="font-mono text-label-xs text-text-muted/50 uppercase">SOC2</span>
              <span className="text-border-lighter">|</span>
              <span className="font-mono text-label-xs text-text-muted/50 uppercase">GDPR</span>
              <span className="text-border-lighter">|</span>
              <span className="font-mono text-label-xs text-text-muted/50 uppercase">RS256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Crosshair({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute font-mono text-sm text-text-primary/[0.06] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}
