import { createClient } from '@supabase/supabase-js'

// Vite exposes env variables via import.meta.env
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Create and export the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)