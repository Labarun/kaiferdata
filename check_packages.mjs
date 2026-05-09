import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://aawvsbtiymgrzjsfntog.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhd3ZzYnRpeW1ncnpqc2ZudG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NzkwNjksImV4cCI6MjA4ODU1NTA2OX0.BrdX1omvlvBykFVjl2__jN30TwzzGYnoEVw6rgDI1jM');

async function run() {
  const { data, error } = await supabase.from('data_packages').select('id, package_name, package_code, supplier_source_id, source_type, source_metadata');
  console.log("Packages:", JSON.stringify(data, null, 2));
  if (error) console.error("Error:", error);
}

run();
