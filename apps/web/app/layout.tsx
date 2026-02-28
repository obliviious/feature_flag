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
          colorPrimary: "#790f11",
          colorBackground: "#1a1814",
          colorInputBackground: "#141311",
          colorInputText: "#C1BCA9",
          colorText: "#C1BCA9",
          colorTextSecondary: "#8a8574",
          colorNeutral: "#C1BCA9",
          borderRadius: "0px",
          fontFamily: '"DM Sans", system-ui, sans-serif',
          fontSize: "0.875rem",
        },
        elements: {
          card: "bg-[#1a1814] border border-[#2a2720] shadow-none",
          headerTitle: "font-serif text-2xl text-[#C1BCA9]",
          headerSubtitle: "text-[#7a7565] font-mono text-xs uppercase tracking-wider",
          socialButtonsBlockButton:
            "bg-[#141311] border border-[#352f26] text-[#C1BCA9] hover:bg-[#1e1c16] hover:border-[#3d3830] transition-all",
          socialButtonsBlockButtonText: "font-mono text-xs uppercase tracking-wider",
          formFieldLabel: "font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[#7a7565]",
          formFieldInput:
            "bg-[#141311] border-[#352f26] text-[#C1BCA9] focus:border-[#790f11] focus:ring-0 rounded-none",
          formButtonPrimary:
            "bg-[#790f11] hover:bg-[#8e1517] text-[#C1BCA9] font-mono text-xs uppercase tracking-wider rounded-none",
          footerActionLink: "text-[#790f11] hover:text-[#a3191c] font-mono text-xs uppercase",
          identityPreview: "bg-[#141311] border border-[#2a2720]",
          identityPreviewText: "text-[#C1BCA9]",
          identityPreviewEditButton: "text-[#790f11]",
          dividerLine: "bg-[#352f26]",
          dividerText: "text-[#5c5848] font-mono text-[0.6rem] uppercase tracking-widest",
          formFieldInputShowPasswordButton: "text-[#5c5848] hover:text-[#8a8574]",
          otpCodeFieldInput: "bg-[#141311] border-[#352f26] text-[#C1BCA9] rounded-none",
          alert: "bg-[#1a1210] border border-[#3a1515] text-[#C1BCA9]",
          avatarBox: "rounded-none border border-[#352f26]",
          userButtonPopoverCard: "bg-[#1a1814] border border-[#2a2720] rounded-none shadow-2xl",
          userButtonPopoverActionButton: "hover:bg-[#1e1c16]",
          userButtonPopoverActionButtonText: "font-mono text-xs uppercase tracking-wider text-[#8a8574]",
          userButtonPopoverFooter: "hidden",
          userPreviewMainIdentifier: "font-mono text-sm text-[#C1BCA9]",
          userPreviewSecondaryIdentifier: "font-mono text-xs text-[#7a7565]",
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
