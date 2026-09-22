-- ==========================================================
-- MacroNest.online - Complete Admin Password & RPC Schema
-- Run in: Supabase Dashboard -> SQL Editor -> Click "Run"
-- ==========================================================

-- 1. Ensure pgcrypto extension is installed
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Create the admin_auth table if not already existing
CREATE TABLE IF NOT EXISTS admin_auth (
  id TEXT PRIMARY KEY DEFAULT 'primary_admin',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Configure Row Level Security (RLS)
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public access to admin_auth" ON admin_auth;
CREATE POLICY "Deny public access to admin_auth"
  ON admin_auth FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Allow service role full access to admin_auth" ON admin_auth;
CREATE POLICY "Allow service role full access to admin_auth"
  ON admin_auth FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Create Secure Verification RPC Function
-- This allows the deployed website to verify the password securely
-- without ever exposing the salt or password hash to the public.
CREATE OR REPLACE FUNCTION verify_admin_password(p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
  v_salt TEXT;
  v_db_hash TEXT;
BEGIN
  IF p_password IS NULL OR length(trim(p_password)) = 0 THEN
    RETURN false;
  END IF;

  SELECT salt, password_hash INTO v_salt, v_db_hash
  FROM admin_auth
  WHERE id = 'primary_admin';

  IF NOT FOUND OR v_salt IS NULL OR v_db_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Compute HMAC-SHA256 signature
  v_hash := encode(hmac(p_password, v_salt, 'sha256'), 'hex');

  RETURN (v_hash = v_db_hash);
END;
$$;

-- Allow the web client to call verify_admin_password
GRANT EXECUTE ON FUNCTION verify_admin_password(TEXT) TO anon, authenticated, service_role;


-- 5. SET YOUR ADMIN PASSWORD
-- Replace 'YourNewPasswordHere!' below with your desired admin password:
DO $$
DECLARE
  -- >>> CHANGE YOUR DESIRED PASSWORD HERE <<< --
  v_new_password TEXT := 'YourNewPasswordHere!';
  v_salt TEXT := md5(random()::text || clock_timestamp()::text);
  v_hash TEXT;
BEGIN
  v_hash := encode(hmac(v_new_password, v_salt, 'sha256'), 'hex');

  INSERT INTO admin_auth (id, password_hash, salt, must_change_password, updated_at)
  VALUES ('primary_admin', v_hash, v_salt, false, NOW())
  ON CONFLICT (id) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      salt = EXCLUDED.salt,
      must_change_password = false,
      updated_at = NOW();

  RAISE NOTICE 'Admin password updated and verify_admin_password RPC created successfully!';
END $$;
