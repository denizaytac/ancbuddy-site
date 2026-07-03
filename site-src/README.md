# ANCBuddy Site Source

This is the Vite + React source for `ancbuddy.com`.

## Commands

- `npm run dev` starts the Vite dev server for the React homepage.
- `npm run lint` runs ESLint.
- `npm run build` builds the homepage, prerenders `index.html`, builds `changelog.html`, generates SEO pages, writes `sitemap.xml` and `llms.txt`, and validates the generated SEO output.
- `npm run preview` serves the built `dist/` output locally.

## SEO content

Stable product facts live in `content/product-facts.json`.

Generated SEO pages live in `content/pages/*.md` with JSON front matter. Required front matter fields:

- `slug`
- `title`
- `description`
- `kind`
- `lastmod`
- `priority`
- `h1`
- `faqs`
- `breadcrumbs`
- `relatedLinks`

`scripts/build-seo-pages.mjs` generates the public `.html` pages, `404.html`, `sitemap.xml`, and `llms.txt` from that registry. `scripts/validate-seo-build.mjs` fails the build if generated pages are missing core SEO metadata, JSON-LD, or sitemap coverage.

Do not manually edit generated files under `dist/`.
