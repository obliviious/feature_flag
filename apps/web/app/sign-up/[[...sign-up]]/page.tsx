"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
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

      {/* Decorative red lines */}
      <div className="absolute top-0 right-[35%] w-px h-40 bg-gradient-to-b from-accent-red/30 to-transparent" />
      <div className="absolute bottom-0 left-[20%] w-px h-28 bg-gradient-to-t from-accent-red/20 to-transparent" />
      <div className="absolute top-[30%] left-0 w-24 h-px bg-gradient-to-r from-accent-red/20 to-transparent" />

      {/* Left panel — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 xl:p-16 border-r border-border relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
            <rect x="2" y="4" width="16" height="20" rx="1" stroke="#c23b3b" strokeWidth="1.5" fill="none" />
            <path d="M18 8L26 4V24L18 20" stroke="#c23b3b" strokeWidth="1.5" fill="rgba(194,59,59,0.15)" />
            <rect x="6" y="9" width="8" height="1.5" rx="0.5" fill="#c23b3b" opacity="0.6" />
            <rect x="6" y="13" width="5" height="1.5" rx="0.5" fill="#c23b3b" opacity="0.4" />
          </svg>
          <span className="font-mono text-sm tracking-wider text-text-primary group-hover:text-accent-red transition-colors">
            FLAGFORGE
          </span>
        </Link>

        {/* Hero text */}
        <div className="max-w-md">
          <div className="label-badge mb-8">Get Started</div>
          <h1 className="font-serif text-display-lg mb-6">
            Deploy your first flag in under 5 minutes.
          </h1>
          <p className="text-text-secondary leading-relaxed mb-8">
            Create your free account and start shipping features with
            progressive delivery, real-time streaming, and instant
            rollbacks.
          </p>

          {/* Steps */}
          <div className="space-y-5">
            {[
              { num: "01", text: "Create your account" },
              { num: "02", text: "Set up your first project" },
              { num: "03", text: "Deploy a flag to production" },
              { num: "04", text: "Ship with confidence" },
            ].map((step) => (
              <div key={step.num} className="flex items-center gap-4">
                <div className="number-badge shrink-0">{step.num}</div>
                <span className="font-mono text-label-xs uppercase text-text-secondary tracking-wider">
                  {step.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — social proof */}
        <div>
          <p className="font-mono text-label-xs text-text-muted/40 uppercase tracking-wider mb-3">
            Trusted by teams at
          </p>
          <div className="flex gap-6">
            {["VERCEL", "STRIPE", "LINEAR", "SUPABASE"].map((name) => (
              <span
                key={name}
                className="font-mono text-label-xs text-text-muted/25 tracking-[0.2em]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Sign-up form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden flex items-center gap-2.5 mb-10 group">
          <svg viewBox="0 0 28 28" fill="none" className="w-7 h-7">
            <rect x="2" y="4" width="16" height="20" rx="1" stroke="#c23b3b" strokeWidth="1.5" fill="none" />
            <path d="M18 8L26 4V24L18 20" stroke="#c23b3b" strokeWidth="1.5" fill="rgba(194,59,59,0.15)" />
          </svg>
          <span className="font-mono text-sm tracking-wider text-text-primary">FLAGFORGE</span>
        </Link>

        <div className="w-full max-w-md">
          {/* Top label */}
          <div className="mb-8 text-center lg:text-left">
            <div className="number-badge inline-flex mb-4">02</div>
            <h2 className="font-serif text-2xl md:text-3xl mb-2">
              Create Account
            </h2>
            <p className="font-mono text-label-xs uppercase text-text-muted tracking-wider">
              Start building with FlagForge — free forever
            </p>
          </div>

          {/* Clerk SignUp component */}
          <SignUp
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
            <p className="font-mono text-label-xs text-text-muted uppercase tracking-wider mb-1">
              No credit card required
            </p>
            <p className="font-mono text-label-xs text-text-muted/50 uppercase tracking-wider">
              Open source &bull; MIT License &bull; Self-hostable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Crosshair({ x, y }: { x: string; y: string }) {
  return (
    <div
      className="absolute font-mono text-sm text-white/[0.06] pointer-events-none select-none"
      style={{ left: x, top: y }}
    >
      +
    </div>
  );
}
