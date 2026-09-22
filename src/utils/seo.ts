export function updatePageSEO(seo: {
  title: string;
  description: string;
  keywords?: string[];
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

  // Canonical link tag
  const canonicalUrl =
    seo.canonicalUrl ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://macronest.online/');

  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', canonicalUrl);

  // Update OpenGraph tags
  const ogTags: Record<string, string> = {
    'og:title': seo.title,
    'og:description': seo.description,
    'og:type': seo.ogType || 'website',
    'og:url': canonicalUrl,
    'og:site_name': 'MacroNest.online',
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
    'twitter:url': canonicalUrl,
  };

  if (seo.ogImage) {
    twitterTags['twitter:image'] = seo.ogImage;
  }

  Object.entries(twitterTags).forEach(([name, content]) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  });

  // Structured Data (JSON-LD)
  let scriptSchema = document.getElementById('dynamic-page-structured-data');
  if (seo.structuredData) {
    if (!scriptSchema) {
      scriptSchema = document.createElement('script');
      scriptSchema.id = 'dynamic-page-structured-data';
      scriptSchema.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptSchema);
    }
    scriptSchema.textContent = JSON.stringify(seo.structuredData, null, 2);
  } else if (scriptSchema) {
    scriptSchema.remove();
  }
}
