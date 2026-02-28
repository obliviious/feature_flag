import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustedBy from "@/components/TrustedBy";
import GrowthStages from "@/components/GrowthStages";
import Features from "@/components/Features";
import DeepDive from "@/components/DeepDive";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import OpenSource from "@/components/OpenSource";
import Pricing from "@/components/Pricing";
import Testimonials from "@/components/Testimonials";
import BlogPreview from "@/components/BlogPreview";
import CTABanner from "@/components/CTABanner";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <TrustedBy />
      <GrowthStages />
      <Features />
      <DeepDive />
      <Stats />
      <HowItWorks />
      <OpenSource />
      <Pricing />
      <Testimonials />
      <BlogPreview />
      <CTABanner />
      <Footer />
    </main>
  );
}
