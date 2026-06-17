import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read the .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Use precise regex to grab the URL and KEY without trailing comments/spaces
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
    .select('id, public_order_id, status, amount_charged, intent_id, bundle_snapshot, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (oErr) {
    console.error("Error fetching orders:", oErr);
    return;
  }

  console.log(`Found ${orders.length} orders starting with KS-`);
  for (const o of orders) {
    console.log(`\nOrder: ${o.public_order_id} | Status: ${o.status} | Amount: ${o.amount_charged} | Created: ${o.created_at}`);
    console.log(`Bundle Snapshot:`, JSON.stringify(o.bundle_snapshot));
    
    if (o.intent_id) {
      const { data: intent, error: iErr } = await supabase
        .from('purchase_intents')
        .select('id, intent_reference, intent_type, status, order_context')
        .eq('id', o.intent_id)
        .maybeSingle();
        
      if (iErr) {
        console.error(`Error fetching intent ${o.intent_id}:`, iErr);
      } else if (intent) {
        console.log(`Linked Intent status: ${intent.status} | type: ${intent.intent_type}`);
        console.log(`Order Context:`, JSON.stringify(intent.order_context));
      } else {
        console.log(`No intent found for ID ${o.intent_id}`);
      }
    } else {
      console.log(`No intent_id associated with order ${o.id}`);
    }
  }
}

check();
