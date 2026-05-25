//declring supabase variables
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure env variables are loaded (helpful if this file is imported first somewhere)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = process.env.SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials. Please check your .env file.");
}

// Initialize and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);