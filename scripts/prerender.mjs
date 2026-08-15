import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const staticRoutes = [
  '/',
  '/buy',
  '/agent-perks',
  '/about',
  '/contact',
  '/track',
  '/terms',
  '/privacy',
];

async function getBlogRoutes() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('is_published', true);
    
  if (error || !data) return [];
  return data.map(post => `/blog/${post.slug}`);
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      cwd: path.resolve(__dirname, '..'),
      shell: true,
    });
    
    server.stdout.on('data', (data) => {
      if (data.toString().includes('Local:')) {
        resolve(server);
      }
    });
    
    server.stderr.on('data', (data) => {
      console.error(`Preview Server: ${data}`);
    });
    
    server.on('error', reject);
  });
}

async function run() {
  console.log('Starting preview server...');
  const server = await startServer();
  console.log('Server started. Fetching dynamic routes...');
  
  const blogRoutes = await getBlogRoutes();
  const allRoutes = [...staticRoutes, ...blogRoutes];
  
  console.log(`Found ${allRoutes.length} routes to prerender.`);
  
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  
  for (const route of allRoutes) {
    console.log(`Prerendering ${route}...`);
    try {
      await page.goto(`http://localhost:4173${route}`, { waitUntil: 'networkidle0', timeout: 30000 });
      // Wait for any final React hydration or data fetching
      await new Promise(r => setTimeout(r, 1000));
      
      const html = await page.evaluate(() => document.documentElement.outerHTML);

      // IMPORTANT: When route is '/', the naive replace gives an empty string
      // which resolves to dist/index.html — overwriting the SPA shell with the
      // landing page HTML. Every other route would then serve that prerendered
      // landing page, causing the visible flash on reload for logged-in users.
      //
      // Fix: always put the prerendered file in a named subdirectory.
      // The root route goes to dist/index/index.html (served at /index/),
      // NOT dist/index.html. The real dist/index.html (the blank SPA shell)
      // is never touched so the hosting platform can correctly use it as the
      // fallback for all routes (including /agent, /admin, /dashboard, etc.).
      const routeSegment = route === '/' ? 'index' : route.replace(/^\//, '');
      const filePath = path.resolve(__dirname, '..', 'dist', routeSegment, 'index.html');
      const dirPath = path.dirname(filePath);
      
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(filePath, `<!DOCTYPE html>\n<html>${html}</html>`);
      console.log(`✅ Saved ${filePath}`);
    } catch (e) {
      console.error(`❌ Failed to prerender ${route}:`, e.message);
    }
  }
  
  await browser.close();
  server.kill();
  console.log('Prerendering complete!');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
