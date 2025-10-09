import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const SUPABASE_INPUT_BUCKET =
  process.env.SUPABASE_INPUT_BUCKET ?? "input-images";
export const SUPABASE_OUTPUT_BUCKET =
  process.env.SUPABASE_OUTPUT_BUCKET ?? "output-images";
export const SUPABASE_PROJECTS_TABLE =
  process.env.SUPABASE_PROJECTS_TABLE ?? "projects";
export const SUPABASE_WAITLIST_TABLE =
  process.env.SUPABASE_WAITLIST_TABLE ?? "waitlist";

function ensureEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function getSupabaseAnonClient() {
  return createClient(
    ensureEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    ensureEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export function getSupabaseServiceRoleClient() {
  return createClient(
    ensureEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    ensureEnv(SUPABASE_SERVICE_ROLE_KEY, "SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}
