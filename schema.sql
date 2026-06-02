-- ================================================================
--  SENA LAB — Supabase Database Schema
--  Run this ONCE in your Supabase project:
--  Dashboard → SQL Editor → New query → paste → Run
-- ================================================================

-- ── Lab settings (singleton row) ────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_settings (
  id         integer     PRIMARY KEY DEFAULT 1,
  lab_name   text        NOT NULL DEFAULT 'Sena Lab',
  address    text        NOT NULL DEFAULT '',
  phone      text        NOT NULL DEFAULT '',
  updated_at timestamptz          DEFAULT now(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO lab_settings (id, lab_name, address, phone)
VALUES (1, 'Sena Lab', 'Librazhd, Albania', '+355 69 475 0454')
ON CONFLICT (id) DO NOTHING;

-- ── Staff profiles ───────────────────────────────────────────────
-- Extends Supabase auth.users with role and display name.
CREATE TABLE IF NOT EXISTS staff_profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name  text NOT NULL DEFAULT '',
  role       text NOT NULL DEFAULT 'laburant'
             CHECK (role IN ('admin', 'laburant')),
  created_at timestamptz DEFAULT now()
);

-- Automatically create a profile when a new auth user is added.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, first_name, last_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
    COALESCE(NEW.raw_user_meta_data->>'role',       'laburant')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Patient records ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patient_records (
  id          text        PRIMARY KEY,  -- SEN-… format
  name        text        NOT NULL,
  dob         date,
  phone       text,
  doctor      text,
  sample_date date,
  status      text        NOT NULL DEFAULT 'Draft'
              CHECK (status IN ('Draft', 'Published', 'Needs review')),
  notes       text,
  created_by  uuid        REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_records_status     ON patient_records(status);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON patient_records(created_at DESC);

-- ── Test results ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       text NOT NULL REFERENCES patient_records(id) ON DELETE CASCADE,
  test_name       text NOT NULL,
  value           text,
  unit            text,
  reference_range text,
  display_order   integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tests_record ON test_results(record_id);

-- ── Public metrics function ──────────────────────────────────────
-- Returns counts visible to unauthenticated visitors (Published only).
CREATE OR REPLACE FUNCTION public.public_metrics()
RETURNS TABLE(patient_count bigint, test_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COUNT(DISTINCT pr.id)    AS patient_count,
    COUNT(tr.id)             AS test_count
  FROM patient_records pr
  LEFT JOIN test_results tr ON tr.record_id = pr.id
  WHERE pr.status = 'Published';
$$;

-- Grant execute to anonymous callers so the public homepage can show stats.
GRANT EXECUTE ON FUNCTION public.public_metrics() TO anon;

-- ================================================================
--  ROW-LEVEL SECURITY
-- ================================================================

ALTER TABLE lab_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results    ENABLE ROW LEVEL SECURITY;

-- ── lab_settings ────────────────────────────────────────────────
CREATE POLICY "anyone_reads_settings"  ON lab_settings
  FOR SELECT USING (true);
CREATE POLICY "staff_writes_settings"  ON lab_settings
  FOR ALL    USING (auth.uid() IS NOT NULL);

-- ── staff_profiles ───────────────────────────────────────────────
CREATE POLICY "staff_reads_profiles"   ON staff_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "own_profile_update"     ON staff_profiles
  FOR UPDATE USING (id = auth.uid());
CREATE POLICY "admin_manages_profiles" ON staff_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM staff_profiles sp
            WHERE sp.id = auth.uid() AND sp.role = 'admin')
  );

-- ── patient_records ──────────────────────────────────────────────
-- Public: read Published only
CREATE POLICY "public_reads_published" ON patient_records
  FOR SELECT USING (status = 'Published');
-- Staff: full access to all records
CREATE POLICY "staff_reads_all"        ON patient_records
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "staff_inserts"          ON patient_records
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "staff_updates"          ON patient_records
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "staff_deletes"          ON patient_records
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── test_results ─────────────────────────────────────────────────
CREATE POLICY "public_reads_published_tests" ON test_results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM patient_records pr
            WHERE pr.id = test_results.record_id AND pr.status = 'Published')
  );
CREATE POLICY "staff_reads_all_tests"  ON test_results
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "staff_manages_tests"    ON test_results
  FOR ALL    USING (auth.uid() IS NOT NULL);
