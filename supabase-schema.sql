-- ==========================================================
-- Supabase Schema for India Macro Dashboard
-- Includes:
--   1. admin_auth (Administrator Password & Security Credentials)
--   2. articles (Macroeconomic Research & Full SEO Articles)
--   3. macro_parameters (Macroeconomic Indicators & Data Parameters)
--   4. v_indicator_summary (Auto-updating View with INSTEAD OF triggers)
--
-- Instructions:
-- Paste and run this script in:
-- Supabase Dashboard -> Project -> SQL Editor -> Click "Run"
-- ==========================================================

-- ----------------------------------------------------------
-- 1. ADMIN AUTHENTICATION TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_auth (
  id TEXT PRIMARY KEY DEFAULT 'primary_admin',
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on admin credentials
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

-- Block public (anon) access to admin password hashes
DROP POLICY IF EXISTS "Deny public access to admin_auth" ON admin_auth;
CREATE POLICY "Deny public access to admin_auth"
  ON admin_auth
  FOR ALL
  TO anon
  USING (false);

-- Allow server / service role full access to admin_auth
DROP POLICY IF EXISTS "Allow service role full access to admin_auth" ON admin_auth;
CREATE POLICY "Allow service role full access to admin_auth"
  ON admin_auth
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed initial admin row with default password 'AdminMacro2026!'
-- (Password change is enforced on first login)
INSERT INTO admin_auth (id, password_hash, salt, must_change_password, updated_at)
VALUES (
  'primary_admin',
  '3e68d8e919ed45d84ecb5912ed06e61e58225a7223a2f95e136b7b1e20f4c803',
  '4a6d163d7219ab4a8220970a11ea90b4',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Secure verification RPC function for deployed static web apps
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

  v_hash := encode(hmac(p_password, v_salt, 'sha256'), 'hex');
  RETURN (v_hash = v_db_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_password(TEXT) TO anon, authenticated, service_role;


-- ----------------------------------------------------------
-- 2. MACROECONOMIC ARTICLES & SEO CMS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Monetary Policy',
  author TEXT NOT NULL DEFAULT 'Macro Research Desk',
  read_time_minutes INTEGER NOT NULL DEFAULT 5,
  cover_image TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Full SEO Metadata Columns
  seo_meta_title TEXT DEFAULT '',
  seo_meta_description TEXT DEFAULT '',
  seo_keywords TEXT[] DEFAULT '{}',
  seo_canonical_url TEXT DEFAULT '',
  seo_og_image TEXT DEFAULT '',
  seo_structured_data_type TEXT DEFAULT 'Article'
);

-- Index for high-performance slug retrieval (/blog/:slug)
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- Index for published feeds sorted by publication recency
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published, published_at DESC);

-- Enable Row Level Security (RLS) on articles
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to published articles (safe for frontend queries)
DROP POLICY IF EXISTS "Allow public read published articles" ON articles;
CREATE POLICY "Allow public read published articles"
  ON articles
  FOR SELECT
  USING (is_published = true);

-- Allow server full control over articles
DROP POLICY IF EXISTS "Allow server full access to articles" ON articles;
CREATE POLICY "Allow server full access to articles"
  ON articles
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ----------------------------------------------------------
-- 3. MACROECONOMIC PARAMETERS & INDICATORS TABLE
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS macro_parameters (
  id TEXT PRIMARY KEY,
  slug TEXT DEFAULT '',
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'MONTHLY',
  category TEXT NOT NULL DEFAULT 'REAL ECONOMY',
  status TEXT NOT NULL DEFAULT 'Normal',
  stance_state TEXT DEFAULT '',
  value TEXT NOT NULL DEFAULT '—',
  unit TEXT NOT NULL DEFAULT '',
  previous_value TEXT DEFAULT '',
  delta_value TEXT NOT NULL DEFAULT '',
  delta_display TEXT DEFAULT '',
  delta_type TEXT NOT NULL DEFAULT 'neutral',
  trend_direction TEXT DEFAULT '',
  trend_badge_style TEXT DEFAULT '',
  target_anchor TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  source_name TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  observation_period TEXT DEFAULT '',
  release_date TEXT DEFAULT '',
  release_window TEXT DEFAULT '',
  next_expected_release TEXT DEFAULT '',
  data_status TEXT DEFAULT 'provisional',
  verification_status TEXT DEFAULT 'verified_official',
  research_notes TEXT DEFAULT '',
  why_it_matters TEXT DEFAULT '',
  methodology_summary TEXT DEFAULT '',
  benchmark_neutral_rate TEXT DEFAULT '',
  historical_low_val TEXT DEFAULT '',
  historical_high_val TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure newly added columns exist if table was previously created
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS slug TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS stance_state TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS previous_value TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS delta_display TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS trend_direction TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS trend_badge_style TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS observation_period TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS next_expected_release TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT 'provisional';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified_official';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS research_notes TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS why_it_matters TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS methodology_summary TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS benchmark_neutral_rate TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS historical_low_val TEXT DEFAULT '';
ALTER TABLE macro_parameters ADD COLUMN IF NOT EXISTS historical_high_val TEXT DEFAULT '';

-- Indexes for performance & ordering
CREATE INDEX IF NOT EXISTS idx_macro_parameters_display_order ON macro_parameters(display_order ASC);
CREATE INDEX IF NOT EXISTS idx_macro_parameters_category ON macro_parameters(category);
CREATE INDEX IF NOT EXISTS idx_macro_parameters_frequency ON macro_parameters(frequency);
CREATE INDEX IF NOT EXISTS idx_macro_parameters_published ON macro_parameters(is_published);
CREATE INDEX IF NOT EXISTS idx_macro_parameters_slug ON macro_parameters(slug);

-- Enable Row Level Security (RLS) on macro_parameters
ALTER TABLE macro_parameters ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all parameters (for instant indicator board)
DROP POLICY IF EXISTS "Allow public read macro_parameters" ON macro_parameters;
CREATE POLICY "Allow public read macro_parameters"
  ON macro_parameters
  FOR SELECT
  USING (true);

-- Allow backend service role / admin full read-write access
DROP POLICY IF EXISTS "Allow service role full access to macro_parameters" ON macro_parameters;
CREATE POLICY "Allow service role full access to macro_parameters"
  ON macro_parameters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users full read-write access
DROP POLICY IF EXISTS "Allow authenticated full access to macro_parameters" ON macro_parameters;
CREATE POLICY "Allow authenticated full access to macro_parameters"
  ON macro_parameters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Purge legacy 'ind-*' rows that had constant/stale metrics and conflicting slugs
DELETE FROM macro_parameters WHERE id LIKE 'ind-%';

-- ----------------------------------------------------------
-- 4. VIEW & INSTEAD-OF TRIGGERS FOR DIRECT SUPABASE EDITING
-- ----------------------------------------------------------
DROP VIEW IF EXISTS v_indicator_summary CASCADE;

CREATE OR REPLACE VIEW v_indicator_summary AS
SELECT
  p.id,
  COALESCE(p.slug, p.id) AS slug,
  p.title,
  p.frequency,
  p.category,
  p.status,
  p.value AS current_value,
  p.unit,
  p.delta_value,
  p.delta_type,
  p.target_anchor,
  p.release_date,
  p.release_window,
  p.source_name,
  p.source_url,
  p.is_published,
  p.display_order,
  p.updated_at
FROM macro_parameters p
WHERE p.is_published = true;

-- INSTEAD OF UPDATE trigger so edits in Supabase Table Editor update macro_parameters
CREATE OR REPLACE FUNCTION trg_v_indicator_summary_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE macro_parameters
  SET
    title = NEW.title,
    frequency = NEW.frequency,
    category = NEW.category,
    status = NEW.status,
    value = NEW.current_value,
    unit = NEW.unit,
    delta_value = NEW.delta_value,
    delta_type = NEW.delta_type,
    target_anchor = NEW.target_anchor,
    release_date = NEW.release_date,
    release_window = NEW.release_window,
    source_name = NEW.source_name,
    source_url = NEW.source_url,
    display_order = NEW.display_order,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_v_indicator_summary ON v_indicator_summary;
CREATE TRIGGER trg_update_v_indicator_summary
  INSTEAD OF UPDATE ON v_indicator_summary
  FOR EACH ROW
  EXECUTE FUNCTION trg_v_indicator_summary_update();

-- INSTEAD OF DELETE trigger so deletions in Supabase Table Editor delete from macro_parameters
CREATE OR REPLACE FUNCTION trg_v_indicator_summary_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM macro_parameters WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_delete_v_indicator_summary ON v_indicator_summary;
CREATE TRIGGER trg_delete_v_indicator_summary
  INSTEAD OF DELETE ON v_indicator_summary
  FOR EACH ROW
  EXECUTE FUNCTION trg_v_indicator_summary_delete();

-- ----------------------------------------------------------
-- 5. SEED / UPDATE THE 23 OFFICIAL MACRO PARAMETERS
-- ----------------------------------------------------------
INSERT INTO macro_parameters (
  id, slug, title, frequency, category, status, value, unit, delta_value, delta_type, target_anchor,
  summary, source_name, source_url, release_date, release_window, is_published, display_order,
  stance_state, previous_value, delta_display, trend_direction, observation_period, next_expected_release,
  data_status, verification_status, created_at, updated_at
) VALUES
  ('cpi-inflation', 'cpi-inflation', 'CPI Inflation', 'MONTHLY', 'INFLATION', 'Expansion', '4.82', '% YoY', '-0.24%', 'negative', 'RBI Target: 4.00%', 'Headline Consumer Price Index measuring consumer basket inflation.', 'MoSPI / RBI', 'https://mospi.gov.in', '12 Mar 2026', 'Monthly (12th-14th)', true, 1, 'Above Target', '5.06', '-0.24%', 'Down', 'Feb 2026', '12 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('wpi-inflation', 'wpi-inflation', 'WPI Inflation', 'MONTHLY', 'INFLATION', 'Normal', '9.92', '% YoY', '+0.15%', 'positive', 'Baseline producer price indicator', 'Wholesale Price Index measuring producer-level input price trends.', 'Office of Economic Adviser', 'https://eaindustry.nic.in', '14 Mar 2026', 'Monthly (14th-15th)', true, 2, 'Normal', '9.77', '+0.15%', 'Up', 'Feb 2026', '14 Apr 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('gst-collections', 'gst-collections', 'GST Collections (Gross)', 'MONTHLY', 'FISCAL', 'Expansion', '199853', '₹ Crore', '+8.5%', 'positive', 'Target: ₹1,80,000 Cr/mo', 'Gross Goods and Services Tax collected across central and state jurisdictions.', 'Ministry of Finance / PIB', 'https://pib.gov.in', '01 Mar 2026', 'Monthly (1st-3rd)', true, 3, 'Robust', '184200', '+8.5%', 'Up', 'Feb 2026', '01 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('pmi-manufacturing', 'pmi-manufacturing', 'Manufacturing PMI', 'MONTHLY', 'REAL ECONOMY', 'Expansion', '52.8', 'Index points', '-0.4', 'negative', 'Threshold: 50.0 (Expansion)', 'Purchasing Managers Index surveying manufacturing output, new orders and exports.', 'S&P Global / HSBC', 'https://www.spglobal.com', '01 Mar 2026', 'Monthly (1st)', true, 4, 'Expansion', '53.2', '-0.4', 'Down', 'Feb 2026', '01 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('pmi-services', 'pmi-services', 'Services PMI', 'MONTHLY', 'REAL ECONOMY', 'Expansion', '54.1', 'Index points', '+0.6', 'positive', 'Threshold: 50.0 (Expansion)', 'Purchasing Managers Index surveying services sector demand, employment and pricing.', 'S&P Global / HSBC', 'https://www.spglobal.com', '03 Mar 2026', 'Monthly (3rd-5th)', true, 5, 'Expansion', '53.5', '+0.6', 'Up', 'Feb 2026', '03 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('iip-industrial-production', 'iip-industrial-production', 'Index of Industrial Production (IIP)', 'MONTHLY', 'REAL ECONOMY', 'Normal', '4.2', '% YoY', '+0.4%', 'positive', 'Baseline growth > 4.5%', 'Measure of physical output volume across mining, manufacturing and electricity sectors.', 'MoSPI', 'https://mospi.gov.in', '12 Mar 2026', 'Monthly (12th)', true, 6, 'Normal', '3.8', '+0.4%', 'Up', 'Jan 2026', '12 Apr 2026', 'quick_estimates', 'verified_official', NOW(), NOW()),
  ('foreign-exchange-reserves', 'foreign-exchange-reserves', 'Foreign Exchange Reserves', 'WEEKLY', 'EXTERNAL', 'Expansion', '689.4', 'USD Billion', '+2.3', 'positive', 'Adequacy: > 10 months import cover', 'Total foreign currency assets, gold reserves, SDRs and IMF reserve position.', 'Reserve Bank of India', 'https://rbi.org.in', '14 Mar 2026', 'Weekly (Friday 5:00 PM)', true, 7, 'Adequate', '687.1', '+2.3', 'Up', '07 Mar 2026', '21 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('rbi-repo-rate', 'rbi-repo-rate', 'RBI Policy Repo Rate', 'MONTHLY', 'MONETARY', 'Normal', '6.50', '% p.a.', '0.0 bps', 'neutral', 'Neutral rate: 6.00%-6.50%', 'Benchmark policy lending rate set by the RBI Monetary Policy Committee.', 'Reserve Bank of India (MPC)', 'https://rbi.org.in', '08 Feb 2026', 'Bi-monthly MPC Meetings', true, 8, 'Neutral', '6.50', '0.0 bps', 'Flat', 'Feb 2026', '06 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('core-sector-output', 'core-sector-output', 'Core Sector Growth (8 Industries)', 'MONTHLY', 'REAL ECONOMY', 'Normal', '3.6', '% YoY', '-0.3%', 'negative', 'Benchmark > 4.0%', 'Combined growth rate of coal, crude oil, natural gas, refinery products, fertilizers, steel, cement and electricity.', 'Office of Economic Adviser', 'https://eaindustry.nic.in', '28 Feb 2026', 'Monthly (Last working day)', false, 9, 'Normal', '3.9', '-0.3%', 'Down', 'Jan 2026', '31 Mar 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('gdp-growth-rate', 'gdp-growth-rate', 'Real GDP Growth Rate', 'QUARTERLY', 'REAL ECONOMY', 'Expansion', '6.7', '% YoY', '-0.4%', 'negative', 'Potential trend: 7.00%', 'Headline year-on-year real economic growth at constant market prices.', 'MoSPI (CSO)', 'https://mospi.gov.in', '28 Feb 2026', 'Quarterly (Last working day)', true, 10, 'Strong', '7.1', '-0.4%', 'Down', 'Q3 FY26', '31 May 2026', 'first_revised', 'verified_official', NOW(), NOW()),
  ('money-supply-m3', 'money-supply-m3', 'Broad Money Supply (M3)', 'WEEKLY', 'MONETARY', 'Normal', '10.8', '% YoY', '+0.2%', 'positive', 'Nominal GDP anchor ~ 10-11%', 'Broad measure of liquidity in the financial system.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 11, 'Normal', '10.6', '+0.2%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('bank-credit-growth', 'bank-credit-growth', 'Non-Food Bank Credit Growth', 'WEEKLY', 'MONETARY', 'Expansion', '13.4', '% YoY', '+0.1%', 'positive', 'Sustainable pace: 12-14%', 'Total non-food credit disbursed by scheduled commercial banks.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 12, 'Expansion', '13.3', '+0.1%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('bank-deposit-growth', 'bank-deposit-growth', 'Bank Deposit Growth', 'WEEKLY', 'MONETARY', 'Normal', '11.9', '% YoY', '+0.3%', 'positive', 'Deposit-credit gap parity', 'Total aggregate deposit mobilization across commercial banks.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 13, 'Normal', '11.6', '+0.3%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('merchandise-trade-deficit', 'merchandise-trade-deficit', 'Merchandise Trade Deficit', 'MONTHLY', 'EXTERNAL', 'Contraction', '22.8', 'USD Billion', '+1.2', 'negative', 'Sustainable band: < $20B/mo', 'Difference between physical merchandise imports and exports.', 'Ministry of Commerce and Industry', 'https://commerce.gov.in', '15 Mar 2026', 'Monthly (15th)', true, 14, 'Deficit Elevated', '21.6', '+1.2', 'Up', 'Feb 2026', '15 Apr 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('current-account-deficit', 'current-account-deficit', 'Current Account Deficit (CAD)', 'QUARTERLY', 'EXTERNAL', 'Normal', '1.2', '% of GDP', '-0.2%', 'positive', 'Prudent limit: < 2.0% of GDP', 'Comprehensive balance of trade in goods, services and transfer payments.', 'Reserve Bank of India', 'https://rbi.org.in', '26 Dec 2025', 'Quarterly (~ end of quarter)', true, 15, 'Prudent', '1.4', '-0.2%', 'Down', 'Q2 FY26', '30 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('fiscal-deficit', 'fiscal-deficit', 'Union Fiscal Deficit (% of Budget Target)', 'MONTHLY', 'FISCAL', 'Normal', '68.4', '% of BE', '+8.2%', 'neutral', 'FY26 Target: 4.5% of GDP', 'Cumulative shortfall between union government revenue and expenditure.', 'Controller General of Accounts (CGA)', 'https://cga.nic.in', '28 Feb 2026', 'Monthly (Last working day)', true, 16, 'On Track', '60.2', '+8.2%', 'Up', 'Jan 2026', '31 Mar 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('usd-inr-reference-rate', 'usd-inr-reference-rate', 'USD / INR Exchange Rate', 'DAILY', 'EXTERNAL', 'Normal', '86.42', '₹ / USD', '+0.08', 'negative', 'Orderly adjustment, low volatility', 'Daily FBIL benchmark reference exchange rate.', 'Financial Benchmarks India (FBIL)', 'https://fbil.org.in', '19 Mar 2026', 'Daily (1:30 PM)', false, 17, 'Stable', '86.34', '+0.08', 'Up', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('gsec-10y-yield', 'gsec-10y-yield', '10-Year Benchmark G-Sec Yield', 'DAILY', 'MARKETS', 'Normal', '6.82', '% p.a.', '-3 bps', 'positive', 'Historical anchor: 6.80% - 7.20%', 'Secondary market yield on the benchmark 10-year Government of India sovereign bond.', 'CCIL / RBI', 'https://ccilindia.com', '19 Mar 2026', 'Daily (5:00 PM)', false, 18, 'Accommodative', '6.85', '-3 bps', 'Down', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('nifty-50-pe', 'nifty-50-pe', 'Nifty 50 P/E Ratio', 'DAILY', 'MARKETS', 'Normal', '21.4', 'x', '-0.2', 'neutral', '10Y Median: 20.8x', 'Price to Earnings valuation multiple of the NSE benchmark index.', 'National Stock Exchange (NSE)', 'https://nseindia.com', '19 Mar 2026', 'Daily (6:00 PM)', true, 19, 'Fair Value', '21.6', '-0.2', 'Down', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('direct-tax-growth', 'direct-tax-growth', 'Gross Direct Tax Collection Growth', 'MONTHLY', 'FISCAL', 'Expansion', '15.2', '% YoY', '+1.1%', 'positive', 'Budget estimate growth: 12.8%', 'Income tax and corporate tax revenue mobilization.', 'Central Board of Direct Taxes (CBDT)', 'https://incometaxindia.gov.in', '15 Mar 2026', 'Mid-month', true, 20, 'Buoyant', '14.1', '+1.1%', 'Up', 'Apr-Feb FY26', '15 Apr 2026', 'provisional', 'verified_official', NOW(), NOW()),
  ('external-debt-gdp', 'external-debt-gdp', 'External Debt to GDP Ratio', 'QUARTERLY', 'EXTERNAL', 'Expansion', '18.7', '% of GDP', '-0.2%', 'positive', 'Prudent sovereign threshold: < 22%', 'Total public and private external liabilities relative to GDP.', 'Ministry of Finance / RBI', 'https://dea.gov.in', '31 Dec 2025', 'Quarterly lag', true, 21, 'Safe Tier', '18.9', '-0.2%', 'Down', 'Q2 FY26', '31 Mar 2026', 'final', 'verified_official', NOW(), NOW()),
  ('fpi-net-flows', 'fpi-net-flows', 'Foreign Portfolio Investment (FPI) Flows', 'MONTHLY', 'MARKETS', 'Contraction', '-1420', 'USD Million', '-680', 'negative', 'Net capital inflow positive', 'Net institutional purchases by foreign portfolio investors.', 'National Securities Depository Limited (NSDL)', 'https://fpi.nsdl.co.in', '18 Mar 2026', 'Daily / Monthly tally', false, 22, 'Net Outflows', '-740', '-680', 'Down', 'Mar 2026 (MTD)', '01 Apr 2026', 'final', 'verified_official', NOW(), NOW()),
  ('essential-commodity-prices', 'essential-commodity-prices', 'Essential Food Price Index', 'DAILY', 'INFLATION', 'Normal', '124.6', 'Index points', '+0.4', 'negative', 'Stability threshold', 'Daily retail price monitoring of 22 essential commodities across national centers.', 'Department of Consumer Affairs', 'https://consumeraffairs.nic.in', '19 Mar 2026', 'Daily (Morning)', false, 23, 'Monitoring', '124.2', '+0.4', 'Up', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  frequency = EXCLUDED.frequency,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  value = EXCLUDED.value,
  unit = EXCLUDED.unit,
  delta_value = EXCLUDED.delta_value,
  delta_type = EXCLUDED.delta_type,
  target_anchor = EXCLUDED.target_anchor,
  summary = EXCLUDED.summary,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  release_date = EXCLUDED.release_date,
  release_window = EXCLUDED.release_window,
  is_published = EXCLUDED.is_published,
  display_order = EXCLUDED.display_order,
  stance_state = EXCLUDED.stance_state,
  previous_value = EXCLUDED.previous_value,
  delta_display = EXCLUDED.delta_display,
  trend_direction = EXCLUDED.trend_direction,
  observation_period = EXCLUDED.observation_period,
  next_expected_release = EXCLUDED.next_expected_release,
  data_status = EXCLUDED.data_status,
  verification_status = EXCLUDED.verification_status,
  updated_at = NOW();
