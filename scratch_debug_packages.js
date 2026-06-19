import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=([^\s]+)/);
const supabaseKeyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY=([^\s]+)/);

const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].replace(/['"]/g, "") : null;
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1].replace(/['"]/g, "") : null;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching MTN data packages...");
  const { data: packages, error } = await supabase
    .from('data_packages')
    .select('id, package_name, network, selling_price, agent_base_price, is_active')
    .eq('network', 'MTN')
    .limit(20);

  if (error) {
    console.error("Error fetching packages:", error);
  } else {
    console.table(packages);
  }

  console.log("\nFetching recent orders...");
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('id, public_order_id, amount_charged, status, bundle_name, bundle_snapshot, intent_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (oErr) {
    console.error("Error fetching orders:", oErr);
  } else {
    console.log("Recent Orders:");
    console.table(orders.map(o => ({
      id: o.id,
      public_order_id: o.public_order_id,
      amount_charged: o.amount_charged,
      status: o.status,
      bundle_name: o.bundle_name,
      package_id_in_snapshot: o.bundle_snapshot?.id || o.bundle_snapshot?.package_id,
      intent_id: o.intent_id,
      created_at: o.created_at
    })));
  }

  // Let's fetch purchase intents for those orders
  if (orders && orders.length > 0) {
    const intentIds = orders.map(o => o.intent_id).filter(Boolean);
    if (intentIds.length > 0) {
      const { data: intents, error: iErr } = await supabase
        .from('purchase_intents')
        .select('id, intent_reference, intent_type, amount_expected, order_context')
        .in('id', intentIds);
      
      if (iErr) {
        console.error("Error fetching intents:", iErr);
      } else {
        console.log("\nRecent Intents:");
        intents.forEach(intent => {
          console.log(`Intent ID: ${intent.id}, Type: ${intent.intent_type}, Expected: ${intent.amount_expected}`);
          console.log("Context:", JSON.stringify(intent.order_context, null, 2));
        });
      }
    }
  }

  console.log("\nFetching recent audit logs...");
  const { data: logs, error: lErr } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (lErr) {
    console.error("Error fetching audit logs:", lErr);
  } else {
    console.table(logs);
  }
}

check();
