---
name: best-practices
description: "Apply modern web development best practices for security, compatibility, and code quality. Use when asked to 'apply best practices', 'security audit', 'modernize code', 'code quality review', 'check for vulnerabilities', 'security review', or when adding authentication, handling user input, working with secrets, or creating API endpoints."
---

# Web Security & Best Practices

## Security Checklist

### 1. Secrets Management
- [ ] API keys and secrets in environment variables (`.env.local`), never in source
- [ ] `.env*` files in `.gitignore`
- [ ] No secrets in git history (`git log -p --all -S 'SECRET'`)
- [ ] Production secrets in hosting platform (Vercel/Railway/GAS Script Properties)

### 2. Input Validation
- [ ] All user inputs validated with schemas (Zod recommended)
- [ ] File uploads restricted (size, type, extension)
- [ ] Whitelist validation, not blacklist
- [ ] Error messages don't leak sensitive info

### 3. SQL/Query Injection
- [ ] **NEVER** concatenate user input into queries
- [ ] Always use parameterized queries or ORM (Prisma, Drizzle)

### 4. XSS Prevention
- [ ] `textContent` instead of `innerHTML` for user data
- [ ] If HTML needed, sanitize with DOMPurify
- [ ] CSP headers configured (script-src, style-src, img-src)
- [ ] React: avoid `dangerouslySetInnerHTML`

### 5. Authentication & Authorization
- [ ] Verify auth on every protected API route (both client AND server)
- [ ] Check ownership: `resource.userId === currentUser.id`
- [ ] Role-based access where needed
- [ ] Session tokens httpOnly, secure, sameSite

### 6. CSRF & Rate Limiting
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on all API endpoints (stricter on auth/expensive ops)

### 7. HTTPS & Headers
- [ ] HTTPS enforced in production
- [ ] Security headers: CSP, X-Frame-Options, X-Content-Type-Options
- [ ] HSTS enabled

### 8. Dependencies
- [ ] `npm audit` clean
- [ ] Lock files committed
- [ ] `npm ci` in CI/CD (not `npm install`)

## Browser Compatibility

- [ ] Feature detection (`'IntersectionObserver' in window`), not browser detection
- [ ] `@supports` CSS queries for progressive enhancement
- [ ] Passive event listeners for touch/wheel events
- [ ] All images have explicit width/height and proper aspect ratios

## Code Quality

- [ ] Proper error handling with Error boundaries (React) and global handlers
- [ ] `window.addEventListener('error'/'unhandledrejection')` for tracking
- [ ] Memory cleanup: remove event listeners, abort controllers
- [ ] Event delegation for dynamic elements
- [ ] Source maps: hidden in production (`hidden-source-map`)
- [ ] No `console.log` in production
- [ ] Semantic HTML elements, no duplicate IDs
- [ ] Permissions requested in context (not on page load)

## Detailed Code Patterns

For implementation examples, see:
- [resources/security_patterns.md](resources/security_patterns.md) — CSP, XSS, CSRF, auth code examples
- [resources/compatibility_patterns.md](resources/compatibility_patterns.md) — Feature detection, polyfills
- [resources/error_handling.md](resources/error_handling.md) — Error boundaries, logging patterns

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
