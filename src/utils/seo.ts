export function updatePageSEO(seo: {
  title: string;
  description: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  robots?: string;
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

  // Update or create robots directive
  const robotsContent =
    seo.robots ||
    'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  let metaRobots = document.querySelector('meta[name="robots"]');
  if (!metaRobots) {
    metaRobots = document.createElement('meta');
    metaRobots.setAttribute('name', 'robots');
    document.head.appendChild(metaRobots);
  }
  metaRobots.setAttribute('content', robotsContent);

  // Ensure meta keywords tag is removed (clean modern SEO)
  const existingKeywords = document.querySelector('meta[name="keywords"]');
  if (existingKeywords) {
    existingKeywords.remove();
  }

  // Canonical link tag - strictly canonicalize to https://macronest.online without www
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const canonicalUrl =
    seo.canonicalUrl || `https://macronest.online${currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '')}`;

  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', canonicalUrl);

  const ogImageUrl = seo.ogImage || 'https://macronest.online/og-image.png';

  // Update OpenGraph tags
  const ogTags: Record<string, string> = {
    'og:title': seo.title,
    'og:description': seo.description,
    'og:type': seo.ogType || 'website',
    'og:url': canonicalUrl,
    'og:site_name': 'MacroNest.online',
    'og:image': ogImageUrl,
    'og:locale': 'en_IN',
  };

  Object.entries(ogTags).forEach(([prop, content]) => {
    let tag = document.querySelector(`meta[property="${prop}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', prop);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });

  // Update Twitter cards (1200x630 summary_large_image)
  const twitterTags: Record<string, string> = {
    'twitter:card': 'summary_large_image',
    'twitter:title': seo.title,
    'twitter:description': seo.description,
    'twitter:url': canonicalUrl,
    'twitter:image': ogImageUrl,
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

  // Inject or update structured data (JSON-LD)
  if (seo.structuredData) {
    let scriptTag = document.querySelector('script#page-structured-data');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'page-structured-data';
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(seo.structuredData);
  }
}
