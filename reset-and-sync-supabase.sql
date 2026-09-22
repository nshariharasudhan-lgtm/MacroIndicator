-- ==============================================================================
-- RESET & SYNC SUPABASE SCHEMA FOR INDIA MACRO DASHBOARD
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
--
-- What this script does:
-- 1. Adds all extended columns to `macro_parameters` (idempotent, safe)
-- 2. Deletes legacy conflicting 'ind-*' rows that caused constant/stale metrics
-- 3. Configures `v_indicator_summary` view with INSTEAD OF triggers so you can edit
--    and delete directly in Supabase Table Editor!
-- 4. Syncs the 23 official metrics matching data/metrics.csv with ON CONFLICT UPDATE
-- ==============================================================================

-- 1. Ensure all required columns exist in macro_parameters
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS stance_state TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS delta_display TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS trend_direction TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS trend_badge_style TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS observation_period TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS next_expected_release TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS data_status TEXT DEFAULT 'provisional';
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified_official';
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS research_notes TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS why_it_matters TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS methodology_summary TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS benchmark_neutral_rate TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS historical_low_val TEXT;
ALTER TABLE IF EXISTS macro_parameters ADD COLUMN IF NOT EXISTS historical_high_val TEXT;

-- 2. Purge legacy 'ind-*' rows that had constant/stale metrics and conflicting slugs
DELETE FROM macro_parameters WHERE id LIKE 'ind-%';

-- 3. Drop and recreate view v_indicator_summary with clean columns and filters
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

-- 4. Add INSTEAD OF UPDATE trigger so Supabase Table Editor allows editing the view!
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

-- 5. Add INSTEAD OF DELETE trigger so Supabase Table Editor allows deleting rows in the view!
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

-- 6. Insert / Update the 23 official metrics matching data/metrics.csv
INSERT INTO macro_parameters (
  id, slug, title, frequency, category, status, value, unit, delta_value, delta_type, target_anchor,
  summary, source_name, source_url, release_date, release_window, is_published, display_order,
  stance_state, previous_value, delta_display, trend_direction, observation_period, next_expected_release,
  data_status, verification_status, updated_at
) VALUES
  ('cpi-inflation', 'cpi-inflation', 'CPI Inflation', 'MONTHLY', 'INFLATION', 'Expansion', '4.82', '% YoY', '-0.24%', 'negative', 'RBI Target: 4.00%', 'Headline Consumer Price Index measuring consumer basket inflation.', 'MoSPI / RBI', 'https://mospi.gov.in', '12 Mar 2026', 'Monthly (12th-14th)', true, 1, 'Above Target', '5.06', '-0.24%', 'Down', 'Feb 2026', '12 Apr 2026', 'final', 'verified_official', NOW()),
  ('wpi-inflation', 'wpi-inflation', 'WPI Inflation', 'MONTHLY', 'INFLATION', 'Normal', '9.92', '% YoY', '+0.15%', 'positive', 'Baseline producer price indicator', 'Wholesale Price Index measuring producer-level input price trends.', 'Office of Economic Adviser', 'https://eaindustry.nic.in', '14 Mar 2026', 'Monthly (14th-15th)', true, 2, 'Normal', '9.77', '+0.15%', 'Up', 'Feb 2026', '14 Apr 2026', 'provisional', 'verified_official', NOW()),
  ('gst-collections', 'gst-collections', 'GST Collections (Gross)', 'MONTHLY', 'FISCAL', 'Expansion', '199853', '₹ Crore', '+8.5%', 'positive', 'Target: ₹1,80,000 Cr/mo', 'Gross Goods and Services Tax collected across central and state jurisdictions.', 'Ministry of Finance / PIB', 'https://pib.gov.in', '01 Mar 2026', 'Monthly (1st-3rd)', true, 3, 'Robust', '184200', '+8.5%', 'Up', 'Feb 2026', '01 Apr 2026', 'final', 'verified_official', NOW()),
  ('pmi-manufacturing', 'pmi-manufacturing', 'Manufacturing PMI', 'MONTHLY', 'REAL ECONOMY', 'Expansion', '52.8', 'Index points', '-0.4', 'negative', 'Threshold: 50.0 (Expansion)', 'Purchasing Managers Index surveying manufacturing output, new orders and exports.', 'S&P Global / HSBC', 'https://www.spglobal.com', '01 Mar 2026', 'Monthly (1st)', true, 4, 'Expansion', '53.2', '-0.4', 'Down', 'Feb 2026', '01 Apr 2026', 'final', 'verified_official', NOW()),
  ('pmi-services', 'pmi-services', 'Services PMI', 'MONTHLY', 'REAL ECONOMY', 'Expansion', '54.1', 'Index points', '+0.6', 'positive', 'Threshold: 50.0 (Expansion)', 'Purchasing Managers Index surveying services sector demand, employment and pricing.', 'S&P Global / HSBC', 'https://www.spglobal.com', '03 Mar 2026', 'Monthly (3rd-5th)', true, 5, 'Expansion', '53.5', '+0.6', 'Up', 'Feb 2026', '03 Apr 2026', 'final', 'verified_official', NOW()),
  ('iip-industrial-production', 'iip-industrial-production', 'Index of Industrial Production (IIP)', 'MONTHLY', 'REAL ECONOMY', 'Normal', '4.2', '% YoY', '+0.4%', 'positive', 'Baseline growth > 4.5%', 'Measure of physical output volume across mining, manufacturing and electricity sectors.', 'MoSPI', 'https://mospi.gov.in', '12 Mar 2026', 'Monthly (12th)', true, 6, 'Normal', '3.8', '+0.4%', 'Up', 'Jan 2026', '12 Apr 2026', 'quick_estimates', 'verified_official', NOW()),
  ('foreign-exchange-reserves', 'foreign-exchange-reserves', 'Foreign Exchange Reserves', 'WEEKLY', 'EXTERNAL', 'Expansion', '689.4', 'USD Billion', '+2.3', 'positive', 'Adequacy: > 10 months import cover', 'Total foreign currency assets, gold reserves, SDRs and IMF reserve position.', 'Reserve Bank of India', 'https://rbi.org.in', '14 Mar 2026', 'Weekly (Friday 5:00 PM)', true, 7, 'Adequate', '687.1', '+2.3', 'Up', '07 Mar 2026', '21 Mar 2026', 'final', 'verified_official', NOW()),
  ('rbi-repo-rate', 'rbi-repo-rate', 'RBI Policy Repo Rate', 'MONTHLY', 'MONETARY', 'Normal', '6.50', '% p.a.', '0.0 bps', 'neutral', 'Neutral rate: 6.00%-6.50%', 'Benchmark policy lending rate set by the RBI Monetary Policy Committee.', 'Reserve Bank of India (MPC)', 'https://rbi.org.in', '08 Feb 2026', 'Bi-monthly MPC Meetings', true, 8, 'Neutral', '6.50', '0.0 bps', 'Flat', 'Feb 2026', '06 Apr 2026', 'final', 'verified_official', NOW()),
  ('core-sector-output', 'core-sector-output', 'Core Sector Growth (8 Industries)', 'MONTHLY', 'REAL ECONOMY', 'Normal', '3.6', '% YoY', '-0.3%', 'negative', 'Benchmark > 4.0%', 'Combined growth rate of coal, crude oil, natural gas, refinery products, fertilizers, steel, cement and electricity.', 'Office of Economic Adviser', 'https://eaindustry.nic.in', '28 Feb 2026', 'Monthly (Last working day)', false, 9, 'Normal', '3.9', '-0.3%', 'Down', 'Jan 2026', '31 Mar 2026', 'provisional', 'verified_official', NOW()),
  ('gdp-growth-rate', 'gdp-growth-rate', 'Real GDP Growth Rate', 'QUARTERLY', 'REAL ECONOMY', 'Expansion', '6.7', '% YoY', '-0.4%', 'negative', 'Potential trend: 7.00%', 'Headline year-on-year real economic growth at constant market prices.', 'MoSPI (CSO)', 'https://mospi.gov.in', '28 Feb 2026', 'Quarterly (Last working day)', true, 10, 'Strong', '7.1', '-0.4%', 'Down', 'Q3 FY26', '31 May 2026', 'first_revised', 'verified_official', NOW()),
  ('money-supply-m3', 'money-supply-m3', 'Broad Money Supply (M3)', 'WEEKLY', 'MONETARY', 'Normal', '10.8', '% YoY', '+0.2%', 'positive', 'Nominal GDP anchor ~ 10-11%', 'Broad measure of liquidity in the financial system.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 11, 'Normal', '10.6', '+0.2%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW()),
  ('bank-credit-growth', 'bank-credit-growth', 'Non-Food Bank Credit Growth', 'WEEKLY', 'MONETARY', 'Expansion', '13.4', '% YoY', '+0.1%', 'positive', 'Sustainable pace: 12-14%', 'Total non-food credit disbursed by scheduled commercial banks.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 12, 'Expansion', '13.3', '+0.1%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW()),
  ('bank-deposit-growth', 'bank-deposit-growth', 'Bank Deposit Growth', 'WEEKLY', 'MONETARY', 'Normal', '11.9', '% YoY', '+0.3%', 'positive', 'Deposit-credit gap parity', 'Total aggregate deposit mobilization across commercial banks.', 'Reserve Bank of India', 'https://rbi.org.in', '12 Mar 2026', 'Fortnightly (Friday)', false, 13, 'Normal', '11.6', '+0.3%', 'Up', '28 Feb 2026', '26 Mar 2026', 'provisional', 'verified_official', NOW()),
  ('merchandise-trade-deficit', 'merchandise-trade-deficit', 'Merchandise Trade Deficit', 'MONTHLY', 'EXTERNAL', 'Contraction', '22.8', 'USD Billion', '+1.2', 'negative', 'Sustainable band: < $20B/mo', 'Difference between physical merchandise imports and exports.', 'Ministry of Commerce and Industry', 'https://commerce.gov.in', '15 Mar 2026', 'Monthly (15th)', true, 14, 'Deficit Elevated', '21.6', '+1.2', 'Up', 'Feb 2026', '15 Apr 2026', 'provisional', 'verified_official', NOW()),
  ('current-account-deficit', 'current-account-deficit', 'Current Account Deficit (CAD)', 'QUARTERLY', 'EXTERNAL', 'Normal', '1.2', '% of GDP', '-0.2%', 'positive', 'Prudent limit: < 2.0% of GDP', 'Comprehensive balance of trade in goods, services and transfer payments.', 'Reserve Bank of India', 'https://rbi.org.in', '26 Dec 2025', 'Quarterly (~ end of quarter)', true, 15, 'Prudent', '1.4', '-0.2%', 'Down', 'Q2 FY26', '30 Mar 2026', 'final', 'verified_official', NOW()),
  ('fiscal-deficit', 'fiscal-deficit', 'Union Fiscal Deficit (% of Budget Target)', 'MONTHLY', 'FISCAL', 'Normal', '68.4', '% of BE', '+8.2%', 'neutral', 'FY26 Target: 4.5% of GDP', 'Cumulative shortfall between union government revenue and expenditure.', 'Controller General of Accounts (CGA)', 'https://cga.nic.in', '28 Feb 2026', 'Monthly (Last working day)', true, 16, 'On Track', '60.2', '+8.2%', 'Up', 'Jan 2026', '31 Mar 2026', 'provisional', 'verified_official', NOW()),
  ('usd-inr-reference-rate', 'usd-inr-reference-rate', 'USD / INR Exchange Rate', 'DAILY', 'EXTERNAL', 'Normal', '86.42', '₹ / USD', '+0.08', 'negative', 'Orderly adjustment, low volatility', 'Daily FBIL benchmark reference exchange rate.', 'Financial Benchmarks India (FBIL)', 'https://fbil.org.in', '19 Mar 2026', 'Daily (1:30 PM)', false, 17, 'Stable', '86.34', '+0.08', 'Up', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW()),
  ('gsec-10y-yield', 'gsec-10y-yield', '10-Year Benchmark G-Sec Yield', 'DAILY', 'MARKETS', 'Normal', '6.82', '% p.a.', '-3 bps', 'positive', 'Historical anchor: 6.80% - 7.20%', 'Secondary market yield on the benchmark 10-year Government of India sovereign bond.', 'CCIL / RBI', 'https://ccilindia.com', '19 Mar 2026', 'Daily (5:00 PM)', false, 18, 'Accommodative', '6.85', '-3 bps', 'Down', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW()),
  ('nifty-50-pe', 'nifty-50-pe', 'Nifty 50 P/E Ratio', 'DAILY', 'MARKETS', 'Normal', '21.4', 'x', '-0.2', 'neutral', '10Y Median: 20.8x', 'Price to Earnings valuation multiple of the NSE benchmark index.', 'National Stock Exchange (NSE)', 'https://nseindia.com', '19 Mar 2026', 'Daily (6:00 PM)', true, 19, 'Fair Value', '21.6', '-0.2', 'Down', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW()),
  ('direct-tax-growth', 'direct-tax-growth', 'Gross Direct Tax Collection Growth', 'MONTHLY', 'FISCAL', 'Expansion', '15.2', '% YoY', '+1.1%', 'positive', 'Budget estimate growth: 12.8%', 'Income tax and corporate tax revenue mobilization.', 'Central Board of Direct Taxes (CBDT)', 'https://incometaxindia.gov.in', '15 Mar 2026', 'Mid-month', true, 20, 'Buoyant', '14.1', '+1.1%', 'Up', 'Apr-Feb FY26', '15 Apr 2026', 'provisional', 'verified_official', NOW()),
  ('external-debt-gdp', 'external-debt-gdp', 'External Debt to GDP Ratio', 'QUARTERLY', 'EXTERNAL', 'Expansion', '18.7', '% of GDP', '-0.2%', 'positive', 'Prudent sovereign threshold: < 22%', 'Total public and private external liabilities relative to GDP.', 'Ministry of Finance / RBI', 'https://dea.gov.in', '31 Dec 2025', 'Quarterly lag', true, 21, 'Safe Tier', '18.9', '-0.2%', 'Down', 'Q2 FY26', '31 Mar 2026', 'final', 'verified_official', NOW()),
  ('fpi-net-flows', 'fpi-net-flows', 'Foreign Portfolio Investment (FPI) Flows', 'MONTHLY', 'MARKETS', 'Contraction', '-1420', 'USD Million', '-680', 'negative', 'Net capital inflow positive', 'Net institutional purchases by foreign portfolio investors.', 'National Securities Depository Limited (NSDL)', 'https://fpi.nsdl.co.in', '18 Mar 2026', 'Daily / Monthly tally', false, 22, 'Net Outflows', '-740', '-680', 'Down', 'Mar 2026 (MTD)', '01 Apr 2026', 'final', 'verified_official', NOW()),
  ('essential-commodity-prices', 'essential-commodity-prices', 'Essential Food Price Index', 'DAILY', 'INFLATION', 'Normal', '124.6', 'Index points', '+0.4', 'negative', 'Stability threshold', 'Daily retail price monitoring of 22 essential commodities across national centers.', 'Department of Consumer Affairs', 'https://consumeraffairs.nic.in', '19 Mar 2026', 'Daily (Morning)', false, 23, 'Monitoring', '124.2', '+0.4', 'Up', '19 Mar 2026', '20 Mar 2026', 'final', 'verified_official', NOW())
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

-- Verification summary output
SELECT
  (SELECT COUNT(*) FROM macro_parameters) AS total_parameters,
  (SELECT COUNT(*) FROM v_indicator_summary) AS published_view_count,
  (SELECT COUNT(*) FROM macro_parameters WHERE id LIKE 'ind-%') AS stale_legacy_count;
