'use strict';
/* ================================================================
   SENA LAB — Database layer (Supabase)
   All async operations with the remote database.
   Exposes window.DB for use by app.js.
   ================================================================ */

(function () {

  /* ── Guard: show setup screen if config not filled in ────────── */
  const cfg = window.SENA_CONFIG;
  if (!cfg || !cfg.supabaseUrl || cfg.supabaseUrl.startsWith('YOUR_')) {
    document.body.innerHTML = `
      <div style="display:grid;place-items:center;height:100vh;
                  font-family:'Inter',sans-serif;text-align:center;
                  background:#060d1a;color:#f0f9ff;padding:2rem;gap:1rem">
        <div>
          <div style="font-size:3rem;margin-bottom:1rem">⚙️</div>
          <h2 style="margin:0 0 .75rem;font-size:1.5rem">Setup required</h2>
          <p style="color:#94a3b8;max-width:420px;margin:0 auto">
            Open <code style="background:#111d35;padding:2px 6px;border-radius:4px">config.js</code>
            and fill in your Supabase URL and anon key.<br>
            See <code style="background:#111d35;padding:2px 6px;border-radius:4px">SETUP.md</code>
            for the full walkthrough.
          </p>
        </div>
      </div>`;
    throw new Error('SENA_CONFIG not filled in — see config.js');
  }

  /* ── Initialise Supabase client ──────────────────────────────── */
  const { createClient } = window.supabase;
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseKey);

  /* ════════════════════════════════════════════════════════════════
     AUTH
     ════════════════════════════════════════════════════════════════ */

  /** Sign in and return a normalised user object. */
  async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return _buildProfile(data.user);
  }

  /** Sign out the current session. */
  async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }

  /** Return the currently logged-in user (or null). */
  async function getSession() {
    const { data } = await sb.auth.getSession();
    if (!data.session) return null;
    return _buildProfile(data.session.user);
  }

  /** Change the logged-in user's password. */
  async function changePassword(newPassword) {
    const { error } = await sb.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  /** Build the in-app user object from auth.user + staff_profiles. */
  async function _buildProfile(authUser) {
    if (!authUser) return null;
    const { data: p } = await sb
      .from('staff_profiles')
      .select('first_name, last_name, role')
      .eq('id', authUser.id)
      .single();
    const firstName = p?.first_name || '';
    const lastName  = p?.last_name  || '';
    return {
      id:        authUser.id,
      email:     authUser.email,
      name:      `${firstName} ${lastName}`.trim() || authUser.email.split('@')[0],
      firstName,
      lastName,
      role:      p?.role || 'laburant',
      avatar:    (firstName[0] || authUser.email[0]).toUpperCase(),
      password:  '***', // never stored locally
    };
  }

  /* ════════════════════════════════════════════════════════════════
     SETTINGS
     ════════════════════════════════════════════════════════════════ */

  async function getSettings() {
    const { data } = await sb.from('lab_settings').select('*').single();
    return {
      labName: data?.lab_name || 'Sena Lab',
      address: data?.address  || '',
      phone:   data?.phone    || '',
    };
  }

  async function saveSettings({ labName, address, phone }) {
    const { error } = await sb.from('lab_settings').upsert({
      id:         1,
      lab_name:   labName,
      address,
      phone,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  /* ════════════════════════════════════════════════════════════════
     PATIENT RECORDS
     ════════════════════════════════════════════════════════════════ */

  /** Load ALL records (staff only — anon key blocked by RLS). */
  async function getRecords() {
    const { data, error } = await sb
      .from('patient_records')
      .select(`
        id, name, dob, phone, doctor, sample_date, status, notes, created_at,
        test_results ( id, test_name, value, unit, reference_range, display_order )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(_normalise);
  }

  /**
   * Look up a single Published record by code.
   * Works for anonymous visitors — RLS allows SELECT WHERE status = 'Published'.
   */
  async function lookupPublishedRecord(code) {
    const { data, error } = await sb
      .from('patient_records')
      .select(`
        id, name, dob, phone, doctor, sample_date, status, notes,
        test_results ( id, test_name, value, unit, reference_range, display_order )
      `)
      .eq('id', code.trim())
      .eq('status', 'Published')
      .single();
    if (error || !data) return null;
    return _normalise(data);
  }

  /** Save (insert or update) a record and its test rows. */
  async function upsertRecord(record) {
    const { tests, ...r } = record;

    // 1 — Upsert the patient record row
    const { error: rErr } = await sb.from('patient_records').upsert({
      id:          r.id,
      name:        r.name,
      dob:         r.dob         || null,
      phone:       r.phone       || null,
      doctor:      r.doctor      || null,
      sample_date: r.sampleDate  || null,
      status:      r.status,
      notes:       r.notes       || null,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'id' });
    if (rErr) throw rErr;

    // 2 — Delete old test rows then re-insert fresh ones
    await sb.from('test_results').delete().eq('record_id', r.id);

    if (tests && tests.length > 0) {
      const { error: tErr } = await sb.from('test_results').insert(
        tests.map((t, i) => ({
          record_id:       r.id,
          test_name:       t.name,
          value:           t.value           || '',
          unit:            t.unit            || '',
          reference_range: t.range           || '',
          display_order:   i,
        }))
      );
      if (tErr) throw tErr;
    }
  }

  /** Permanently delete a record (cascade deletes its test rows too). */
  async function deleteRecord(id) {
    const { error } = await sb.from('patient_records').delete().eq('id', id);
    if (error) throw error;
  }

  /* ════════════════════════════════════════════════════════════════
     METRICS (public — shown on hero section)
     ════════════════════════════════════════════════════════════════ */

  /**
   * Fetch aggregate counts of Published records.
   * Uses a SECURITY DEFINER Postgres function so the anon key can
   * read the counts without exposing any patient data.
   */
  async function getPublicMetrics() {
    const { data, error } = await sb.rpc('public_metrics');
    if (error || !data || data.length === 0) return { patientCount: 0, testCount: 0 };
    return {
      patientCount: Number(data[0].patient_count) || 0,
      testCount:    Number(data[0].test_count)    || 0,
    };
  }

  /* ════════════════════════════════════════════════════════════════
     STAFF MANAGEMENT
     ════════════════════════════════════════════════════════════════ */

  /** List all staff profiles (auth users with a staff_profiles row). */
  async function getStaffProfiles() {
    const { data, error } = await sb
      .from('staff_profiles')
      .select('id, first_name, last_name, role')
      .order('created_at');
    if (error) return [];
    return (data || []).map(p => ({
      id:        p.id,
      firstName: p.first_name || '',
      lastName:  p.last_name  || '',
      name:      `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—',
      email:     '—',   // not exposed to client via RLS
      role:      p.role,
      avatar:    (p.first_name?.[0] || 'S').toUpperCase(),
      password:  '**********',
    }));
  }

  /** Change a staff member's role (admin only — enforced by RLS). */
  async function updateStaffRole(userId, role) {
    const { error } = await sb
      .from('staff_profiles')
      .update({ role })
      .eq('id', userId);
    if (error) throw error;
  }

  /**
   * Invite a new staff member by calling the Netlify serverless function
   * which holds the Supabase service key securely.
   */
  async function inviteStaff({ email, firstName, lastName, role }) {
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/.netlify/functions/invite-staff', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ email, firstName, lastName, role }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Invite failed');
    return json;
  }

  /** Remove a staff member (deletes their auth user + profile via CASCADE). */
  async function deleteStaff(userId) {
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/.netlify/functions/delete-staff', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Delete failed');
  }

  /* ════════════════════════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════════════════════════ */

  function _normalise(row) {
    return {
      id:         row.id,
      name:       row.name        || '',
      dob:        row.dob         || '',
      phone:      row.phone       || '',
      doctor:     row.doctor      || '',
      sampleDate: row.sample_date || '',
      status:     row.status      || 'Draft',
      notes:      row.notes       || '',
      tests: (row.test_results || [])
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(t => ({
          name:  t.test_name       || '',
          value: t.value           || '',
          unit:  t.unit            || '',
          range: t.reference_range || '',
        })),
    };
  }

  /* ── Expose public API ───────────────────────────────────────── */
  window.DB = {
    signIn,
    signOut,
    getSession,
    changePassword,
    getSettings,
    saveSettings,
    getRecords,
    lookupPublishedRecord,
    upsertRecord,
    deleteRecord,
    getPublicMetrics,
    getStaffProfiles,
    updateStaffRole,
    inviteStaff,
    deleteStaff,
  };

})();
