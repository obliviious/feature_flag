import Link from "next/link";
import ScrollReveal from "./ScrollReveal";
import { getAllPosts } from "@/lib/blog";

export default function BlogPreview() {
  const posts = getAllPosts().slice(0, 3);

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute inset-0 grid-dots pointer-events-none opacity-20" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 relative z-10">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div>
            <ScrollReveal>
              <div className="label-badge mb-8">From the Blog</div>
            </ScrollReveal>
            <ScrollReveal delay={1}>
              <h2 className="font-serif text-display-md">
                Insights &amp; engineering deep dives.
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal delay={2}>
            <Link href="/blog" className="red-link">
              View All Posts {">>>"}
            </Link>
          </ScrollReveal>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-border">
          {posts.map((post, i) => (
            <ScrollReveal key={post.slug} delay={(i + 1) as 1 | 2 | 3}>
              <Link
                href={`/blog/${post.slug}`}
                className="bg-bg-primary h-full flex flex-col group"
              >
                {/* Image placeholder with hatching */}
                <div className="aspect-[16/9] bg-bg-card hatching-red border-b border-border relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="font-mono text-label-xs text-text-muted/30 uppercase tracking-widest">
                      {post.tag}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-accent-red/20 group-hover:bg-accent-red/60 transition-colors" />
                </div>

                <div className="p-6 md:p-8 flex flex-col flex-1">
                  {/* Tag */}
                  <div className="font-mono text-label-xs text-accent-red mb-4 uppercase">
                    {post.tag}
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-lg md:text-xl mb-3 text-text-primary group-hover:text-accent-red transition-colors">
                    {post.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                  </p>

                  {/* Meta */}
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
            </ScrollReveal>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
    </section>
  );
}
