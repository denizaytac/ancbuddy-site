import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const isBrowser = typeof window !== "undefined";

export const supabase: SupabaseClient | null =
  isBrowser && url && anonKey ? createClient(url, anonKey) : null;
