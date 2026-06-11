import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";

export const metadata = {
  title: "Blog — FlagForge",
  description: "Engineering insights, best practices, and case studies from the FlagForge team.",
};

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main>
      <Navbar />
      <div className="pt-16" />

      {/* Header */}
      <section className="py-24 md:py-32 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 grid-dots pointer-events-none opacity-20" />
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
          <div className="label-badge mb-8">Blog</div>
          <h1 className="font-serif text-display-lg mb-6">
            Engineering insights &amp; deep dives.
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Architecture decisions, real-world trade-offs, and case studies from
            building FlagForge — a production-grade feature flag system in Rust.
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="bg-bg-primary group flex flex-col hover:bg-bg-card transition-colors"
              >
                {/* Image placeholder */}
                <div className="aspect-[16/9] bg-bg-card hatching-red border-b border-border relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="font-mono text-label-xs text-text-muted/30 uppercase tracking-widest">
                      {post.tag}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-accent-red/20 group-hover:bg-accent-red/60 transition-colors" />
                </div>

                <div className="p-6 md:p-8 flex flex-col flex-1">
                  <div className="font-mono text-label-xs text-accent-red mb-4 uppercase">
                    {post.tag}
                  </div>
                  <h2 className="font-serif text-lg md:text-xl mb-3 text-text-primary group-hover:text-accent-red transition-colors leading-snug">
                    {post.title}
                  </h2>
                  <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 font-mono text-label-xs text-text-muted">
                      <span>{post.date}</span>
                      <span className="text-border-lighter">|</span>
                      <span>{post.readTime}</span>
                    </div>
                    <span className="font-mono text-label-xs text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                      Read →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
