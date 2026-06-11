import { notFound } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getAllPosts, getPostBySlug } from "@/lib/blog";

export async function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — FlagForge Blog`,
    description: post.excerpt,
  };
}

marked.setOptions({ gfm: true, breaks: false });

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const html = marked.parse(post.content) as string;
  const all = getAllPosts();
  const others = all.filter((p) => p.slug !== post.slug);

  return (
    <main>
      <Navbar />
      <div className="pt-16" />

      {/* Hero */}
      <section className="py-20 md:py-28 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 grid-dots pointer-events-none opacity-20" />
        <div className="max-w-3xl mx-auto px-6 md:px-10 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 font-mono text-label-xs text-text-muted mb-8">
            <Link href="/blog" className="hover:text-accent-red transition-colors">
              Blog
            </Link>
            <span>/</span>
            <span className="text-accent-red uppercase">{post.tag}</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-text-primary mb-6">
            {post.title}
          </h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-8 max-w-2xl">
            {post.excerpt}
          </p>

          {/* Meta bar */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent-red/20 border border-accent-red/30 flex items-center justify-center">
                <span className="font-mono text-[10px] text-accent-red">FF</span>
              </div>
              <div>
                <div className="font-mono text-label-xs text-text-primary">FlagForge Engineering</div>
                <div className="font-mono text-label-xs text-text-muted">{post.date}</div>
              </div>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="font-mono text-label-xs text-text-muted">{post.readTime}</span>
            <div className="h-4 w-px bg-border" />
            <span className="font-mono text-label-xs uppercase text-accent-red border border-accent-red/30 px-2 py-0.5">
              {post.tag}
            </span>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-6 md:px-10">
          {/* Decorative top line */}
          <div className="flex items-center gap-4 mb-12">
            <div className="h-px flex-1 bg-border" />
            <div className="font-mono text-label-xs text-text-muted">///</div>
            <div className="h-px flex-1 bg-border" />
          </div>

          <article
            className="prose-flagforge"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-6 md:px-10">
        <div className="h-px bg-border mb-16" />
      </div>

      {/* More posts */}
      {others.length > 0 && (
        <section className="pb-24">
          <div className="max-w-3xl mx-auto px-6 md:px-10">
            <div className="font-mono text-label-xs text-text-muted uppercase mb-8">
              Continue Reading
            </div>
            <div className="grid md:grid-cols-2 gap-px bg-border">
              {others.map((other) => (
                <Link
                  key={other.slug}
                  href={`/blog/${other.slug}`}
                  className="bg-bg-primary p-6 group hover:bg-bg-card transition-colors"
                >
                  <div className="font-mono text-label-xs text-accent-red uppercase mb-3">
                    {other.tag}
                  </div>
                  <h3 className="font-serif text-base md:text-lg text-text-primary group-hover:text-accent-red transition-colors mb-2 leading-snug">
                    {other.title}
                  </h3>
                  <p className="text-text-secondary text-sm line-clamp-2 leading-relaxed mb-4">
                    {other.excerpt}
                  </p>
                  <div className="flex items-center gap-3 font-mono text-label-xs text-text-muted">
                    <span>{other.date}</span>
                    <span>·</span>
                    <span>{other.readTime}</span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link href="/blog" className="red-link">
                ← All Posts
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
