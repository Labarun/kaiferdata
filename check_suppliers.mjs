import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aawvsbtiymgrzjsfntog.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd3ZzYnRpeW1ncnpqc2ZudG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzkwNjksImV4cCI6MjA4ODU1NTA2OX0.BrdX1omvlvBykFVjl2__jN30TwzzGYnoEVw6rgDI1jM';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('suppliers').select('provider_code, endpoint_config');
  console.log("Suppliers:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

run();
