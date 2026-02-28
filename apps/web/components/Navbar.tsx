"use client";

import { useState, useEffect } from "react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg-primary/90 backdrop-blur-md border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 relative">
            <svg viewBox="0 0 28 28" fill="none" className="w-full h-full">
              <rect x="2" y="4" width="16" height="20" rx="1" stroke="#790f11" strokeWidth="1.5" fill="none" />
              <path d="M18 8L26 4V24L18 20" stroke="#790f11" strokeWidth="1.5" fill="rgba(121,15,17,0.15)" />
              <rect x="6" y="9" width="8" height="1.5" rx="0.5" fill="#790f11" opacity="0.6" />
              <rect x="6" y="13" width="5" height="1.5" rx="0.5" fill="#790f11" opacity="0.4" />
            </svg>
          </div>
          <span className="font-mono text-sm tracking-wider text-text-primary group-hover:text-accent-red transition-colors">
            FLAGFORGE
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            Pricing
          </a>
          <Link href="/docs" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            Docs
          </Link>
          <Link href="/blog" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            Blog
          </Link>
          <a href="https://github.com/flagforge/flagforge" target="_blank" rel="noopener noreferrer" className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors">
            GitHub
          </a>
        </div>

        {/* Auth CTA */}
        <div className="hidden md:flex items-center gap-4">
          <SignedOut>
            <Link
              href="/sign-in"
              className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="font-mono text-label-xs uppercase px-5 py-2 bg-accent-red text-text-primary hover:bg-accent-red-hover transition-colors"
            >
              Get Started
            </Link>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="font-mono text-label-xs uppercase text-text-secondary hover:text-text-primary transition-colors"
            >
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-none border border-[#352f26]",
                  userButtonPopoverCard: "bg-[#1a1814] border border-[#2a2720] rounded-none",
                },
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-3">
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-7 h-7 rounded-none border border-[#352f26]",
                },
              }}
            />
          </SignedIn>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex flex-col gap-1.5 p-2"
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-px bg-text-primary transition-transform ${mobileOpen ? "rotate-45 translate-y-[3.5px]" : ""}`} />
            <span className={`block w-5 h-px bg-text-primary transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-px bg-text-primary transition-transform ${mobileOpen ? "-rotate-45 -translate-y-[3.5px]" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-bg-primary/95 backdrop-blur-md border-t border-border px-6 py-6 flex flex-col gap-4">
          {[
            { label: "Features", href: "#features" },
            { label: "How It Works", href: "#how-it-works" },
            { label: "Pricing", href: "#pricing" },
            { label: "Docs", href: "/docs" },
            { label: "Blog", href: "/blog" },
            { label: "GitHub", href: "https://github.com/flagforge/flagforge" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="font-mono text-label-sm uppercase text-text-secondary hover:text-text-primary transition-colors py-2"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}

          <div className="border-t border-border pt-4 mt-2 flex flex-col gap-3">
            <SignedOut>
              <Link
                href="/sign-in"
                className="font-mono text-label-sm uppercase text-text-secondary hover:text-text-primary transition-colors py-2"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="font-mono text-label-sm uppercase px-5 py-3 bg-accent-red text-text-primary text-center hover:bg-accent-red-hover transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Get Started
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="font-mono text-label-sm uppercase px-5 py-3 bg-accent-red text-text-primary text-center hover:bg-accent-red-hover transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      )}
    </nav>
  );
}
