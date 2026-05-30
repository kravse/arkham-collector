# Arkham House bibliography gallery

A personal gallery of books published by [Arkham House](https://en.wikipedia.org/wiki/Arkham_House) and the Mycroft & Moran imprint, scraped from Wikipedia bibliographies. Browse covers, search and sort the catalog, track your collection, and curate metadata in a local dev server.

**Live site:** [arkhamcollector.com](https://arkhamcollector.com) — public build; collection defaults to your own list in the browser, with an optional sample CSV via the gear settings.

**Your collection (CSV):** The repo includes a sample [`my_collection/my_collection.csv`](my_collection/my_collection.csv) (title, author, year). Replace it with your own list, then run `npm run sync-collection` to regenerate `my_collection/collection.js` before `npm run serve` or `npm run build`. An optional fourth column in an existing CSV is ignored.

**Collection modes (gear in the bottom bar):** Choose **Use sample collection** or **Use my own collection**. Both work the same way (Collect in the book overlay); each is stored separately in `localStorage` (`arkham-sample-collection` and `arkham-collection`). The sample list starts from the bundled CSV on first visit; **Reset sample collection** in settings restores that default. The active mode is saved in `arkham-collection-source`.

**Deploy:** `npm run build` writes to `build/` with `robots.txt` and `noindex`. Collection defaults to **own** in the browser; the sample CSV is bundled for the gear toggle.

### Homepage

Search, sort, and browse the full bibliography as a cover grid with collection, Mycroft & Moran, and want-list filters.

<img src="images/example-homepage.png" alt="Homepage — search, sort, and cover grid" width="680" />

### Book detail overlay

Tap a card to see the cover, title with year, author and cover artist, a scrollable Wikipedia description, and quick links to Wikipedia, Goodreads, and your want list.

<img src="images/example-overlay.png" alt="Book detail overlay with cover, metadata, and description" width="680" />

### Want list & collection

Filter to titles you own or are hunting for, with COLLECTION and WANTED badges on each card.

<img src="images/example-want-collection.png" alt="Want list and collection filters on cards" width="680" />

## Quick start

```bash
npm install
npm run crawl          # first-time: scrape Wikipedia → data/books.json (live network)
npm run serve          # http://localhost:8742 — edit books, upload covers, hide titles
npm run build          # static site in build/
```

Open `build/index.html` or deploy `build/`. The built site is read-only (no edit UI).

## How it works

### Two layers of book data

| Layer | Files | Written by | Purpose |
|-------|--------|------------|---------|
| **Scraped** | `data/books.json`, `data/books.js`, `data/descriptions.js` | Crawler & sync scripts | Full JSON in `books.json`; viewer scripts split descriptions into `descriptions.js` for faster load |
| **Edits** | `data/edits.json`, `data/edits.js` | `npm run serve` only | Overrides keyed by book `id`: only fields that differ from scraped `books.json` (plus `hidden` / `deleted` flags) |

At load time, [`js/book-edits.js`](js/book-edits.js) merges scraped books with edits (`{ ...book, ...edit }`). **Edits win** for any field present in `edits.json`. Saving in the edit dialog compares each value to the scraped row and stores only differences, so a later crawl or sync can update fields you did not change.

`npm run compact-edits` — one-time cleanup: drop edit fields that now match scraped data (e.g. after importing Goodreads URLs into `books.json`).

Stable book `id` values come from imprint + Wikipedia URL + list year (see `scripts/lib/book-ids.js`). Full bibliography crawls replace scraped rows by that key but keep the same `id` when the line matches.

### Viewer (`viewer.html` + `js/viewer/`)

- Vanilla HTML/CSS/JS — no bundler. UI markup in `viewer.html`; app code in `js/viewer/` (bundled to `js/viewer-bundle.js` via `npm run bundle-viewer`, also run automatically by `npm run build`).
- Catalog loads from slim `data/books.js` plus `data/descriptions.js` (text loaded for the detail overlay). Production `build/` ships one `css/viewer.css` and does not include `data/books.json`.
- Styles in [`css/`](css/) (load order matters; see project conventions).
- Grid of cards; click a card for the detail overlay (Wikipedia **W**, Goodreads **G**, want-list, collection badges).
- **Goodreads:** uses `goodreadsUrl` from data/edits when set; otherwise **G** opens a [Goodreads book search](https://www.goodreads.com/search) (title + author last name).
- Want list in `localStorage` (`arkham-want-list`). Collection: sample (`arkham-sample-collection`) or your own (`arkham-collection`), toggled in gear settings.
- **localhost only:** hover cover → edit / hide; edit dialog and API require `npm run serve`.

### Build (`npm run build`)

[`build.js`](build.js) writes a static site under **`build/`**: `viewer.html` → `index.html`, `window.READ_ONLY = true`, `my_collection/` for the sample toggle (CSV copied as `my_collection.<hash>.csv` with `window.SAMPLE_COLLECTION_CSV` set for cache busting), bundled `css/viewer.css`, JS/covers, merged slim `data/books.js` + `data/descriptions.js`, `images/` (logos + favicons), root-level favicon files for browsers that request `/favicon.ico`, `site.webmanifest`, plus `robots.txt` and a `noindex` meta tag. Deploy `build/` to [arkhamcollector.com](https://arkhamcollector.com) or any static host.

Hidden and deleted books are excluded from copied covers but remain in shipped data unless you filter elsewhere.

Do not hand-edit `build/` or generated `data/*.js` — change source and rebuild.

### Dev server (`npm run serve`)

[`server.js`](server.js) serves the repo root on port **8742** (override with `PORT`).

| Endpoint | Purpose |
|----------|---------|
| `PATCH /api/books/:id` | Save edit fields + optional cover upload → `edits.json` |
| `PATCH /api/books/:id/hidden` | Hide / unhide |
| `DELETE /api/books/:id` | Soft-delete (`deleted: true` in edits) |
| `POST /api/books/:id/cover` | Cover-only upload |

### Crawler CLI (`scripts/index.js`)

All npm scripts below run through `node scripts/index.js` with flags parsed in [`scripts/cli.js`](scripts/cli.js).

**Shared flags** (where supported):

| Flag | Meaning |
|------|---------|
| `--yes` | Skip destructive scrape warning |
| `--local` | Use saved HTML under `examples/` instead of live Wikipedia |
| `--limit N` | Process only the first N items (crawl rows, sync pages, Goodreads attempts, etc.) |
| `--delay-ms N` | Pause between HTTP requests (default 2000) |
| `--dry-run` | Preview without writing (fill-covers, sync-goodreads) |
| `--skip-download` | Crawl metadata without downloading cover images |

---

## npm scripts

### Crawl (Wikipedia bibliography)

| Script | Command | What it does |
|--------|---------|----------------|
| `crawl` | `node scripts/index.js` | Full **Arkham House** bibliography from live Wikipedia; downloads covers to `covers/`; writes `data/books.json`. **Warns** unless `--yes`. |
| `crawl:local` | `... --local` | Same, using `examples/Arkham House - Wikipedia.html` (no cover downloads). |
| `crawl:mycroft` | `... --mycroft-only` | **Mycroft & Moran** imprint only; merges into existing `books.json`. |
| `crawl:mycroft:local` | `... --mycroft-only --local` | Mycroft crawl from saved example HTML. |
| `crawl:test` | `... --limit 5` | Short test crawl (5 rows). |

### Sync (patch `books.json` without full re-crawl)

| Script | Command | What it does |
|--------|---------|----------------|
| `sync-publication-dates` | `... --sync-publication-dates --local` | Refresh publication years from bibliography tables (local HTML by default in npm script). |
| `sync-authors` | `... --sync-authors` | Copy `listAuthor` into `author` when missing. |
| `sync-descriptions` | `... --sync-descriptions` | Pull lead paragraphs from Wikipedia article HTML into `description`. Skips books with a custom description in edits. **Warns** unless `--yes`. |
| `sync-descriptions:local` | `... --sync-descriptions --local` | Descriptions from `examples/` sample pages only. |
| `sync-goodreads` | `... --sync-goodreads` | Match Goodreads edition URLs via [Open Library](https://openlibrary.org) (`goodreadsUrl` on each book). Skips books that already have a URL and manual Goodreads edits. |
| `sync-goodreads:missing` | `... --sync-goodreads-missing` | Same matcher, **only books with no `goodreadsUrl`** — safe to rerun after rate limits; `--limit` counts missing books only. |
| `sync-goodreads:dry-run` | `... --sync-goodreads --dry-run` | Log matches without writing. |
| `sync-goodreads:missing:dry-run` | `... --sync-goodreads-missing --dry-run` | Preview missing-only pass. |
| `import-goodreads-shelf` | `... --import-goodreads-shelf` | Import URLs from the four saved `examples/Arkham House Books _ Goodreads*.html` shelf exports (overwrites scraped `goodreadsUrl`; skips manual edits). |
| | `... --force-goodreads` | With `sync-goodreads` only: replace existing scraped URLs (still skips `edits.json` overrides). |

### Covers

| Script | Command | What it does |
|--------|---------|----------------|
| `fill-covers` | `... --fill-covers` | Find/download missing covers (Wikipedia + Open Library). **Warns** unless `--yes`. |
| `fill-covers:dry-run` | `... --fill-covers --dry-run` | Report what would be filled. |
| `reconcile-covers` | `... --reconcile-covers` | Align `coverImageFile` in `books.json` with files already on disk under `covers/`. |

### Collection & maintenance

| Script | Command | What it does |
|--------|---------|----------------|
| `sync-collection` | `... --sync-collection` | Regenerate `my_collection/collection.js` from `my_collection/my_collection.csv`. |
| `dedupe-book-ids` | `... --dedupe-book-ids` | Split duplicate stable ids; move shared `hidden` edits to reprint ids. |
| `compact-edits` | `... --compact-edits` | Remove edit fields that match scraped `books.json` (safe to re-run). |

### Site

| Script | Command | What it does |
|--------|---------|----------------|
| `serve` | `node server.js` | Local editor + API on port 8742. |
| `bundle-viewer` | `node scripts/bundle-viewer-js.js` | Rebuild `js/viewer-bundle.js` from `js/viewer/` after editing viewer JS. |
| `build` | `node build.js` | Static output in `build/` (read-only; sample CSV + gear collection toggle). |

---

## Typical workflows

**Initial setup**

1. `npm run crawl` (or `crawl:local` for offline bibliography only)
2. `npm run sync-descriptions` / `sync-goodreads` as needed
3. `npm run serve` — fix titles, covers, links
4. `npm run build` — open or deploy `build/`

**Ongoing curation**

- Prefer `npm run serve` for one-off fixes (writes `edits.json` only).
- Use targeted syncs instead of full `crawl` when possible.
- `npm run sync-goodreads:dry-run` before a bulk Goodreads pass.
- After rate limits: `npm run sync-goodreads:missing` (or `... --limit 20 --delay-ms 3000`) picks up where you left off.
- Preferred bulk source: `npm run import-goodreads-shelf` (uses your Goodreads shelf HTML in `examples/`).
- Full `crawl` overwrites scraped fields; synced `goodreadsUrl` / `description` are preserved on matching rows when the new scrape omits them.

**Hide vs delete**

- **Hide** — `hidden: true` in edits; visible on localhost with “Show hidden”.
- **Delete** — `deleted: true` in edits; removed from UI; scraped row remains in `books.json`.

---

## Project layout

| Path | Role |
|------|------|
| `viewer.html` | Source UI (not the deploy artifact) |
| `css/` | All viewer styles |
| `js/` | `book-edits.js`, `sanitize-text.js`, `viewer-bundle.js` |
| `js/viewer/` | Viewer app source modules (see `npm run bundle-viewer`) |
| `data/descriptions.js` | Scraped descriptions keyed by book id (`window.BOOK_DESCRIPTIONS`) |
| `scripts/` | Crawler and sync CLI (`index.js`, `cli.js`, `config.js`, `lib/`, `tasks/`) |
| `data/books.json` | Scraped catalog |
| `data/edits.json` | Manual overrides |
| `covers/` | Downloaded cover images |
| `my_collection/` | Owned-books CSV + `collection.js` |
| `examples/` | Saved Wikipedia HTML for `--local` |
| `build/` | Generated static site (`npm run build`) — do not edit |
| `server.js` | Dev server |
| `my_script.js` | Legacy wrapper → `scripts/index.js` |

Entry point for crawl/sync: `node scripts/index.js`. See [`.cursor/rules/arkham-project.mdc`](.cursor/rules/arkham-project.mdc) for contributor conventions.

## Dependencies

- **cheerio** — HTML parsing for Wikipedia crawls
- **express** + **multer** — dev server and cover uploads

No TypeScript, bundler, or framework.
