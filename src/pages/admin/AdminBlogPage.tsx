import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Eye,
  CheckCircle,
  FileEdit,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export default function AdminBlogPage() {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch posts
  const { data: posts = [], isLoading } = useQuery<AdminPost[]>({
    queryKey: ["admin_blog_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, is_published, published_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Toggle Publish Mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          is_published: isPublished,
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blog_posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog_posts_public"] });
      toast.success("Article publication status updated!");
    },
    onError: (err: any) => {
      toast.error(`Failed to update status: ${err.message}`);
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_blog_posts"] });
      queryClient.invalidateQueries({ queryKey: ["blog_posts_public"] });
      toast.success("Blog article deleted successfully!");
    },
    onError: (err: any) => {
      toast.error(`Failed to delete article: ${err.message}`);
    },
  });

  const totalPosts = posts.length;
  const publishedPosts = posts.filter((p) => p.is_published).length;
  const draftPosts = totalPosts - publishedPosts;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          title="Blog Spot Editor"
          description="Manage, write, and configure SEO-optimized articles for your website"
        />
        <Button asChild rounded-xl className="shadow-md shadow-primary/20 shrink-0">
          <Link to="/admin/blog/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create New Post
          </Link>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-border/30 bg-card/25 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Total Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{totalPosts}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/30 bg-card/25 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> Published Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-500">{publishedPosts}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/30 bg-card/25 backdrop-blur-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-500" /> Draft Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-amber-500">{draftPosts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Posts Table */}
      <Card className="rounded-3xl border-border/30 bg-card/20 backdrop-blur-md overflow-hidden">
        <div className="p-6 border-b border-border/20 flex justify-between items-center">
          <h3 className="font-bold text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Articles List
          </h3>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3 stroke-[1.5]" />
              <p className="text-sm text-muted-foreground">No articles created yet.</p>
              <Button asChild size="sm" variant="link" className="mt-2 text-xs">
                <Link to="/admin/blog/new">Write your first post</Link>
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/20 bg-muted/20 text-xs font-bold uppercase text-muted-foreground/70">
                  <th className="p-4 pl-6">Title</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Published Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/10">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 pl-6 font-semibold max-w-sm truncate">
                      {post.title}
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="font-medium text-xs rounded-lg">
                        {post.category}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={post.is_published}
                          onCheckedChange={(checked) =>
                            togglePublishMutation.mutate({ id: post.id, isPublished: checked })
                          }
                          disabled={togglePublishMutation.isPending}
                        />
                        <span className="text-xs font-medium">
                          {post.is_published ? (
                            <span className="text-emerald-500">Live</span>
                          ) : (
                            <span className="text-muted-foreground">Draft</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 pr-6 text-right space-x-1.5 whitespace-nowrap">
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                        <Link to={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                        <Link to={`/admin/blog/edit/${post.id}`}>
                          <Edit2 className="h-4 w-4 text-primary" />
                        </Link>
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-lg hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingId(post.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border-border/30 bg-background/95 backdrop-blur-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete article?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action is permanent and cannot be undone. The article will be deleted from the system and website index immediately.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/95"
                              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
