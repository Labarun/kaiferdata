import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const FINAL_STATUSES = ["delivered", "failed", "refunded", "cancelled"];
  
  // Test the exact syntax used in sync-order-status
  const { data, error } = await supabase
    .from("orders")
    .select("id, status")
    .not("status", "in", `(${FINAL_STATUSES.join(",")})`)
    .limit(5);
    
  console.log("Error:", error);
  console.log("Data count:", data?.length);
  console.log("Data:", data);
}

test();
