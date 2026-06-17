import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read the .env file from the project root
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Use precise regex to grab the URL and KEY without trailing comments/spaces
const supabaseUrlMatch = envContent.match(/VITE_SUPABASE_URL=([^\s]+)/);
const supabaseKeyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=([^\s]+)/);

const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1] : null;
const supabaseKey = supabaseKeyMatch ? supabaseKeyMatch[1] : null;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: profile } = await supabase.from('agent_profiles').select('user_id').limit(1).single();
  console.log("Agent user_id:", profile?.user_id);

  if (profile?.user_id) {
    const { data: earns, error: e1 } = await supabase.from('agent_earnings').select('*').eq('user_id', profile.user_id);
    console.log("Earnings:", earns);
    console.log("Earnings Error:", e1);

    const { data: orders, error: e2 } = await supabase.from('orders').select('id, origin_type, status, intent_id').eq('actor_id', profile.user_id);
    console.log("Bulk orders:", orders?.length, e2);
  }
}

check();
