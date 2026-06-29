import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key defined:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Supabase URL or Key is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

try {
  // Query a table
  const { data, error } = await supabase.from('documents').select('id').limit(1);
  if (error) {
    console.error('Supabase Query Error:', error);
  } else {
    console.log('✅ Supabase Connection Successful! Data:', data);
  }
} catch (err) {
  console.error('Network or Execution Error:', err);
}
