import Navbar from "@/components/Navbar";
import Pricing from "@/components/Pricing";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Pricing — FlagForge",
  description: "Start free with open source. Scale with managed hosting and enterprise features.",
};

export default function PricingPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-16" />
      <Pricing />
      <CTABanner />
      <Footer />
    </main>
  );
}
