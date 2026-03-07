---
name: accessibility
description: Audit and improve web accessibility following WCAG 2.1 guidelines. Use when asked to "improve accessibility", "a11y audit", "WCAG compliance", "screen reader support", "keyboard navigation", or "make accessible".
---

# Web Accessibility (WCAG 2.1)

## Workflow

1. **Audit**: Run Lighthouse accessibility audit + axe-core scan
2. **Fix**: Address issues by WCAG success criterion priority (A → AA → AAA)
3. **Test manually**: Keyboard-only navigation, screen reader, 200% zoom, high contrast
4. **Verify**: Re-run automated tools, confirm fixes

## Quick Audit Commands

```bash
npx lighthouse https://example.com --only-categories=accessibility
npx axe https://example.com
```

## Checklist by Category

### Perceivable (1.x)
- [ ] All images have descriptive `alt` text (decorative: `alt="" role="presentation"`)
- [ ] Color contrast ≥ 4.5:1 for text, ≥ 3:1 for large text and UI components
- [ ] Don't rely on color alone (add icons, text, patterns for status)
- [ ] Video has captions, audio has transcripts
- [ ] Page language set (`<html lang="en">`, `<span lang="fr">` for changes)

### Operable (2.x)
- [ ] All interactive elements keyboard-accessible (Tab, Enter, Space, Escape)
- [ ] No keyboard traps (focus can always move away)
- [ ] Visible focus indicators (`:focus-visible` with sufficient contrast)
- [ ] Skip link to main content (`<a href="#main-content" class="skip-link">`)
- [ ] Page title descriptive, headings in logical order (h1→h2→h3)
- [ ] Touch targets ≥ 44×44px

### Understandable (3.x)
- [ ] Consistent navigation across pages
- [ ] All form inputs have associated `<label>` elements
- [ ] Error messages are clear and adjacent to the field
- [ ] Required fields marked with `aria-required="true"`
- [ ] Forms validate on submit, focus first error field

### Robust (4.x)
- [ ] Prefer native HTML elements over ARIA (`<button>` > `<div role="button">`)
- [ ] When ARIA needed: correct roles, states, and properties
- [ ] Custom components follow WAI-ARIA Authoring Practices patterns
- [ ] Live regions (`aria-live`) for dynamic content updates

### Manual Testing
- [ ] Tab through entire page — logical order, no traps
- [ ] Screen reader (VoiceOver Mac / NVDA Windows) — all content accessible
- [ ] 200% zoom — content usable without horizontal scroll
- [ ] High contrast mode — all content visible

## Detailed Code Patterns

For implementation examples (modals, tabs, ARIA, skip links, etc.), see:
- [resources/wcag_patterns.md](resources/wcag_patterns.md)

## References

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
