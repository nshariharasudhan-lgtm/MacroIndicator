import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InsightPost } from '../types.ts';

// Initial pre-seeded macroeconomic research briefings for instant preview & offline fallback
export const SEED_INSIGHTS: InsightPost[] = [
  {
    id: 'seed-1-rbi-mpc-stance-shift',
    slug: 'rbi-mpc-stance-shift-liquidity-transmission',
    title: 'RBI MPC Stance Shift: How Neutral Policy Reshapes Systemic Liquidity & EBLR Transmission',
    excerpt: 'An in-depth analysis of the Reserve Bank of India’s transition to a neutral stance, evaluating systemic banking liquidity surplus dynamics and floating home loan rate transmission.',
    content: `## Executive Summary

The Reserve Bank of India’s (RBI) Monetary Policy Committee (MPC) has orchestrated a pivotal realignment in monetary policy communication. Moving from a protracted stance of **"Withdrawal of Accommodation"** to **"Neutral"**, the central bank signals that headline retail inflation is firmly anchored within its statutory tolerance corridor.

### Systemic Banking Liquidity: The Operational Pivot

Monetary transmission begins not in bank branch boardrooms, but in the call money market and the **Standing Deposit Facility (SDF)** corridor:

1. **Absorption Dynamics**: When banking liquidity is in consistent surplus (₹1.5–2.0 Lakh Crore), the weighted average call rate (WACR) softens toward the lower boundary of the liquidity adjustment facility (LAF) corridor.
2. **Reverse Repo & VRRR Operations**: The RBI deploys variable rate reverse repo (VRRR) auctions of 7-day to 14-day tenors to prevent excess frictional liquidity from stoking short-term speculative pressure.

### Floating Loan Transmission (EBLR)

Since October 2019, all retail floating loans (including home and auto loans) are mandated by the RBI to be linked to an **External Benchmark Lending Rate (EBLR)**, primarily the Policy Repo Rate:

> **EBLR Formula**: Policy Repo Rate + Bank Spread + Credit Risk Premium

When the MPC delivers a repo rate change, existing home loan borrowers with EBLR-pegged facilities experience statutory rate resets within 3 months, directly impacting monthly EMI outflows.

### Outlook for FY25-26

As fiscal consolidation remains on track at 4.9% of GDP and headline CPI moderates beneath the 4% threshold, the runway is clear for gradual monetary accommodation without compromising rupee stability.`,
    category: 'Monetary Policy',
    tags: ['RBI', 'Repo Rate', 'Banking Liquidity', 'EBLR', 'Inflation'],
    coverImageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    authorName: 'MacroNest Research Team',
    authorRole: 'Monetary Policy Unit',
    readingTimeMinutes: 5,
    isPublished: true,
    metaTitle: 'RBI MPC Stance Shift & Liquidity Transmission | MacroNest Insights',
    metaDescription: 'Examine how the Reserve Bank of India’s neutral policy stance influences banking liquidity surplus, EBLR transmission, and home loan EMIs.',
    focusKeyword: 'RBI MPC stance',
    canonicalUrl: 'https://macronest.online/insights/rbi-mpc-stance-shift-liquidity-transmission',
    viewsCount: 1420,
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'seed-2-gst-collections-formalization',
    slug: 'decoding-gst-collections-formalization-macro-pulse',
    title: 'Decoding ₹1.85 Lakh Crore GST Run-Rate: Consumption Vitality or Tax Formalization?',
    excerpt: 'Monthly gross GST collections have settled above the ₹1.8 Lakh Crore mark. Here is what underlying CGST, SGST, IGST, and cess trends reveal about India’s internal trade momentum.',
    content: `## The ₹1.8 Lakh Crore Plateau

India’s gross Goods and Services Tax (GST) collections have consistently surpassed the ₹1.80 Lakh Crore watermark, demonstrating the robust formalization of domestic supply chains and steady compliance enforcement.

### Deconstructing the Components

A granular look at the monthly revenue basket highlights distinct engines of buoyancy:

- **Central GST (CGST)**: Direct gauge of inter-state manufacturing and service value additions.
- **State GST (SGST)**: Mirrors consumption patterns across high-output states such as Maharashtra, Karnataka, and Gujarat.
- **Integrated GST (IGST)**: Strong domestic transactions complemented by resilient capital goods import customs receipts.
- **Compensation Cess**: Sustained automobile dispatch numbers and consumer durables momentum.

### E-Way Bill Velocity as a High-Frequency Proxy

E-way bill generation has averaged over 100 million bills monthly. This metric acts as an early indicator of:

1. **Inter-State Freight Volume**: Diesel consumption and highway toll collections tracking national freight velocity.
2. **Manufacturing Turnaround**: Capital goods procurement reflecting private CAPEX intent.

### Fiscal Deficit Cushion

With gross collections tracking ahead of the Union Budget estimates, the central exchequer enjoys a comfortable fiscal buffer, allowing the government to maintain its public infrastructure capital expenditure targets without breaching fiscal deficit containment pathways.`,
    category: 'Fiscal & GST',
    tags: ['GST', 'Fiscal Deficit', 'E-Way Bill', 'Consumption', 'Revenue'],
    coverImageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
    authorName: 'MacroNest Research Team',
    authorRole: 'Fiscal Policy Desk',
    readingTimeMinutes: 4,
    isPublished: true,
    metaTitle: 'GST Collections Analysis: Consumption & Formalization | MacroNest Insights',
    metaDescription: 'Detailed breakdown of monthly GST collections above ₹1.8 Lakh Crore, analyzing internal trade momentum, e-way bill volume, and fiscal deficit cushion.',
    focusKeyword: 'GST collections analysis',
    canonicalUrl: 'https://macronest.online/insights/decoding-gst-collections-formalization-macro-pulse',
    viewsCount: 980,
    publishedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: 'seed-3-forex-reserves-buffering-external-volatility',
    slug: 'india-forex-reserves-anatomy-external-shock-buffer',
    title: 'Anatomy of $700+ Billion Forex Reserves: India’s Fortress Against Dollar Spikes',
    excerpt: 'How the Reserve Bank of India structured foreign currency assets, physical gold reserves, and currency swaps to shield the Rupee during global monetary tightening.',
    content: `## The Anatomy of External Fortification

With India’s foreign currency assets and gold valuation surpassing historical milestones, the country’s import cover comfortably stands at over 11 months of projected merchandise inflows.

### Components of the Reserve Shield

The RBI’s Weekly Statistical Supplement categorizes the reserve portfolio into four distinct asset classes:

1. **Foreign Currency Assets (FCA)**: High-quality sovereign bonds (US Treasuries, German Bunds, UK Gilts) and central bank deposits.
2. **Gold Reserves**: Physical bullion stored at the RBI vaults and the Bank of England, appreciating substantially during global geopolitical flight to safety.
3. **Special Drawing Rights (SDRs)**: Statutory reserve assets allocated by the International Monetary Fund (IMF).
4. **Reserve Tranche Position (RTP)**: India’s liquid quota in the IMF.

### FX Intervention Strategy: Lean Against the Wind

The RBI operates an asymmetric FX intervention regime:
- **During Rupee Depreciation Pressures**: Selling dollars selectively to smooth out non-linear volatility, preventing currency speculation without defending a rigid numeric exchange peg.
- **During FPI Capital Inflows**: Absorbing surplus foreign currency into reserves to prevent disruptive real effective exchange rate (REER) overvaluation.

This reserve accumulation provides sovereign confidence to foreign direct investors and sovereign debt index trackers.`,
    category: 'Forex & External',
    tags: ['Forex', 'RBI Reserves', 'USD-INR', 'Gold', 'External Debt'],
    coverImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    authorName: 'MacroNest Research Team',
    authorRole: 'External Sector Desk',
    readingTimeMinutes: 5,
    isPublished: true,
    metaTitle: 'India Forex Reserves Analysis & Rupee Defense | MacroNest Insights',
    metaDescription: 'Deep dive into India’s $700+ Billion foreign exchange reserves, evaluating import cover, gold allocation, and RBI FX intervention mechanics.',
    focusKeyword: 'India forex reserves',
    canonicalUrl: 'https://macronest.online/insights/india-forex-reserves-anatomy-external-shock-buffer',
    viewsCount: 1120,
    publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'seed-4-us-fed-rate-cuts-spillover-india',
    slug: 'us-fed-monetary-pivot-spillover-effects-on-emerging-markets',
    title: 'The US Fed Rate Cut Pivot: Tracking Yield Spread Spillovers on Indian Equities & G-Secs',
    excerpt: 'Examining how Federal Open Market Committee (FOMC) interest rate cuts alter 10-year Treasury yield differentials, FII sovereign bond flows, and domestic borrowing costs.',
    content: `## The Federal Reserve’s Rate Easing Cycle

Whenever the US Federal Reserve enters an easing corridor, the global cost of capital shifts fundamentally. For emerging market anchors like India, the transmission runs through interest rate differentials, sovereign bond yields, and foreign portfolio investment (FPI) allocations.

### The 10-Year Spread Dynamic

The spread between the **India 10-Year Benchmark G-Sec Yield** (hovering around 6.75%–6.85%) and the **US 10-Year Treasury Yield** (4.00%–4.20%) forms the risk premium required by global fixed-income managers:

- **Widening Spread (> 300 bps)**: Encourages foreign institutional debt inflows into Fully Accessible Route (FAR) securities.
- **Narrowing Spread (< 200 bps)**: Squeezes risk-adjusted returns, often triggering capital repatriation toward dollar denominated safe havens.

### Impact of Global Bond Index Inclusions

India’s staged inclusion in the JP Morgan GBI-EM Global Diversified Index and Bloomberg Emerging Market Local Currency Index has permanently deepened institutional liquidity, insulating domestic government borrowing programs from localized yield spikes.

### Corporate Borrowing via External Commercial Borrowings (ECBs)

Lower Fed Funds rates directly reduce SOFR (Secured Overnight Financing Rate) benchmarks, significantly cheapening offshore foreign-currency debt financing for Indian infrastructure conglomerates.`,
    category: 'Global Benchmarks',
    tags: ['US Fed', 'FOMC', 'G-Sec Yield', 'Treasury', 'FII Flows'],
    coverImageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80',
    authorName: 'MacroNest Research Team',
    authorRole: 'Global Macro Desk',
    readingTimeMinutes: 5,
    isPublished: true,
    metaTitle: 'US Fed Rate Pivot & Indian Market Spillovers | MacroNest Insights',
    metaDescription: 'Analyze how US Federal Reserve monetary easing impacts Indian 10-year G-sec yields, FII debt flows, and external borrowing benchmarks.',
    focusKeyword: 'US Fed rate cuts India',
    canonicalUrl: 'https://macronest.online/insights/us-fed-monetary-pivot-spillover-effects-on-emerging-markets',
    viewsCount: 860,
    publishedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  }
];

const LOCAL_STORAGE_KEY = 'macronest_insights_posts_v1';

// Read environment variables
export function getSupabaseCredentials() {
  let url = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env?.VITE_SUPABASE_URL ||
    process.env?.SUPABASE_URL ||
    ''
  ).trim();

  // Normalize: remove trailing /rest/v1 or trailing slash
  url = url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

  const anonKey = (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
    process.env?.VITE_SUPABASE_ANON_KEY ||
    process.env?.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('your-project.supabase.co') &&
    !anonKey.includes('your-anon-key')
  );
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey || !url.startsWith('https://')) return null;

  try {
    supabaseInstance = createClient(url, anonKey);
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

// Fallback Local Storage Manager
function getLocalPosts(): InsightPost[] {
  if (typeof window === 'undefined') return SEED_INSIGHTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_INSIGHTS));
      return SEED_INSIGHTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_INSIGHTS;
  } catch (err) {
    console.error('Local storage read error for insights:', err);
    return SEED_INSIGHTS;
  }
}

function saveLocalPosts(posts: InsightPost[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(posts));
  } catch (err) {
    console.error('Local storage save error for insights:', err);
  }
}

// Map from Supabase snake_case row to CamelCase InsightPost
export function mapRowToInsight(row: any): InsightPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category || 'Macro Economy',
    tags: Array.isArray(row.tags) ? row.tags : [],
    coverImageUrl: row.cover_image_url || undefined,
    authorName: row.author_name || 'MacroNest Research',
    authorRole: row.author_role || 'Macroeconomic Intelligence',
    readingTimeMinutes: row.reading_time_minutes || 4,
    isPublished: row.is_published ?? true,
    metaTitle: row.meta_title || undefined,
    metaDescription: row.meta_description || undefined,
    focusKeyword: row.focus_keyword || undefined,
    canonicalUrl: row.canonical_url || undefined,
    viewsCount: row.views_count || 0,
    publishedAt: row.published_at || row.created_at || new Date().toISOString(),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

// Map from CamelCase InsightPost to Supabase snake_case row
export function mapInsightToRow(post: Partial<InsightPost>): any {
  const row: any = {};
  const isUuid = post.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(post.id);
  if (isUuid) row.id = post.id;
  if (post.slug !== undefined) row.slug = post.slug;
  if (post.title !== undefined) row.title = post.title;
  if (post.excerpt !== undefined) row.excerpt = post.excerpt;
  if (post.content !== undefined) row.content = post.content;
  if (post.category !== undefined) row.category = post.category;
  if (post.tags !== undefined) row.tags = post.tags;
  if (post.coverImageUrl !== undefined) row.cover_image_url = post.coverImageUrl;
  if (post.authorName !== undefined) row.author_name = post.authorName;
  if (post.authorRole !== undefined) row.author_role = post.authorRole;
  if (post.readingTimeMinutes !== undefined) row.reading_time_minutes = post.readingTimeMinutes;
  if (post.isPublished !== undefined) row.is_published = post.isPublished;
  if (post.metaTitle !== undefined) row.meta_title = post.metaTitle;
  if (post.metaDescription !== undefined) row.meta_description = post.metaDescription;
  if (post.focusKeyword !== undefined) row.focus_keyword = post.focusKeyword;
  if (post.canonicalUrl !== undefined) row.canonical_url = post.canonicalUrl;
  if (post.viewsCount !== undefined) row.views_count = post.viewsCount;
  if (post.publishedAt !== undefined) row.published_at = post.publishedAt;
  return row;
}

// ================= PUBLIC DATA ACCESS METHODS ================= //

/**
 * Fetch all insights. If Supabase is configured and reachable, queries Supabase table 'insights'.
 * Otherwise, falls back smoothly to local cached/seed storage with no UI disruption.
 */
export async function getInsights(includeUnpublished = false): Promise<{
  posts: InsightPost[];
  isUsingSupabase: boolean;
  error?: string;
}> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      let query = supabase
        .from('insights')
        .select('*')
        .order('published_at', { ascending: false });

      if (!includeUnpublished) {
        query = query.eq('is_published', true);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Supabase query returned error, falling back to cached insights:', error.message);
        return {
          posts: includeUnpublished ? getLocalPosts() : getLocalPosts().filter((p) => p.isPublished),
          isUsingSupabase: false,
          error: `Supabase: ${error.message}. Showing local cache.`,
        };
      }

      if (data && data.length > 0) {
        const posts = data.map(mapRowToInsight);
        // Sync local cache
        saveLocalPosts(posts);
        return { posts, isUsingSupabase: true };
      }
    } catch (err: any) {
      console.warn('Supabase fetch exception, using local store:', err);
    }
  }

  // Fallback to local storage
  const local = getLocalPosts();
  return {
    posts: includeUnpublished ? local : local.filter((p) => p.isPublished),
    isUsingSupabase: false,
  };
}

/**
 * Fetch a single insight article by URL slug.
 */
export async function getInsightBySlug(slug: string): Promise<InsightPost | null> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('insights')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!error && data) {
        return mapRowToInsight(data);
      }
    } catch (err) {
      console.warn('Supabase single fetch error:', err);
    }
  }

  // Fallback
  const local = getLocalPosts();
  return local.find((p) => p.slug === slug) || null;
}

/**
 * Save or update an insight article.
 */
export async function saveInsight(
  post: Partial<InsightPost> & { title: string; content: string }
): Promise<{ success: boolean; post: InsightPost; isUsingSupabase: boolean; error?: string }> {
  const now = new Date().toISOString();
  const slug =
    post.slug?.trim() ||
    post.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    `article-${Date.now()}`;

  const cleanPost: InsightPost = {
    id: post.id || `insight-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    slug,
    title: post.title.trim(),
    excerpt: post.excerpt?.trim() || post.content.replace(/#+\s/g, '').substring(0, 160) + '...',
    content: post.content.trim(),
    category: post.category || 'Monetary Policy',
    tags: Array.isArray(post.tags) ? post.tags : ['Macro', 'India'],
    coverImageUrl: post.coverImageUrl || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    authorName: post.authorName?.trim() || 'MacroNest Research Team',
    authorRole: post.authorRole?.trim() || 'Macroeconomic Intelligence Unit',
    readingTimeMinutes: Math.max(1, Math.ceil(post.content.trim().split(/\s+/).length / 200)),
    isPublished: post.isPublished ?? true,
    metaTitle: post.metaTitle?.trim() || `${post.title.trim()} | MacroNest Insights`,
    metaDescription: post.metaDescription?.trim() || post.excerpt?.trim() || post.title.trim(),
    focusKeyword: post.focusKeyword?.trim() || '',
    canonicalUrl: post.canonicalUrl?.trim() || `https://macronest.online/insights/${slug}`,
    viewsCount: post.viewsCount || 0,
    publishedAt: post.publishedAt || now,
    createdAt: post.createdAt || now,
    updatedAt: now,
  };

  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const row = mapInsightToRow(cleanPost);
      const { data, error } = await supabase
        .from('insights')
        .upsert(row, { onConflict: 'slug' })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        // Fallback to local
        updateLocalStore(cleanPost);
        return {
          success: true,
          post: cleanPost,
          isUsingSupabase: false,
          error: `Saved to local storage. Supabase error: ${error.message}`,
        };
      }

      const saved = data ? mapRowToInsight(data) : cleanPost;
      updateLocalStore(saved);
      return { success: true, post: saved, isUsingSupabase: true };
    } catch (err: any) {
      console.error('Supabase exception:', err);
      updateLocalStore(cleanPost);
      return {
        success: true,
        post: cleanPost,
        isUsingSupabase: false,
        error: `Saved locally. Exception: ${err.message}`,
      };
    }
  }

  // Local storage mode
  updateLocalStore(cleanPost);
  return { success: true, post: cleanPost, isUsingSupabase: false };
}

function updateLocalStore(post: InsightPost) {
  const current = getLocalPosts();
  const index = current.findIndex((p) => p.id === post.id || p.slug === post.slug);
  let updated: InsightPost[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = post;
  } else {
    updated = [post, ...current];
  }
  saveLocalPosts(updated);
}

/**
 * Delete an insight article by ID or slug.
 */
export async function deleteInsight(idOrSlug: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  if (supabase && isSupabaseConfigured()) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
      const query = isUuid
        ? supabase.from('insights').delete().eq('id', idOrSlug)
        : supabase.from('insights').delete().eq('slug', idOrSlug);

      const { error } = await query;

      if (error) {
        console.error('Supabase delete error:', error);
      }
    } catch (err) {
      console.warn('Supabase delete exception:', err);
    }
  }

  // Also remove from local store
  const current = getLocalPosts();
  const filtered = current.filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
  saveLocalPosts(filtered);
  return { success: true };
}
