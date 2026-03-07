---
name: performance
description: "Optimize web performance including Core Web Vitals (LCP, INP, CLS), bundle size, caching, and runtime. Use when asked to 'speed up', 'optimize performance', 'fix LCP/INP/CLS', 'reduce load time', 'Core Web Vitals', or 'performance audit'."
---

# Web Performance Optimization

## Workflow

1. **Measure**: Run Lighthouse audit, check CrUX data, identify bottlenecks
2. **Analyze**: Find root cause (large bundles, unoptimized images, render-blocking, layout shifts, long tasks)
3. **Prioritize**: Fix highest-impact issues first (usually LCP → CLS → INP)
4. **Implement**: Apply optimizations from the patterns below
5. **Verify**: Re-run Lighthouse, compare before/after metrics

## Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | ≤ 2.5s | 2.5–4.0s | > 4.0s |
| **INP** (Interaction to Next Paint) | ≤ 200ms | 200–500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 |
| FCP | ≤ 1.8s | — | — |
| TTFB | ≤ 800ms | — | — |
| TBT | ≤ 200ms | — | — |

## LCP Checklist

- [ ] Hero/LCP image uses `fetchpriority="high"` and `loading="eager"`
- [ ] Images in modern formats (WebP/AVIF) with `<picture>` element
- [ ] All images have explicit `width` and `height`
- [ ] No render-blocking JS in `<head>` (use `defer`/`async`)
- [ ] Critical CSS inlined, non-critical deferred
- [ ] Fonts use `font-display: swap` or `optional`
- [ ] `<link rel="preconnect">` for required origins
- [ ] LCP element in initial HTML (not JS-rendered)

## INP Checklist

- [ ] No tasks > 50ms on main thread
- [ ] Heavy computation uses `requestIdleCallback` or chunking with `scheduler.yield()`
- [ ] Event handlers split: visual update first, analytics deferred
- [ ] React: `useMemo`/`useCallback`/`React.memo` for expensive components
- [ ] React: `useTransition` for non-urgent state updates
- [ ] Long lists virtualized (`react-window` / `@tanstack/virtual`)

## CLS Checklist

- [ ] All images/videos have `width`/`height` or `aspect-ratio`
- [ ] Ads/embeds have reserved space (`min-height`)
- [ ] Dynamic content injects below viewport or uses `contain-intrinsic-size`
- [ ] Font fallback metrics matched (no FOUT shift)
- [ ] No top-injected banners/notifications that push content down
- [ ] CSS `transform` for animations (not `top`/`left`/`width`/`height`)

## Bundle Optimization

- [ ] Route-based code splitting (`lazy()` / dynamic `import()`)
- [ ] Tree shaking enabled (`sideEffects: false` in package.json)
- [ ] Import specific functions, not entire libraries (`import { debounce } from 'lodash-es'`)
- [ ] Replace heavy deps (moment.js → date-fns, lodash → lodash-es)
- [ ] Third-party scripts use `defer` or `async`
- [ ] Analyze with `npx webpack-bundle-analyzer`

## Caching Strategy

| Resource | Cache-Control |
|----------|---------------|
| HTML | `no-cache, must-revalidate` |
| Hashed assets (JS/CSS) | `public, max-age=31536000, immutable` |
| Unhashed static | `public, max-age=86400, stale-while-revalidate=604800` |
| API responses | `private, max-age=0, must-revalidate` |

## Image Optimization

- Convert to WebP/AVIF (`sharp` library or build plugin)
- Responsive images with `srcset` + `sizes`
- Lazy load below-fold images (`loading="lazy"`)
- Eager load LCP image (`loading="eager"` + `fetchpriority="high"`)

## Measurement Tools

| Tool | Purpose |
|------|---------|
| Lighthouse | Lab metrics (LCP, CLS, INP, TBT) |
| Chrome DevTools → Performance | Profiling, flame charts |
| PageSpeed Insights | Real user metrics (CrUX) |
| WebPageTest | Detailed waterfall, filmstrip |
| `web-vitals` npm | In-app measurement |
| `webpack-bundle-analyzer` | Bundle composition |

## Detailed Code Patterns

For implementation examples, see:
- [resources/lcp_patterns.md](resources/lcp_patterns.md) — LCP optimization code
- [resources/inp_patterns.md](resources/inp_patterns.md) — INP optimization code
- [resources/cls_patterns.md](resources/cls_patterns.md) — CLS optimization code
- [resources/bundle_and_caching.md](resources/bundle_and_caching.md) — Bundle splitting & caching code
- [resources/image_optimization.md](resources/image_optimization.md) — Image pipeline code

## Common Pitfalls

- **Don't block rendering**: Avoid sync scripts in `<head>`
- **Don't load everything upfront**: Lazy load non-critical resources
- **Don't forget dimensions**: Always specify image width/height
- **Don't use sync scripts**: Use `async`/`defer`
- **Don't ignore third-party scripts**: They often dominate TBT
- **Don't skip compression**: Enable Brotli/Gzip for all text assets
