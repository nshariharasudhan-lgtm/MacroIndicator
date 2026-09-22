import { BlogPost, BlogPostSEO } from '../types.ts';

export function updatePageSEO(seo: {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  structuredData?: object;
}) {
  // Update document title
  document.title = seo.title;

  // Update or create meta description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', seo.description);

  // Update or create meta keywords
  if (seo.keywords && seo.keywords.length > 0) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords.join(', '));
  }

  // Update OpenGraph tags
  const ogTags: Record<string, string> = {
    'og:title': seo.title,
    'og:description': seo.description,
    'og:type': seo.ogType || 'website',
    'og:url': seo.canonicalUrl || window.location.href,
  };

  if (seo.ogImage) {
    ogTags['og:image'] = seo.ogImage;
  }

  Object.entries(ogTags).forEach(([prop, content]) => {
    let tag = document.querySelector(`meta[property="${prop}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', prop);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });

  // Update Twitter cards
  const twitterTags: Record<string, string> = {
    'twitter:card': 'summary_large_image',
    'twitter:title': seo.title,
    'twitter:description': seo.description,
  };

  Object.entries(twitterTags).forEach(([name, content]) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });

  // Canonical link tag
  const canonicalUrl = seo.canonicalUrl || window.location.href;
  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', canonicalUrl);

  // Structured Data (JSON-LD)
  let scriptSchema = document.getElementById('app-structured-data');
  if (!scriptSchema) {
    scriptSchema = document.createElement('script');
    scriptSchema.id = 'app-structured-data';
    scriptSchema.setAttribute('type', 'application/ld+json');
    document.head.appendChild(scriptSchema);
  }

  if (seo.structuredData) {
    scriptSchema.textContent = JSON.stringify(seo.structuredData, null, 2);
  } else {
    // Default WebSite schema
    scriptSchema.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'India Macro Dashboard & Analysis',
      'url': window.location.origin,
      'description': seo.description,
    }, null, 2);
  }
}

export function generatePostStructuredData(post: BlogPost, origin: string) {
  const url = `${origin}/blog/${post.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': post.seo.structuredDataType || 'BlogPosting',
    'headline': post.seo.metaTitle || post.title,
    'description': post.seo.metaDescription || post.excerpt,
    'author': {
      '@type': 'Person',
      'name': post.author || 'India Macro Research Desk',
    },
    'datePublished': post.publishedAt,
    'dateModified': post.updatedAt || post.publishedAt,
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': url,
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'India Macro Dashboard',
      'logo': {
        '@type': 'ImageObject',
        'url': `${origin}/favicon.ico`,
      },
    },
    'keywords': post.seo.keywords?.join(', ') || post.tags?.join(', ') || 'India Economy, Macroeconomics, RBI',
    'articleSection': post.category,
    'wordCount': post.content ? post.content.split(/\s+/).length : 0,
  };
}
