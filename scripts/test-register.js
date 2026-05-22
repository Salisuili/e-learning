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

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'password123';
  
  console.log(`Registering test user: ${testEmail}...`);
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error('Auth Sign Up Error:', authError);
      return;
    }

    console.log('Auth Sign Up Success. User ID:', authData.user?.id);
    console.log('Session returned:', authData.session ? 'Yes' : 'No');

    // Try inserting profile
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        full_name: 'Test Student',
        role: 'student',
        department: 'Computer Science',
        created_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();

    if (dbError) {
      console.error('Database Insert Error:', dbError);
    } else {
      console.log('Database Insert Success. Profile:', userData);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

run();
