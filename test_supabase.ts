import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const envPath = path.resolve(__dirname, "../../.env.local");
dotenv.config({ path: envPath });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from("withdrawal_requests").select("*, agent_profiles(store_name)").limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
}

run();
