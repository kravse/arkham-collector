# Arkham House bibliography gallery

**[arkhamcollector.org](https://arkhamcollector.org)** — browse ~200 Arkham House and Mycroft & Moran editions with covers, search, and collector tools. No account; your list stays in the browser.

> Built with AI assistance, guided through hundreds of prompts—not generated in one shot.

## What the site is for

A visual catalog for collectors and readers of [Arkham House](https://en.wikipedia.org/wiki/Arkham_House) weird fiction: every bibliography line from Wikipedia, cover art where available, publication metadata, and links out to Wikipedia and Goodreads. Use it to **browse the imprint**, **mark what you own**, **track a want list**, and **filter** down to gaps in your shelves.

| | |
|---|---|
| **Search & sort** | Search the grid (title, author, cover artist, date); add tag filters with `tag:horror` or `tag:"cthulhu mythos"` (autocomplete after `tag:`; known tags show as removable chips); combine multiple tags and text, e.g. `tag:fantasy tag:horror 1950s`; **list/grid toggle** beside search (saved in browser); **Sort** (oldest/newest/title) everywhere. Same-year tiebreaks from `book-order.js`; maintainers set those with **Reorder** on `npm run serve` only |
| **Filters** | Collection, want list, Mycroft & Moran imprint, decade |
| **Book detail** | Cover, description, cover artist, tags, **W** / **G** links, **Collect** (Ordered → Collection), and want toggles. In the detail overlay, tap the cover (mobile) or hover and click the magnifier (desktop) for a full-screen view |
| **Your data** | Stored in the browser (`arkham-user-state` v2; older keys migrate automatically). Default is **This device only**; optional **Sync with GitHub Gist** saves full state to a private GitHub Gist using a throwaway bot account PAT (`arkham-gist-sync`) |
| **Export** | Download your collection as CSV (ordered and collected titles; same rows, no order status column). **Import collection CSV** replaces collected titles for the active storage mode only and clears on-order titles for that mode; your want list is unchanged |

### Screenshots

**Homepage** — search, sort, and filters on the cover grid.

<img src="images/example-homepage.png" alt="Homepage — search, sort, and cover grid" width="680" />

**Book detail** — overlay with description and collector actions.

<img src="images/example-overlay.png" alt="Book detail overlay with cover, metadata, and description" width="680" />

**Collection & want list** — badges and header filters.

<img src="images/example-want-collection.png" alt="Want list and collection filters on cards" width="680" />

## Using the site

1. Open a card → **Collect** to mark a copy you own (tap again to remove).
2. Toggle **want** on titles you are hunting.
3. Filter with **COLLECTION** or **WANT** in the header. If you have on-order titles, **COLLECTION** cycles: all books → your collection → on-order only → all books. If you have wants, **WANT** toggles: all books ↔ your want list (priority order; drag rank tabs in list view or rank chips on cards in grid view). Active filters update the URL (`/collection`, `/ordered`, `/want`, `/mycroft-moran`, `/mycroft-hidden`, `/hidden`) so a refresh or shared link restores the same view.
4. **Gear** (bottom bar): under **Collection storage**, choose **This device only** (default) or **Sync with GitHub Gist**. Under **Card display**, toggle want highlighting, set want rank drag handle side, and collection highlighting. GitHub Gist sync only activates after a successful **Connect**; until then you stay on this device. Connecting loads existing Gist data if present, or creates an empty Gist. While connected, the viewer pulls from GitHub on each page load and when you return to the tab. **Clear** or closing settings without a working token returns you to this device only. To move local data to GitHub Gist, export CSV locally then import after connecting.
5. **Import collection CSV** / **Export collection CSV** (gear → Settings): import replaces collected titles for the **active storage option only** (this device and GitHub Gist keep separate collections), clears on-order titles for that option, and leaves your want list alone. Works on this device or with GitHub Gist sync (Gist upload happens immediately when connected).

### Browser storage keys

| Key | Contents |
|-----|----------|
| `arkham-user-state` | Unified v2 state: collection ids, want list (`wantIds`), want priority order (`wantOrderIds`), ordered titles, display preferences (including `wantRankDragSide`, `wantOrderLocked`), and `storageMode` (`local` or `gist`). Older per-key entries migrate on first load. |
| `arkham-gist-sync` | GitHub Gist credentials only (`token`, `gistId`) when GitHub Gist sync is connected—not included in the synced Gist file. |

**Gist sync security:** The PAT is stored in your browser’s `localStorage`. Use a throwaway GitHub account and a fine-grained PAT limited to gist read/write. This device only never sends data to GitHub.

## Run it locally

The repo ships scraped catalog data (`data/books.json`, `books.js`, `descriptions.js`, `covers/`). You do **not** need to crawl Wikipedia to try the viewer.

```bash
git clone <your-fork-url>
cd arkham
npm install
npm run serve    # http://localhost:8742 — full UI + edit/hide/upload API
# or
npm run build && open build/index.html   # read-only static site (matches deploy)
```

**`npm run serve`** — edit metadata, upload covers, add or remove tags, hide or soft-delete titles, and pick list-view cover crops; metadata changes go to `data/edits.json`; tags go to `data/tags.json`.

**`npm run build`** — writes `build/` for static hosting (`READ_ONLY`, bundled CSS/JS, `noindex`). Cover images in `covers/` are resized to WebP at build time (480px card thumbnails, 960px detail images, and 1200×80 list strips); masters stay in the repo but only optimized files ship in `build/`. List strip crops use per-book focal points from edits when set (default center / 70% down).

**Cover images:** Drop high-resolution scans into `covers/` using the existing `{slug}-{id}.{ext}` naming (or set `coverImageFile` via edits). `npm run serve` uses the originals for local dev; list view approximates the saved list strip crop via CSS (`listCoverFocusX` / `listCoverFocusY`). In the edit dialog, open the **List crop** tab and click the cover to set the list strip focal point (saved automatically to `edits.json`); `npm run build` generates `*.card.webp`, `*.detail.webp`, and `*.list.webp` derivatives for the deploy site. Uploading a new cover resets the list crop to default. After uploading large covers, run `npm run shrink-cover-masters` to resize masters in place before committing (default max edge 1600px; use `shrink-cover-masters:dry-run` to preview).

## Customize the catalog (maintainers)

| Layer | Files | Who writes it |
|-------|--------|----------------|
| Scraped | `data/books.json`, `books.js`, `descriptions.js` | Crawler & sync scripts |
| Overrides | `data/edits.json` | Dev server (`npm run serve`) only |
| Tags | `data/tags.json`, `tags.js` | Dev server edit dialog (`npm run serve`) only |
| Display order | `data/book-order.json`, `book-order.js` | Dev server **Reorder** dialog (`npm run serve`) only |

At load time, [`js/book-edits.js`](js/book-edits.js) merges scraped rows with edits; only differing fields are stored in `edits.json` so re-crawls can refresh untouched fields. [`js/book-layers.js`](js/book-layers.js) attaches tags from [`data/tags.js`](data/tags.js) (static in production; editable only on localhost). The grid is sorted by publication year; [`data/book-order.js`](data/book-order.js) breaks ties within each year. Magazine seasons (e.g. “Summer, 1967”) sort as that year—use **Reorder** to set issue order. Visitors on the built site cannot change order or tags.

**Tags (maintainers):** With `npm run serve`, open a book’s edit dialog. Add a custom tag or pick from existing tags in the pool; remove tags with × on each chip. Tags save immediately to `data/tags.json` and regenerate `tags.js`. Run `npm run build` to ship tags to the live site. Tags appear in book detail; click a tag to search by that tag only (replaces the current search). Type `tag` or `tag:` in search for autocomplete; plain words still match title, author, and date only—not tags.

**Reorder books (maintainers):** With `npm run serve`, use **Reorder** in the header. The list shows all non-deleted titles (respecting **Show hidden**). Move titles within the same calendar year only. Save writes `data/book-order.json` and regenerates `book-order.js`; run `npm run build` to ship the order to the live site.

**Dev API:** `GET /api/tags` returns all known tags; `PATCH /api/books/:id/tags` with `{ "tags": [ … ] }` saves a book’s tag list (400 on invalid input). `GET /api/book-order` returns the normalized id list; `PUT /api/book-order` with `{ "order": [ … ] }` saves it (400 if order breaks year sequence or omits books).

**Maintainer backup CSV:** [`my_collection/my_collection.csv`](my_collection/my_collection.csv) is a personal backup of collected titles (same shape as export/import). It is not loaded by the viewer; use Settings import/export or Gist sync for live collection data.

**First-time scrape** (optional, overwrites scraped data):

```bash
npm run crawl              # live Wikipedia + covers (confirms unless --yes)
npm run crawl:local        # offline from examples/*.html
npm run crawl:mycroft      # Mycroft & Moran rows only
```

Do not hand-edit `build/` or generated `data/*.js`—change source and rebuild.

## Wikipedia & licensing

The bibliography and many book descriptions come from [Wikipedia](https://en.wikipedia.org/) (scraped via the scripts in `scripts/`). Description text is used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); each book links to its source article (**W** in the detail overlay). Cover images may be from Wikipedia, Wikimedia Commons, Open Library, or local uploads—licenses vary by file.

On [arkhamcollector.org](https://arkhamcollector.org), open **Wikipedia attribution** in the footer for source pages, license text, and reuse notes. If you fork or republish scraped descriptions, follow [Wikipedia’s reuse guidance](https://en.wikipedia.org/wiki/Wikipedia:Reusing_Wikipedia_content) (credit, link, and CC BY-SA 4.0 where applicable). This project is not affiliated with Arkham House, Wikipedia, or the Wikimedia Foundation.

## npm scripts

Entry point: `node scripts/index.js`. Common flags: `--yes`, `--local`, `--limit N`, `--delay-ms N`, `--dry-run`, `--skip-download`.

### Site

| Script | Purpose |
|--------|---------|
| `serve` | Dev server on port 8742 (`PORT` to override) |
| `build` | Static site in `build/` (optimizes cover images to WebP) |
| `bundle-viewer` | Rebuild `js/viewer-bundle.js` from `js/viewer/` (syncs `scripts/lib/viewer-*.js` → `00-*.js` partials first) |
| `test` | Run Node tests (`test/`; sort and filter logic under `scripts/lib/`) |

### Crawl & sync

| Script | Purpose |
|--------|---------|
| `crawl` | Full Arkham House bibliography (live) |
| `crawl:local` | Arkham House from saved HTML |
| `crawl:mycroft` / `crawl:mycroft:local` | Mycroft & Moran imprint |
| `crawl:test` | First 5 rows |
| `sync-descriptions` | Wikipedia lead paragraphs → descriptions |
| `sync-descriptions:local` | Descriptions from `examples/` |
| `sync-goodreads` | Goodreads URLs via Open Library |
| `sync-goodreads:missing` | Only titles missing a URL |
| `sync-goodreads:*:dry-run` | Preview Goodreads matching |
| `import-goodreads-shelf` | URLs from Goodreads shelf HTML in `examples/` |
| `sync-publication-dates` | Years from bibliography tables (local HTML) |
| `sync-authors` | Fill `author` from `listAuthor` |
| `fill-covers` / `fill-covers:dry-run` | Download missing covers |
| `reconcile-covers` | Match `coverImageFile` to files on disk |

### Maintenance

| Script | Purpose |
|--------|---------|
| `compact-edits` | Drop edit fields that match scraped data |
| `shrink-cover-masters` | Resize large cover masters in `covers/` in place (skips `*.card.webp`, `*.detail.webp`, and `*.list.webp`) |
| `shrink-cover-masters:dry-run` | Preview master cover shrink without writing |
| `report-small-covers` | Flag cover masters under 700px longest edge; write `cover-review/index.html`, serve on port 28471, upload covers into edits, Google Image Search + eBay search links |
| `fix-arkham-magazines` | Move issue/season data out of `listAuthor` into `title` and `publicationDate` for Arkham Sampler and Collector magazine issues |
| `fix-arkham-magazines:dry-run` | Preview magazine fixes without writing |
| `dedupe-book-ids` | Split duplicate stable ids |
| `export-arkham-catalog` | Write `arkham_catalog.csv` (Arkham House only; title, author, year — same shape as collection export) |
| `export-arkham-catalog:stdout` | Same export to stdout (`--output -`) |
| `import-tags-from-csv` | Import tags from a tagged catalog CSV into `data/tags.json` (pass `-- --csv path/to/file.csv`) |

**Curation tips:** Prefer `serve` for one-off fixes. Use targeted syncs instead of full `crawl` when possible. **Hide** (`hidden` in edits) shows on localhost with “Show hidden”; **delete** removes from the UI but keeps the scraped row.

## Project layout

| Path | Role |
|------|------|
| `viewer.html` | UI shell (loads `js/viewer-bundle.js`) |
| `js/viewer/` | Viewer source; `npm run bundle-viewer` |
| `js/book-edits.js`, `js/book-layers.js` | Browser merge of edits and tags at load time |
| `css/` | Styles; load order in [`scripts/css-manifest.js`](scripts/css-manifest.js) (bundled to `css/viewer.css` in `build/`) |
| `data/` | Catalog + edits + tags + descriptions |
| `covers/` | Cover images |
| `my_collection/` | Maintainer backup CSV (`my_collection.csv`); not loaded by the site |
| `scripts/` | Crawler CLI (`index.js`, task registry, `lib/`, `tasks/`) |
| `build/` | Generated deploy output |
| `server.js` | Dev API for edits, tags, uploads, and book order |

Vanilla HTML/CSS/JS—no TypeScript or app framework. Dependencies: **cheerio**, **express**, **multer**.

Contributor conventions: [`.cursor/rules/arkham-project.mdc`](.cursor/rules/arkham-project.mdc).
