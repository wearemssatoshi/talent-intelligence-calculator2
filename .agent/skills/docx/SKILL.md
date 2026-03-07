---
name: docx
description: "Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files). Triggers include: any mention of 'Word doc', '.docx', or requests for professional documents with tables of contents, headings, page numbers, etc."
---

# Word Document (.docx) Operations

## Two Approaches

### 1. docx-js (JavaScript) — For creating new documents
Use `docx` npm package to programmatically create .docx files.

### 2. Unpack/Edit/Pack (XML) — For editing existing documents
Use helper scripts to directly edit the underlying XML.

## docx-js Quick Reference

### Critical Rules
- **Set page size explicitly**: defaults to A4; use `width: 12240, height: 15840` (US Letter in DXA)
- **Landscape**: pass portrait dims + `orientation: PageOrientation.LANDSCAPE`
- **Never use `\n`**: use separate `Paragraph` elements
- **Bullets**: use `numbering.config` with `LevelFormat.BULLET`, never manual bullet chars
- **Tables**: always use `WidthType.DXA` (percentages break in Google Docs)
- **Table shading**: use `ShadingType.CLEAR`, never `SOLID` (causes black backgrounds)
- **Images**: `type` parameter is REQUIRED (`"png"`, `"jpg"`, etc.)
- **Column widths**: must sum to table width; `1440 DXA = 1 inch`

### Conversion Commands
```bash
# .doc to .docx
python scripts/office/soffice.py --headless --convert-to docx document.doc

# Extract text with tracked changes
pandoc --track-changes=all document.docx -o output.md

# Convert to images (for viewing)
python scripts/office/soffice.py --headless --convert-to png document.docx

# Validate
python scripts/office/validate.py doc.docx
```

## XML Edit Workflow

```bash
# Step 1: Unpack
python scripts/office/unpack.py document.docx unpacked/

# Step 2: Edit files in unpacked/word/
# Use "Claude" as author for tracked changes/comments

# Step 3: Pack
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```

Auto-repair fixes: `durableId` overflow, missing `xml:space="preserve"`.

## Detailed Patterns

For XML editing patterns (tracked changes, comments, images, styles), see:
- [resources/xml_reference.md](resources/xml_reference.md)
- [resources/styles_and_tables.md](resources/styles_and_tables.md)
