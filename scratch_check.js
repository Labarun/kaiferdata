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
  console.log("Calling list_public_packages RPC...");
  const { data, error } = await supabase.rpc("list_public_packages", { _logged_in: true });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Packages fetched successfully:", data?.length);
  }
}

check();
