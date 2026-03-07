---
name: seo
description: Optimize for search engine visibility and ranking. Use when asked to "improve SEO", "optimize for search", "fix meta tags", "add structured data", "sitemap optimization", or "search engine optimization".
---

# SEO Optimization

## Workflow

1. **Audit**: Run Lighthouse SEO audit, check Google Search Console
2. **Fix technical issues**: Meta tags, canonicals, sitemap, robots.txt
3. **Implement structured data**: JSON-LD for relevant content types
4. **Optimize content**: Headings, descriptions, internal linking
5. **Verify**: Rich Results Test, mobile-friendly check

## Technical SEO Checklist

### Meta & Head
- [ ] Unique, descriptive `<title>` per page (50-60 chars, keyword near start)
- [ ] Compelling `<meta name="description">` (150-160 chars, includes keyword)
- [ ] `<link rel="canonical">` on every page
- [ ] `<meta name="robots">` appropriate per page (index/noindex)
- [ ] Open Graph + Twitter Card meta tags
- [ ] `<html lang="...">` set correctly

### URL Structure
- [ ] Short, descriptive URLs with hyphens (no underscores/params)
- [ ] Lowercase only, < 75 characters
- [ ] HTTPS enforced
- [ ] Clean hierarchy (`/category/product-name`)

### Heading Structure
- [ ] Single `<h1>` per page with primary keyword
- [ ] Proper hierarchy: h1 → h2 → h3 (no skipping)
- [ ] Headings describe content (not just styling)

### Content & Links
- [ ] Descriptive anchor text (not "click here")
- [ ] Internal links to relevant pages
- [ ] Breadcrumb navigation
- [ ] Broken links fixed
- [ ] Images have descriptive alt text

### Technical
- [ ] XML sitemap at `/sitemap.xml`, submitted to Search Console
- [ ] `robots.txt` properly configured
- [ ] Mobile-responsive (viewport meta, readable text, adequate tap targets)
- [ ] Fast page speed (LCP < 2.5s) — see [performance skill](../performance/SKILL.md)
- [ ] HTTPS with valid certificate

### International (if applicable)
- [ ] `hreflang` tags for multi-language pages
- [ ] Language-specific sitemaps

## Structured Data (JSON-LD)

Common types to implement when relevant:
- **Organization** — company info, logo, social profiles
- **Article/BlogPosting** — author, dates, publisher
- **Product** — price, availability, reviews
- **FAQ** — question/answer pairs (rich snippet eligible)
- **BreadcrumbList** — navigation hierarchy
- **LocalBusiness** — address, hours, contact (for restaurants/shops)

For JSON-LD code templates, see:
- [resources/structured_data.md](resources/structured_data.md)

## Measurement Tools

| Tool | Purpose |
|------|---------|
| Google Search Console | Indexing, performance, errors |
| Lighthouse | SEO audit score |
| Rich Results Test | Validate structured data |
| Screaming Frog | Crawl analysis |

## References

- [Google Search Central](https://developers.google.com/search)
- [Schema.org](https://schema.org/)
