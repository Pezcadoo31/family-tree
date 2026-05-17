import { createClient } from '@supabase/supabase-js';

// Read environment variables (defined in .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Validate that the environment variables are defined
if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabasePublishableKey) {
  throw new Error(
    'Missing environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  );
}

// Create and export the Supabase client
// This client is used to interact with the database from the frontend
export const supabase = createClient(supabaseUrl, supabasePublishableKey);