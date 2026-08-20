import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .in('action', ['webhook_invalid_payload', 'webhook_auth_failed', 'webhook_order_not_found', 'webhook_rejected_no_secret'])
    .order('created_at', { ascending: false })
    .limit(5);
  console.log(JSON.stringify(data, null, 2));
}

run();
