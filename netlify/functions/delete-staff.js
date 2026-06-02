'use strict';
/**
 * Netlify Function: delete-staff
 * Permanently deletes a Supabase Auth user.
 * Admin only — verified server-side.
 */

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'https://sena-lab.netlify.app' };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth  = event.headers['authorization'] || event.headers['Authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing token' }) };

  const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user: caller } } = await admin.auth.getUser(token);
  if (!caller) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid token' }) };

  const { data: profile } = await admin.from('staff_profiles').select('role').eq('id', caller.id).single();
  if (profile?.role !== 'admin') return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin only' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Bad JSON' }) }; }

  const { userId } = body;
  if (!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId required' }) };
  if (userId === caller.id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cannot delete yourself' }) };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { statusCode: 400, headers, body: JSON.stringify({ error: error.message }) };

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
