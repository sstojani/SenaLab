'use strict';
/**
 * Netlify Function: invite-staff
 * Creates a new Supabase Auth user and sends them a set-password email.
 * Requires admin privileges — verified server-side before acting.
 *
 * Environment variables (set in Netlify dashboard):
 *   SUPABASE_URL          — your project URL
 *   SUPABASE_SERVICE_KEY  — service_role key (NEVER put this in client code)
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'https://sena-lab.netlify.app',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  /* ── 1. Authenticate the caller ──────────────────────────────── */
  const auth = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing token' }) };

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };

  /* ── 2. Verify caller is admin ───────────────────────────────── */
  const { data: profile } = await admin
    .from('staff_profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (profile?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) };

  /* ── 3. Parse & validate body ────────────────────────────────── */
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  const { email, firstName = '', lastName = '', role = 'laburant' } = body;
  if (!email) return { statusCode: 400, headers, body: JSON.stringify({ error: 'email required' }) };
  if (!['admin', 'laburant'].includes(role)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid role' }) };

  /* ── 4. Create the auth user ─────────────────────────────────── */
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { first_name: firstName, last_name: lastName, role },
  });

  if (createErr) return { statusCode: 400, headers, body: JSON.stringify({ error: createErr.message }) };

  /* ── 5. Send a password-reset link (acts as "set your password") */
  await admin.auth.admin.generateLink({ type: 'recovery', email });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true, userId: newUser.user.id }),
  };
};
