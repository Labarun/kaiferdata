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
            <div className="group relative grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 bg-card/30 border border-border/30 hover:border-primary/30 p-5 rounded-3xl transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
              <div className="lg:col-span-7 overflow-hidden rounded-2xl aspect-video lg:aspect-auto lg:h-[380px] relative">
                <img
                  src={
                    featuredPost.cover_image_url ||
                    "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"
                  }
                  alt={featuredPost.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <Badge className="absolute top-4 left-4 bg-primary/90 text-primary-foreground backdrop-blur-sm border-0 font-medium">
                  {featuredPost.category}
                </Badge>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

                <h2 className="text-xl lg:text-3xl font-bold tracking-tight leading-tight group-hover:text-primary transition-colors">
                  <Link to={`/blog/${featuredPost.slug}`}>{featuredPost.title}</Link>
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  {featuredPost.excerpt}
                </p>

                <div className="pt-2">
                  <Link
                    to={`/blog/${featuredPost.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                  >
                    Read Article <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Grid of other posts */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(activeCategory !== "All" || searchQuery ? filteredPosts : regularPosts).map(
              (post) => (
                <article
                  key={post.id}
                  className="group flex flex-col bg-card/25 border border-border/20 hover:border-primary/20 rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    <img
                      src={
                        post.cover_image_url ||
                        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800"
                      }
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <Badge className="absolute top-3 left-3 bg-background/80 hover:bg-background text-foreground backdrop-blur-sm border-0 text-[10px] font-semibold py-0.5 px-2">
                      {post.category}
                    </Badge>
                  </div>

                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-2">
                      <Link
                        to={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:gap-2.5 transition-all"
                      >
                        Read Article <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
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
