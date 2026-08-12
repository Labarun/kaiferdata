import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Eye,
  Edit,
  Sparkles,
  Settings,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { renderMarkdownSafe } from "@/lib/sanitizeMarkdown";

interface BlogPostFormData {
  title: string;
  slug: string;
  category: string;
  cover_image_url: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  is_published: boolean;
}

export default function AdminBlogEditPage() {
  const { postId } = useParams<{ postId: string }>();
  const isEditMode = !!postId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<BlogPostFormData>({
    title: "",
    slug: "",
    category: "Guides",
    cover_image_url: "",
    excerpt: "",
    content: "",
    meta_title: "",
    meta_description: "",
    is_published: false,
  });

  const [activeTab, setActiveTab] = useState<"write" | "split" | "preview">("split");

  // Fetch post data if in edit mode
  const { isLoading: isFetching } = useQuery({
    queryKey: ["admin_blog_post_edit", postId],
    queryFn: async () => {
      if (!postId) return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          title: data.title || "",
          slug: data.slug || "",
          category: data.category || "Guides",
          cover_image_url: data.cover_image_url || "",
          excerpt: data.excerpt || "",
          content: data.content || "",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          is_published: data.is_published || false,
        });
      }
      return data;
    },
    enabled: isEditMode,
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formData.title,
        slug: formData.slug,
        category: formData.category,
        cover_image_url: formData.cover_image_url || null,
        excerpt: formData.excerpt,
        content: formData.content,
        meta_title: formData.meta_title || null,
        meta_description: formData.meta_description || null,
        is_published: formData.is_published,
        published_at: formData.is_published
          ? new Date().toISOString()
          : null,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", postId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blog_posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog_posts_public"] });
      toast.success(isEditMode ? "Article updated successfully!" : "Article created successfully!");
      navigate("/admin/blog");
    },
    onError: (err: any) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  // Auto-generate slug from title
  const handleTitleChange = (titleVal: string) => {
    setFormData((prev) => {
      const updated = { ...prev, title: titleVal };
      if (!isEditMode) {
        // Simple slugify helper
        updated.slug = titleVal
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      return updated;
    });
  };

  const handleFieldChange = (key: keyof BlogPostFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a title.");
      return;
    }
    if (!formData.slug.trim()) {
      toast.error("Please enter a slug.");
      return;
    }
    if (!formData.content.trim()) {
      toast.error("Please enter some article content.");
      return;
    }
    saveMutation.mutate();
  };

  // Convert markdown to HTML for live preview
  const renderedHtml = renderMarkdownSafe(formData.content || "");

  if (isFetching) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-in space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/20 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog"
            className="p-2 hover:bg-muted/65 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <PageHeader
            title={isEditMode ? "Edit Blog Post" : "Create New Post"}
            description={isEditMode ? `Editing slug: ${formData.slug}` : "Draft a new SEO blog article"}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full sm:w-auto shadow-md shadow-primary/20 rounded-xl"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Article
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: General Settings Form */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border-border/30 bg-card/25 backdrop-blur-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Core Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. How to get cheap MTN data"
                  className="rounded-xl bg-muted/20 border-border/30 h-10"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-xs font-semibold">Slug URL path</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleFieldChange("slug", e.target.value)}
                  placeholder="e.g. buy-cheap-mtn-data"
                  className="rounded-xl bg-muted/20 border-border/30 h-10"
                />
              </div>

              {/* Category & Cover image grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold">Category</Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleFieldChange("category", e.target.value)}
                    className="w-full h-10 rounded-xl bg-muted/20 border border-border/30 text-sm px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Guides">Guides</option>
                    <option value="Announcements">Announcements</option>
                    <option value="Tips">Tips</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="is_published" className="text-xs font-semibold">Status</Label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-muted/25 border border-border/20 rounded-xl">
                    <Switch
                      id="is_published"
                      checked={formData.is_published}
                      onCheckedChange={(checked) => handleFieldChange("is_published", checked)}
                    />
                    <span className="text-xs font-semibold">
                      {formData.is_published ? "Publish" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="space-y-1.5">
                <Label htmlFor="cover_image" className="text-xs font-semibold">Cover Image URL</Label>
                <Input
                  id="cover_image"
                  value={formData.cover_image_url}
                  onChange={(e) => handleFieldChange("cover_image_url", e.target.value)}
                  placeholder="https://unsplash.com/..."
                  className="rounded-xl bg-muted/20 border-border/30 h-10"
                />
              </div>

              {/* Excerpt */}
              <div className="space-y-1.5">
                <Label htmlFor="excerpt" className="text-xs font-semibold">Excerpt / SEO Description</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) => handleFieldChange("excerpt", e.target.value)}
                  placeholder="A short engaging summary that appears in search results and post cards..."
                  className="rounded-xl bg-muted/20 border-border/30 min-h-[90px] text-xs resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEO Metadata Overrides */}
          <Card className="rounded-3xl border-border/30 bg-card/25 backdrop-blur-md overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="seo" className="border-0">
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/10">
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> SEO Tag Customization
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="meta_title" className="text-xs font-semibold">Meta Title Override</Label>
                    <Input
                      id="meta_title"
                      value={formData.meta_title}
                      onChange={(e) => handleFieldChange("meta_title", e.target.value)}
                      placeholder="Title tag for search engines"
                      className="rounded-xl bg-muted/20 border-border/30 h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="meta_description" className="text-xs font-semibold">Meta Description Override</Label>
                    <Textarea
                      id="meta_description"
                      value={formData.meta_description}
                      onChange={(e) => handleFieldChange("meta_description", e.target.value)}
                      placeholder="Snippet summary for Google searches"
                      className="rounded-xl bg-muted/20 border-border/30 min-h-[80px] text-xs resize-none"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </div>

        {/* Right Side: Markdown Editor & Live Preview Panel */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <Card className="rounded-3xl border-border/30 bg-card/20 backdrop-blur-md overflow-hidden flex flex-col flex-1 min-h-[500px]">
            <CardHeader className="py-3 px-5 border-b border-border/20 flex flex-row items-center justify-between bg-card/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" /> Article Content (Markdown)
              </CardTitle>

              {/* View options */}
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as any)}
                className="w-auto"
              >
                <TabsList className="bg-muted/30 border border-border/30 p-0.5 rounded-lg h-8">
                  <TabsTrigger value="write" className="text-xs rounded-md h-7 px-2.5">
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="split" className="text-xs rounded-md h-7 px-2.5 hidden sm:inline-flex">
                    Split View
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs rounded-md h-7 px-2.5">
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            {/* Editing Workspaces */}
            <div className="flex-1 min-h-[450px] flex">
              {/* Tab: Plain Edit */}
              {activeTab === "write" && (
                <div className="flex-1 p-4 flex flex-col">
                  <Textarea
                    value={formData.content}
                    onChange={(e) => handleFieldChange("content", e.target.value)}
                    placeholder="# Write your article in Markdown here..."
                    className="flex-1 min-h-[400px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-mono text-sm resize-none"
                  />
                </div>
              )}

              {/* Tab: Split Pane (Markdown editor side-by-side with compiled HTML) */}
              {activeTab === "split" && (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
                  {/* Left: Input */}
                  <div className="p-4 flex flex-col h-full">
                    <Textarea
                      value={formData.content}
                      onChange={(e) => handleFieldChange("content", e.target.value)}
                      placeholder="# Write your article in Markdown here..."
                      className="flex-1 min-h-[400px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent font-mono text-xs md:text-sm resize-none"
                    />
                  </div>
                  {/* Right: Rendered HTML */}
                  <div className="p-4 overflow-y-auto max-h-[550px] bg-muted/5 dark:bg-card/10">
                    {formData.content ? (
                      <div
                        className="prose prose-xs md:prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-table:border prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border/20"
                        dangerouslySetInnerHTML={{ __html: renderedHtml }}
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic flex items-center justify-center h-full">
                        Live markdown preview will render here
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Full compiled preview */}
              {activeTab === "preview" && (
                <div className="flex-1 p-6 overflow-y-auto max-h-[550px] bg-muted/5 dark:bg-card/10">
                  {formData.content ? (
                    <div
                      className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-table:border prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border/20"
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic flex items-center justify-center h-full">
                      Live markdown preview will render here
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Footer with markdown cheat sheet link */}
            <div className="py-2 px-5 border-t border-border/10 bg-card/10 flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
              <HelpCircle className="h-3 w-3" />
              <span>Supports headers, bold, tables, links, images, bullet lists.</span>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
