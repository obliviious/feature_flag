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
        layout: {
          logoPlacement: "none",
        },
        variables: {
          colorPrimary: "#790f11",
          colorBackground: "#141311",
          colorInputBackground: "#141311",
          colorInputText: "#C1BCA9",
          colorText: "#C1BCA9",
          colorTextSecondary: "#8a8574",
          colorTextOnPrimaryBackground: "#C1BCA9",
          colorNeutral: "#C1BCA9",
          colorDanger: "#a3191c",
          borderRadius: "0px",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.875rem",
        },
        elements: {
          // UserButton popover (dashboard header)
          userButtonPopoverCard: "bg-[#1a1814] border border-[#2a2720] shadow-2xl",
          userButtonPopoverActionButton: "hover:bg-[#1e1c16]",
          userButtonPopoverActionButtonText: "font-mono text-xs uppercase tracking-wider text-[#8a8574]",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "font-mono text-sm text-[#C1BCA9]",
          userPreviewSecondaryIdentifier: "font-mono text-xs text-[#7a7565]",
          avatarBox: "border border-[#352f26]",
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
