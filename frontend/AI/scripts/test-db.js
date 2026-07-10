const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envPath = path.join(__dirname, '../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.trim().startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  }
} catch (err) {
  console.error('Failed to read .env file:', err);
}

console.log('Supabase URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    console.log('Testing connection to Supabase...');
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      console.log('Successfully fetched users:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
