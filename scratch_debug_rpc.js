import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read the .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Grab URL and KEY
const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=([^\s]+)/);
const supabaseKeyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=([^\s]+)/);

const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].replace(/['"]/g, "") : null;
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1].replace(/['"]/g, "") : null;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching recent orders...");
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, public_order_id, actor_type, origin_type, status, supplier_status, amount_charged, created_at, bundle_name, bundle_code')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (oErr) console.error("Error fetching orders:", oErr);
  console.log("Recent Orders:");
  console.table(orders);

  console.log("\nFetching active suppliers...");
  const { data: suppliers, error: sErr } = await supabase
    .from('suppliers')
    .select('id, name, provider_code, is_active, priority, supported_networks');
  
  if (sErr) console.error("Error fetching suppliers:", sErr);
  console.log("Active Suppliers:");
  console.table(suppliers);

  console.log("\nFetching some MTN packages...");
  const { data: packages, error: pErr } = await supabase
    .from('data_packages')
    .select('id, package_name, package_code, selling_price, is_active, source_type, supplier_source_id')
    .eq('network', 'MTN')
    .limit(5);
  
  if (pErr) console.error("Error fetching packages:", pErr);
  console.log("MTN Packages:");
  console.table(packages);
}

check();
