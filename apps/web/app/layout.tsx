import type { Metadata } from "next";
import { Playfair_Display, JetBrains_Mono, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlagForge — Ship Features Fearlessly",
  description:
    "The open-source feature flag platform built for modern engineering teams. Real-time streaming, granular targeting, and instant rollbacks.",
  keywords: [
    "feature flags",
    "feature toggles",
    "release management",
    "A/B testing",
    "gradual rollout",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#c23b3b",
          colorBackground: "#151515",
          colorInputBackground: "#111111",
          colorInputText: "#e8e4de",
          colorText: "#e8e4de",
          colorTextSecondary: "#999999",
          colorNeutral: "#e8e4de",
          borderRadius: "0px",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.875rem",
        },
        elements: {
          card: "bg-[#151515] border border-[#1e1e1e] shadow-none",
          headerTitle: "font-serif text-2xl text-[#e8e4de]",
          headerSubtitle: "text-[#777] font-mono text-xs uppercase tracking-wider",
          socialButtonsBlockButton:
            "bg-[#111] border border-[#2a2a2a] text-[#e8e4de] hover:bg-[#1c1c1c] hover:border-[#333] transition-all",
          socialButtonsBlockButtonText: "font-mono text-xs uppercase tracking-wider",
          formFieldLabel: "font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#777]",
          formFieldInput:
            "bg-[#111] border-[#2a2a2a] text-[#e8e4de] focus:border-[#c23b3b] focus:ring-0 rounded-none",
          formButtonPrimary:
            "bg-[#c23b3b] hover:bg-[#d44444] text-white font-mono text-xs uppercase tracking-wider rounded-none",
          footerActionLink: "text-[#c23b3b] hover:text-[#d44444] font-mono text-xs uppercase",
          identityPreview: "bg-[#111] border border-[#1e1e1e]",
          identityPreviewText: "text-[#e8e4de]",
          identityPreviewEditButton: "text-[#c23b3b]",
          dividerLine: "bg-[#2a2a2a]",
          dividerText: "text-[#555] font-mono text-[0.6rem] uppercase tracking-widest",
          formFieldInputShowPasswordButton: "text-[#555] hover:text-[#999]",
          otpCodeFieldInput: "bg-[#111] border-[#2a2a2a] text-[#e8e4de] rounded-none",
          alert: "bg-[#1a1010] border border-[#3a1515] text-[#e8a0a0]",
          avatarBox: "rounded-none border border-[#2a2a2a]",
          userButtonPopoverCard: "bg-[#151515] border border-[#1e1e1e] rounded-none shadow-2xl",
          userButtonPopoverActionButton: "hover:bg-[#1c1c1c]",
          userButtonPopoverActionButtonText: "font-mono text-xs uppercase tracking-wider text-[#999]",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "font-mono text-sm text-[#e8e4de]",
          userPreviewSecondaryIdentifier: "font-mono text-xs text-[#777]",
        },
      }}
    >
      <html
        lang="en"
        className={`${playfair.variable} ${jetbrains.variable} ${dmSans.variable}`}
      >
        <body className="bg-bg-primary text-text-primary font-sans noise-overlay">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
