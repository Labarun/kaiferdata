import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, ArrowLeft, ArrowRight, ShieldCheck, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageLoader } from "@/components/shared/LoadingState";
import { Helmet } from "react-helmet-async";
import { marked } from "marked";
import { StructuredData, buildArticleSchema, buildBreadcrumbSchema } from "@/components/seo/StructuredData";

interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery<BlogPostDetail | null>({
    queryKey: ["blog_post_detail", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fetch recent posts for the bottom sidebar
  const { data: recentPosts = [] } = useQuery<any[]>({
    queryKey: ["blog_recent_posts", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("title, slug, published_at")
        .eq("is_published", true)
        .neq("slug", slug || "")
        .order("published_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return <PageLoader />;
  }

  if (error || !post) {
    return (
      <div className="container max-w-4xl py-20 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Post not found</h2>
        <p className="text-muted-foreground mb-8">
          The blog article you are looking for does not exist or has been removed.
        </p>
        <Button asChild rounded-xl>
          <Link to="/blog">Back to Blog Spot</Link>
        </Button>
      </div>
    );
  }

  // Parse markdown content to safe HTML
  const htmlContent = marked.parse(post.content || "");

  const articleSchema = buildArticleSchema(
    post.title,
    post.excerpt,
    post.cover_image_url || "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800",
    post.published_at
  );

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Home", url: "https://kaiferdata.com/" },
    { name: "Blog Spot", url: "https://kaiferdata.com/blog" },
    { name: post.title, url: `https://kaiferdata.com/blog/${post.slug}` }
  ]);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <Helmet>
        <title>{post.meta_title || post.title} | Kaifer Data Ghana</title>
        <meta name="description" content={post.meta_description || post.excerpt} />
        <meta property="og:title" content={`${post.meta_title || post.title} | Kaifer Data Ghana`} />
        <meta property="og:description" content={post.meta_description || post.excerpt} />
        {post.cover_image_url && <meta property="og:image" content={post.cover_image_url} />}
        <meta property="og:type" content="article" />
        <meta property="article:published_time" content={post.published_at} />
        <meta property="article:section" content={post.category} />
      </Helmet>

      <StructuredData data={[articleSchema, breadcrumbSchema]} />

      {/* Back link */}
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Blog Spot
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Post Column */}
        <article className="lg:col-span-8 space-y-6">
          <div className="space-y-4">
            <Badge className="bg-primary/95 text-primary-foreground font-medium py-1 px-3">
              {post.category}
            </Badge>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-foreground">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-xs text-muted-foreground pb-4 border-b border-border/20">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-4 w-4" />
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <User className="h-4 w-4" />
                Kaifer Team
              </span>
            </div>
          </div>

          {/* Markdown Content (Rendered using tailwind prose rules) */}
          <div
            className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-hr:border-border/30 prose-table:border prose-table:border-collapse prose-th:bg-muted/40 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border/20"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Share/Footer Widget */}
          <div className="mt-12 p-6 rounded-3xl border border-border/30 bg-card/25 flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500 fill-current" />
              <span className="text-sm font-medium text-muted-foreground">
                Thanks for reading! Help others by sharing this post.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                rounded-xl
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }}
              >
                Copy Post Link
              </Button>
            </div>
          </div>
        </article>

        {/* Sidebar/Widgets Column */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Purchase Call-to-Action Card */}
          <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10 overflow-hidden rounded-3xl relative">
            <div className="absolute top-0 right-0 h-16 w-16 bg-primary/20 rounded-bl-full flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <CardContent className="p-6 space-y-4">
              <h3 className="text-lg font-bold">Buy Cheap MTN Data</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Save money on your MTN data bills in Ghana! Instantly purchase high-speed 90-day bundles from Kaifer Data.
              </p>

              <ul className="space-y-2 text-xs font-semibold text-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Up to 90 Days Validity
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Swift Delivery.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Trusted Reseller
                </li>
              </ul>

              <Button asChild className="w-full h-10 text-xs font-bold shadow-md shadow-primary/20" rounded-xl>
                <Link to="/buy?network=MTN">Buy Cheap Data Now</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Articles */}
          {recentPosts.length > 0 && (
            <Card className="rounded-3xl border-border/20 bg-card/15">
              <CardContent className="p-5 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/60">
                  Recent Articles
                </h3>
                <div className="space-y-4">
                  {recentPosts.map((rPost) => (
                    <div key={rPost.slug} className="space-y-1 group">
                      <h4 className="text-xs font-bold leading-snug group-hover:text-primary transition-colors">
                        <Link to={`/blog/${rPost.slug}`}>{rPost.title}</Link>
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(rPost.published_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border/20">
                  <Link
                    to="/blog"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5 transition-all"
                  >
                    View all posts <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
