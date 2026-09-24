-- =========================================================================
-- MacroNest.online — Insights Blog Engine Database Schema (Supabase / PostgreSQL)
-- Description: Stores editorial articles, policy briefings, and macroeconomic deep-dives.
-- Run this in your Supabase SQL Editor: Dashboard -> SQL Editor -> New Query
-- =========================================================================

-- 1. Create the `insights` table
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Monetary Policy',
  tags TEXT[] DEFAULT ARRAY['RBI', 'Economy', 'Macro']::TEXT[],
  cover_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'MacroNest Research Team',
  author_role TEXT DEFAULT 'Macroeconomic Intelligence Unit',
  reading_time_minutes INTEGER DEFAULT 5,
  is_published BOOLEAN NOT NULL DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  focus_keyword TEXT,
  canonical_url TEXT,
  views_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes for high-performance querying and SEO routing
CREATE INDEX IF NOT EXISTS idx_insights_slug ON public.insights(slug);
CREATE INDEX IF NOT EXISTS idx_insights_published ON public.insights(is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_category ON public.insights(category);

-- 3. Automatic timestamp updater trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_insights_updated_at ON public.insights;
CREATE TRIGGER trigger_insights_updated_at
  BEFORE UPDATE ON public.insights
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Policy A: Anyone can read published posts
DROP POLICY IF EXISTS "Allow public read access to published insights" ON public.insights;
CREATE POLICY "Allow public read access to published insights"
  ON public.insights
  FOR SELECT
  TO public
  USING (is_published = true);

-- Policy B: Allow full management access (insert, update, delete)
-- (Allows your Admin Dashboard to manage articles directly via Supabase API)
DROP POLICY IF EXISTS "Allow full admin management" ON public.insights;
CREATE POLICY "Allow full admin management"
  ON public.insights
  FOR ALL
  TO anon, authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 5. Seed Initial Macroeconomic Research Articles
INSERT INTO public.insights (
  slug,
  title,
  excerpt,
  content,
  category,
  tags,
  cover_image_url,
  author_name,
  author_role,
  reading_time_minutes,
  is_published,
  meta_title,
  meta_description,
  focus_keyword,
  published_at
) VALUES
(
  'rbi-mpc-stance-shift-liquidity-transmission',
  'RBI MPC Stance Shift: How Neutral Policy Reshapes Systemic Liquidity & EBLR Transmission',
  'An in-depth analysis of the Reserve Bank of India’s transition to a neutral stance, evaluating systemic banking liquidity surplus dynamics and floating home loan rate transmission.',
  '## Executive Summary

The Reserve Bank of India’s (RBI) Monetary Policy Committee (MPC) has orchestrated a pivotal realignment in monetary policy communication. Moving from a protracted stance of **"Withdrawal of Accommodation"** to **"Neutral"**, the central bank signals that headline inflation has entered the durable glide path toward the statutory 4.0% anchor.

### Systemic Banking Liquidity: The Operational Pivot

Monetary transmission begins not in bank branch boardrooms, but in the call money market and the **Standing Deposit Facility (SDF)**. 

1. **Absorption Dynamics**: When banking liquidity is in consistent surplus (₹1.5–2.0 Lakh Crore), the weighted average call rate (WACR) softens toward the lower boundary of the liquidity adjustment facility (LAF) corridor.
2. **Reverse Repo & VRRR Operations**: The RBI deploys variable rate reverse repo (VRRR) auctions of 7-day to 14-day tenors to prevent excess frictional liquidity from stoking short-term speculative pressure.

### Floating Loan Transmission (EBLR)

Since October 2019, all retail floating loans (including home and auto loans) are mandated by the RBI to be linked to an **External Benchmark Lending Rate (EBLR)**, primarily the Policy Repo Rate:

$$\text{EBLR} = \text{Policy Repo Rate} + \text{Spread / Credit Risk Premium}$$

When the MPC eventually delivers a 25 bps rate cut, existing home loan borrowers with EBLR-pegged facilities will experience statutory rate resets within 3 months, offering prompt relief to household cash flows.

### Outlook for FY25-26

As fiscal consolidation remains on track at 4.9% of GDP and headline CPI moderates beneath the 4% threshold, the runway is clear for gradual monetary accommodation without compromising rupee stability.',
  'Monetary Policy',
  ARRAY['RBI', 'Repo Rate', 'Liquidity', 'EBLR', 'Inflation']::TEXT[],
  'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
  'MacroNest Research Team',
  'Macroeconomic Policy Desk',
  6,
  true,
  'RBI MPC Stance Shift & Liquidity Transmission | MacroNest Insights',
  'Examine how the Reserve Bank of India’s neutral policy stance influences banking liquidity surplus, EBLR transmission, and home loan EMIs.',
  'RBI MPC stance',
  now() - INTERVAL '2 days'
),
(
  'decoding-gst-collections-formalization-macro-pulse',
  'Decoding ₹1.85 Lakh Crore GST Run-Rate: Consumption Vitality or Tax Formalization?',
  'Monthly gross GST collections have settled above the ₹1.8 Lakh Crore mark. Here is what underlying CGST, SGST, IGST, and cess trends reveal about India’s internal trade momentum.',
  '## The ₹1.8 Lakh Crore Plateau

India’s gross Goods and Services Tax (GST) collections have consistently surpassed the ₹1.80 Lakh Crore watermark, demonstrating the robust formalization of domestic supply chains and steady compliance enforcement.

### Deconstructing the Components

A granular look at the monthly revenue basket highlights distinct engines of buoyancy:

- **Central GST (CGST)**: Direct gauge of inter-state manufacturing and service value additions.
- **State GST (SGST)**: Mirrors consumption consumption patterns across high-output states such as Maharashtra, Karnataka, and Gujarat.
- **Integrated GST (IGST)**: Strong domestic transactions complemented by resilient capital goods import customs receipts.
- **Compensation Cess**: Sustained automobile dispatch numbers and consumer durables momentum.

### E-Way Bill Velocity as a High-Frequency Proxy

E-way bill generation has averaged over 100 million bills monthly. This metric acts as an early indicator of:

1. **Inter-State Freight Volume**: Diesel consumption and highway toll collections tracking national freight velocity.
2. **Manufacturing Turnaround**: Capital goods procurement reflecting private CAPEX intent.

### Fiscal Deficit Cushion

With gross collections tracking ahead of the Union Budget estimates, the central exchequer enjoys a comfortable fiscal buffer, allowing the government to maintain its public infrastructure capital expenditure targets without breaching fiscal deficit containment pathways.',
  'Fiscal & GST',
  ARRAY['GST', 'Fiscal Deficit', 'Revenue', 'Formalization', 'Trade']::TEXT[],
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
  'MacroNest Research Team',
  'Fiscal Policy Desk',
  5,
  true,
  'GST Collections Analysis: Consumption & Formalization | MacroNest Insights',
  'Detailed breakdown of monthly GST collections above ₹1.8 Lakh Crore, analyzing internal trade momentum, e-way bill volume, and fiscal deficit cushion.',
  'GST collections analysis',
  now() - INTERVAL '5 days'
)
ON CONFLICT (slug) DO NOTHING;
