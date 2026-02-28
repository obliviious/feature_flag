import Navbar from "@/components/Navbar";
import BlogPreview from "@/components/BlogPreview";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Blog — FlagForge",
  description: "Engineering insights, best practices, and case studies from the FlagForge team.",
};

export default function BlogPage() {
  return (
    <main>
      <Navbar />
      <div className="pt-16" />
      <section className="py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="label-badge mb-8">Blog</div>
          <h1 className="font-serif text-display-lg mb-6">
            Engineering insights & deep dives.
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mb-4">
            Best practices, architecture decisions, and case studies from the
            FlagForge team and community.
          </p>
        </div>
      </section>
      <BlogPreview />
      <Footer />
    </main>
  );
}
