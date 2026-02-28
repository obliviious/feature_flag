"use client";

import { useState } from "react";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <div className="flex h-screen overflow-hidden bg-bg-primary">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top bar */}
            <header className="h-14 flex items-center justify-between px-5 border-b border-border bg-bg-primary/80 backdrop-blur-sm shrink-0 z-20">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex flex-col gap-1 p-2 -ml-2"
                aria-label="Open sidebar"
              >
                <span className="block w-4 h-px bg-text-primary" />
                <span className="block w-4 h-px bg-text-primary" />
                <span className="block w-4 h-px bg-text-primary" />
              </button>

              {/* Breadcrumb area (left side on desktop) */}
              <div className="hidden lg:flex items-center gap-2">
                <span className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider">
                  Dashboard
                </span>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-3">
                {/* Search */}
                <button className="flex items-center gap-2 px-3 py-1.5 bg-bg-card border border-border hover:border-border-lighter transition-colors">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="#555" strokeWidth="1.2" />
                    <line x1="11" y1="11" x2="15" y2="15" stroke="#555" strokeWidth="1.2" />
                  </svg>
                  <span className="font-mono text-[0.55rem] text-text-muted uppercase tracking-wider hidden sm:block">
                    Search...
                  </span>
                  <span className="font-mono text-[0.5rem] text-text-muted/50 border border-border-lighter px-1 py-0.5 hidden sm:block">
                    /
                  </span>
                </button>

                {/* Notifications */}
                <button className="relative p-2 text-text-muted hover:text-text-secondary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1.5C5.24 1.5 3 3.74 3 6.5v3l-1.5 2h13L13 9.5v-3C13 3.74 10.76 1.5 8 1.5z" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M6 12.5c0 1.1.9 2 2 2s2-.9 2-2" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-accent-red rounded-full" />
                </button>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              <div className="hatching absolute inset-0 pointer-events-none opacity-10" />
              {children}
            </main>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
