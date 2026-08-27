# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
npm run dev          # Start dev server (auto-runs generate-posts via predev hook)
npm run build        # Build for production (auto-runs generate-posts via prebuild hook)
npm run preview      # Preview production build
npm run generate-posts  # Regenerate posts-data.json manually
npm run validate     # Check all articles' frontmatter format
```

### Content Management
```bash
# Create new article (Chinese)
npm run new-post -- javascript my-article-slug

# Create new article (English)
npm run new-post -- react hooks-basics --en
```

If the category doesn't exist, the script auto-creates the directory and `index.md`.

## Architecture Overview

### Auto-Scan System

The blog uses a **directory-based auto-scanning** system. Adding new categories or articles requires **zero code changes**:

1. **Scan script**: `scripts/generate-posts-data.mjs` scans `docs/posts/` (Chinese) and `docs/en/posts/` (English)
2. **Data flow**: Markdown → `posts-data.json` → `posts.ts` exports → Vue components
3. **Build hooks**: `predev` and `prebuild` automatically run `generate-posts`

**Key insight**: The `posts-data.json` file is in `.gitignore` and regenerated on every build. Never edit it manually.

### Bilingual Support

- Root path (`/`) = Chinese (lang: `zh-CN`)
- `/en/` = English (lang: `en-US`)
- Components use `useData().lang` to detect current locale
- Export both `zhPosts`/`enPosts` and `categoryLabels`/`enCategoryLabels` from `posts.ts`

### Content Organization

```
docs/
├── posts/                    # Chinese articles
│   ├── <category>/
│   │   ├── index.md          # Category landing page (title field = display name)
│   │   └── article-slug.md   # Individual article
├── en/posts/                 # English articles (same structure)
```

**Critical rules**:
- `index.md` in a category directory is **NOT** scanned as an article (it's the category page)
- `draft: true` in frontmatter skips the article from scanning
- `category` field in frontmatter **must match** the directory name exactly
- Files must be UTF-8 encoded (no BOM)

### Article Frontmatter

**Required fields**: `title`, `date`, `description`, `category`

**Optional but common**: `tags` (array), `lang`, `i18n-link`, `draft`, `sticky`, `cover`

**Sticky posts**: Set `sticky: true` to pin an article to the top within its category/year.

### Global Vue Components

Registered in `docs/.vitepress/theme/index.ts` via `enhanceApp`. Use directly in markdown without import:

| Component | Purpose | Typical Usage |
|-----------|---------|---------------|
| `<ArchiveList />` | Timeline view grouped by year | `/archives` page |
| `<TagCloud />` | Tag cloud with click-to-filter | `/tags` page |
| `<PostList />` | List posts in current category | Category `index.md` pages |
| `<CategoryGrid />` | Card grid of all categories | Homepage |
| `<CategoryPage />` | List of all categories with filters | Category listing page |
| `<Comments />` | Giscus comment integration | Article pages (bottom) |

### Data Flow for Components

All list components consume data from `docs/.vitepress/data/posts.ts`:
- `zhPosts` / `enPosts`: `Record<categoryId, Post[]>`
- `categoryLabels` / `enCategoryLabels`: `Record<categoryId, displayName>`

The generator extracts labels from each category's `index.md` frontmatter `title` field.

### Navigation Auto-Generation

`docs/.vitepress/config.ts` reads `posts-data.json` at build time to dynamically build the "Categories" dropdown in the nav. Adding a new category automatically adds it to the nav menu.

## Templates

- `templates/new-post.md` - Article template with full frontmatter and content structure
- `templates/category-index.md` - Category landing page template

## Deployment

- **CI/CD**: GitHub Actions workflow in `.github/workflows/deploy.yml`
- **Trigger**: Push to `main` branch
- **Process**: Validate frontmatter → Build VitePress → Deploy to GitHub Pages
- **Prerequisite**: GitHub repo Settings → Pages → Source must be set to "GitHub Actions"

## File Conventions

### Code Tagging (AGC Convention)

Every code block must be tagged per the project's AGC convention:

```markdown
<!-- [AGC:FILE] tool=Cc author=fangkun date=YYYY-MM-DD -->
<!-- [AGC:START] tool=Cc author=fangkun -->
... code ...
<!-- [AGC:END] -->
```

For `.ts`/`.js` files, use `//` comments instead of `<!-- -->`.

### File Naming

- Article slugs: kebab-case (e.g., `promise-async-await.md`)
- Category directories: kebab-case (e.g., `system-design/`)
- No spaces or Chinese characters in filenames

## Debugging Common Issues

**Empty archives/tags page**: Ensure `posts-data.json` was generated. Run `npm run generate-posts` manually if needed.

**Category not appearing in nav**: The category must have at least one non-draft article. Empty categories (only `index.md`) are excluded from the JSON.

**Build fails with "module not found"**: Check that `posts-data.json` exists. It's generated by the `prebuild` hook, but if you're importing it directly in TypeScript, ensure the generator ran first.

**Wrong labels in Chinese/English nav**: Labels are derived from `index.md` `title` fields. The generator uses `enLabels` overriding `zhLabels` for `enCategoryLabels`, and vice versa for `categoryLabels`. Check the merge order in `generate-posts-data.mjs`.
