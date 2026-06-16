import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Detect if we should run in Mock Database mode
export const useMockDb = !supabaseUrl || !supabaseAnonKey || process.env.NEXT_PUBLIC_USE_MOCK_DB === 'true';

if (typeof window !== 'undefined' && useMockDb) {
  console.log('⚡ Live Workshop Tracker is running in MOCK DATABASE mode.');
} else if (typeof window !== 'undefined') {
  console.log('🔗 Live Workshop Tracker is running in SUPABASE mode.');
}

// Fallback to empty strings to prevent createClient from crashing if envs are missing
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);
