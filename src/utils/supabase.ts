import { createClient } from '@supabase/supabase-js';
import { BlogPost } from '../types.ts';

// Supabase URL & Public Anon Key for MacroNest.online
const DEFAULT_SUPABASE_URL = 'https://ngbbqtrmcafjdkbeabaq.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYmJxdHJtY2FmamRrYmVhYmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MTU3MTUsImV4cCI6MjEwNTQ5MTcxNX0.QOqMtWwglhqlhK3QCmG74nxdu9l_gzfLXDV29eIdhBA';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
export const SUPABASE_URL = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export function mapSupabaseRowToBlogPost(row: any): BlogPost {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category || 'Monetary Policy',
    author: row.author || 'Macro Research Desk',
    readTimeMinutes: Number(row.read_time_minutes) || 5,
    coverImage: row.cover_image || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    seo: {
      metaTitle: row.seo_meta_title || row.title,
      metaDescription: row.seo_meta_description || row.excerpt,
      keywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : [],
      canonicalUrl: row.seo_canonical_url || `https://macronest.online/blog/${row.slug}`,
      ogImage: row.seo_og_image || '',
      structuredDataType: row.seo_structured_data_type || 'Article',
    },
  };
}

export function mapBlogPostToSupabaseRow(post: Partial<BlogPost> & { id?: string }): any {
  const slug = post.slug || `post-${Date.now()}`;
  return {
    id: post.id || `post-${Date.now()}`,
    title: post.title || 'Untitled Analysis',
    slug,
    excerpt: post.excerpt || '',
    content: post.content || '',
    category: post.category || 'Monetary Policy',
    author: post.author || 'Macro Research Desk',
    read_time_minutes: post.readTimeMinutes || 5,
    cover_image: post.coverImage || '',
    tags: post.tags || [],
    is_published: post.isPublished !== undefined ? post.isPublished : true,
    published_at: post.publishedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seo_meta_title: post.seo?.metaTitle || post.title,
    seo_meta_description: post.seo?.metaDescription || post.excerpt,
    seo_keywords: post.seo?.keywords || [],
    seo_canonical_url: post.seo?.canonicalUrl || `https://macronest.online/blog/${slug}`,
    seo_og_image: post.seo?.ogImage || '',
    seo_structured_data_type: post.seo?.structuredDataType || 'Article',
  };
}

/**
 * Fetch all articles directly from Supabase (for static deployment fallback)
 */
export async function fetchPostsFromSupabase(): Promise<BlogPost[] | null> {
  try {
    const { data, error } = await supabaseClient
      .from('articles')
      .select('*')
      .order('published_at', { ascending: false });

    if (error || !data) {
      return null;
    }

    return data.map(mapSupabaseRowToBlogPost);
  } catch (err) {
    console.warn('Direct Supabase fetch posts error:', err);
    return null;
  }
}

/**
 * Save/Upsert an article directly in Supabase
 */
export async function savePostToSupabase(post: Partial<BlogPost> & { id?: string }): Promise<BlogPost | null> {
  try {
    const row = mapBlogPostToSupabaseRow(post);
    const { data, error } = await supabaseClient
      .from('articles')
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();

    if (error || !data) {
      console.warn('Direct Supabase upsert error:', error);
      return null;
    }

    return mapSupabaseRowToBlogPost(data);
  } catch (err) {
    console.warn('Direct Supabase save post error:', err);
    return null;
  }
}

/**
 * Delete an article directly from Supabase
 */
export async function deletePostFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseClient.from('articles').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Direct Supabase verification for deployed environments (e.g. Vercel, Netlify, Cloudflare)

 * where the full-stack Express server might not be running as a persistent daemon.
 */
export async function verifyAdminPasswordWithSupabase(
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabaseClient.rpc('verify_admin_password', {
      p_password: password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data === true) {
      return { success: true };
    }

    return { success: false, error: 'Incorrect admin password' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to connect to Supabase' };
  }
}
