import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Search, Calendar, User, ArrowRight, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { Helmet } from "react-helmet-async";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  published_at: string;
}

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const { data: posts = [], isLoading } = useQuery<BlogPost[]>({
    queryKey: ["blog_posts_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, cover_image_url, category, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Extract unique categories
  const categories = ["All", ...Array.from(new Set(posts.map((p) => p.category)))];

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPost = filteredPosts[0];
  const regularPosts = filteredPosts.slice(1);

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <Helmet>
        <title>Blog Spot — Kaifer Data Ghana</title>
        <meta
          name="description"
          content="Tips, guides, and updates on MTN cheap internet bundles, network updates, and mobile data saving tips in Ghana."
        />
        <meta property="og:title" content="Blog Spot — Kaifer Data Ghana" />
        <meta
          property="og:description"
          content="Tips, guides, and updates on MTN cheap internet bundles, network updates, and mobile data saving tips in Ghana."
        />
        <meta property="og:type" content="website" />
      </Helmet>

      <PageHeader
        title="Kaifer Blog Spot"
        description="Stay updated with the latest telecom tips, network updates, and tutorials on getting cheap MTN data in Ghana."
      />

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center my-8 bg-card/30 border border-border/40 p-4 rounded-2xl backdrop-blur-md">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                activeCategory === category
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            className="pl-10 h-10 rounded-xl bg-muted/20 border-border/30 focus:border-primary/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-12">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-card/40 border border-border/30 rounded-2xl p-4 space-y-4 animate-pulse"
            >
              <div className="aspect-video w-full bg-muted/60 rounded-xl" />
              <div className="h-5 bg-muted/60 w-3/4 rounded" />
              <div className="h-4 bg-muted/60 w-full rounded" />
              <div className="h-4 bg-muted/60 w-5/6 rounded" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20 bg-card/20 border border-border/30 rounded-3xl backdrop-blur-sm">
          <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4 stroke-[1.5]" />
          <h3 className="text-lg font-semibold mb-2">No articles found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            We couldn't find any blog posts matching your search or selected category. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Featured Post */}
          {featuredPost && activeCategory === "All" && !searchQuery && (
            <div className="group relative bg-card/30 border border-border/30 hover:border-primary/30 p-8 md:p-12 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col items-center text-center space-y-6">
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap justify-center">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-0 font-medium">
                  {featuredPost.category}
                </Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(featuredPost.published_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  Kaifer Team
                </span>
              </div>

              <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight group-hover:text-primary transition-colors max-w-4xl">
                <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
              </h2>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                {featuredPost.excerpt}
              </p>

              <div className="pt-4">
                <Link
                  to={`/blog/${featuredPost.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all bg-primary/5 hover:bg-primary/10 px-6 py-3 rounded-full"
                >
                  Read Article <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Grid of other posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeCategory !== "All" || searchQuery ? filteredPosts : regularPosts).map(
              (post) => (
                <article
                  key={post.id}
                  className="group flex flex-col bg-card/25 border border-border/20 hover:border-primary/20 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 p-6 space-y-4 min-h-[220px]"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-background hover:bg-background text-foreground border border-border/30 text-[10px] font-semibold py-0.5 px-2">
                      {post.category}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.published_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">
                    {post.excerpt}
                  </p>

                  <div className="pt-3 border-t border-border/10 mt-auto">
                    <Link
                      to={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5 transition-all"
                    >
                      Read Article <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
