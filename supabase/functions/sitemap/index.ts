import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all published blog posts
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select("slug, updated_at")
    .eq("is_published", true);

  if (error) {
    console.error("Error fetching blog posts for sitemap:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch blog posts" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const DOMAIN = "https://kaiferdata.com";
  
  const staticRoutes = [
    { url: "/", priority: "1.0", changefreq: "weekly" },
    { url: "/buy", priority: "0.9", changefreq: "daily" },
    { url: "/agent-perks", priority: "0.8", changefreq: "monthly" },
    { url: "/about", priority: "0.7", changefreq: "monthly" },
    { url: "/contact", priority: "0.6", changefreq: "monthly" },
    { url: "/track", priority: "0.6", changefreq: "weekly" },
    { url: "/get-app", priority: "0.5", changefreq: "monthly" },
    { url: "/get-app/android", priority: "0.5", changefreq: "monthly" },
    { url: "/get-app/ios", priority: "0.5", changefreq: "monthly" },
    { url: "/terms", priority: "0.3", changefreq: "yearly" },
    { url: "/privacy", priority: "0.3", changefreq: "yearly" },
    { url: "/login", priority: "0.2", changefreq: "yearly" },
    { url: "/register", priority: "0.2", changefreq: "yearly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Add static routes
  for (const route of staticRoutes) {
    xml += `  <url>\n`;
    xml += `    <loc>${DOMAIN}${route.url}</loc>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Add blog routes
  if (posts) {
    for (const post of posts) {
      const lastMod = new Date(post.updated_at || new Date()).toISOString().split('T')[0];
      xml += `  <url>\n`;
      xml += `    <loc>${DOMAIN}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastMod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }
  }

  xml += `</urlset>\n`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
