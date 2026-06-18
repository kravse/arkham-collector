const fs = require("fs");
const path = require("path");
const { CARD_MAX_WIDTH } = require("./cover-optimize");
const { listCoverMasterFiles } = require("./cover-shrink");

const MIN_MASTER_EDGE = CARD_MAX_WIDTH;
const REPORT_DIR_NAME = "cover-review";

function parseCoverBookId(filename) {
  const match = String(filename || "").match(/-(\d+)\.[^.]+$/);
  if (!match) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isObviouslyTooSmall(metadata, minEdge = MIN_MASTER_EDGE) {
  const width = metadata?.width || 0;
  const height = metadata?.height || 0;
  if (!width || !height) {
    return false;
  }
  return Math.max(width, height) < minEdge;
}

function buildGoogleCoverSearchUrl(title) {
  const query = `${String(title || "").trim()} arkham`.trim();
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleFromCoverSlug(filename) {
  const base = path.basename(filename, path.extname(filename));
  const withoutId = base.replace(/-\d+$/, "");
  if (!withoutId) {
    return base;
  }
  return withoutId
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findBookByCoverPath(relativePath, books) {
  const normalized = String(relativePath || "").replace(/\\/g, "/");
  if (!normalized || !Array.isArray(books)) {
    return null;
  }
  const basename = path.basename(normalized);

  for (const book of books) {
    if (book.coverImageFile === normalized) {
      return book;
    }
  }
  for (const book of books) {
    if (book.coverImageFile && path.basename(book.coverImageFile) === basename) {
      return book;
    }
  }

  const parsedId = parseCoverBookId(basename);
  if (parsedId != null) {
    const byId = books.find((book) => book.id === parsedId);
    if (byId) {
      return byId;
    }
  }

  return null;
}

function resolveBookForCoverFile(filename, books) {
  const relativePath = `covers/${filename}`.replace(/\\/g, "/");
  const book = findBookByCoverPath(relativePath, books);
  if (!book) {
    return {
      bookId: null,
      title: titleFromCoverSlug(filename),
      hidden: false,
      deleted: false,
    };
  }
  return {
    bookId: book.id,
    title: book.title || book.listTitle || titleFromCoverSlug(filename),
    hidden: book.hidden === true,
    deleted: book.deleted === true,
  };
}

async function inspectCoverMaster(absolutePath, options = {}) {
  const minEdge = options.minEdge ?? MIN_MASTER_EDGE;
  let sharp = options.sharp;
  if (!sharp) {
    sharp = require("sharp");
  }

  const filename = path.basename(absolutePath);
  const meta = await sharp(absolutePath).metadata();
  if (!isObviouslyTooSmall(meta, minEdge)) {
    return null;
  }

  return {
    filename,
    relativePath: `covers/${filename}`.replace(/\\/g, "/"),
    width: meta.width,
    height: meta.height,
    longestEdge: Math.max(meta.width || 0, meta.height || 0),
  };
}

async function collectSmallCoverMasters(options = {}) {
  const coversDir = options.coversDir;
  if (!coversDir) {
    throw new Error("collectSmallCoverMasters requires coversDir");
  }

  const books = options.books || [];
  const files = listCoverMasterFiles(coversDir);
  const entries = [];

  for (const filePath of files) {
    const inspected = await inspectCoverMaster(filePath, options);
    if (!inspected) {
      continue;
    }
    const book = resolveBookForCoverFile(inspected.filename, books);
    entries.push({
      ...inspected,
      bookId: book.bookId,
      title: book.title,
      hidden: book.hidden === true,
      deleted: book.deleted === true,
      searchUrl: buildGoogleCoverSearchUrl(book.title),
    });
  }

  entries.sort((left, right) => {
    if (left.longestEdge !== right.longestEdge) {
      return left.longestEdge - right.longestEdge;
    }
    return left.title.localeCompare(right.title);
  });

  return entries;
}

function renderSmallCoverReportHtml(entries, options = {}) {
  const minEdge = options.minEdge ?? MIN_MASTER_EDGE;
  const generatedAt = options.generatedAt || new Date().toISOString();
  const hiddenCount = entries.filter((entry) => entry.hidden).length;
  const deletedCount = entries.filter((entry) => entry.deleted).length;
  const filteredCount = entries.filter((entry) => entry.hidden || entry.deleted).length;
  const rows =
    entries.length === 0
      ? `<p class="empty">No master covers under ${minEdge}px on the longest edge.</p>`
      : `<ol class="report">\n${entries
          .map(
            (entry) => `    <li class="report-row" data-hidden="${entry.hidden ? "true" : "false"}" data-deleted="${entry.deleted ? "true" : "false"}">
      <img
        class="report-cover"
        src="../${escapeHtml(entry.relativePath)}"
        alt="Cover of ${escapeHtml(entry.title)}"
        width="${entry.width}"
        height="${entry.height}"
        loading="lazy"
      />
      <div class="report-meta">
        <h2>${escapeHtml(entry.title)}</h2>
        <p class="report-details">
          ${entry.width}×${entry.height}px (longest edge ${entry.longestEdge}px)
          · ${escapeHtml(entry.relativePath)}${
            entry.bookId != null ? ` · book id ${entry.bookId}` : ""
          }${entry.hidden ? " · hidden" : ""}${entry.deleted ? " · deleted" : ""}
        </p>
        <div class="report-actions">${
          entry.bookId != null
            ? `<label class="report-upload">
          <input
            type="file"
            accept="image/*"
            class="report-upload-input"
            data-book-id="${entry.bookId}"
            hidden
          />
          Upload cover
        </label>`
            : ""
        }
        <a
          class="report-search"
          href="${escapeHtml(entry.searchUrl)}"
          target="_blank"
          rel="noopener noreferrer"
        >Search cover</a>
        </div>
      </div>
    </li>`,
          )
          .join("\n")}\n  </ol>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Small cover masters</title>
    <style>
      :root {
        color-scheme: light dark;
        --bg: #f4efe6;
        --panel: #fffdf8;
        --text: #1f1a14;
        --muted: #6b6156;
        --accent: #7a3b1a;
        --border: #d9cdbf;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --bg: #171411;
          --panel: #211c17;
          --text: #f4efe6;
          --muted: #b9aa98;
          --accent: #d7a06a;
          --border: #3a322a;
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        font: 16px/1.5 Georgia, "Times New Roman", serif;
        background: var(--bg);
        color: var(--text);
      }
      header {
        padding: 1.5rem 1.25rem 1rem;
        border-bottom: 1px solid var(--border);
        background: var(--panel);
      }
      header h1 {
        margin: 0 0 0.35rem;
        font-size: 1.5rem;
      }
      header p {
        margin: 0;
        color: var(--muted);
      }
      .report-controls {
        margin-top: 0.85rem;
      }
      .report-filter {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        cursor: pointer;
        user-select: none;
      }
      .report-filter input {
        width: 1rem;
        height: 1rem;
        margin: 0;
        accent-color: var(--accent);
      }
      main {
        max-width: 960px;
        margin: 0 auto;
        padding: 1.25rem;
      }
      .report {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 1rem;
      }
      .report-row {
        display: grid;
        grid-template-columns: 120px minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
        padding: 1rem;
        border: 1px solid var(--border);
        border-radius: 8px;
        background: var(--panel);
      }
      .report-row[data-hidden="true"],
      .report-row[data-deleted="true"] {
        border-style: dashed;
      }
      body.filter-hidden-books .report-row[data-hidden="true"],
      body.filter-hidden-books .report-row[data-deleted="true"] {
        display: none;
      }
      .report-cover {
        width: 120px;
        height: auto;
        display: block;
        border: 1px solid var(--border);
        background: #fff;
      }
      .report-meta h2 {
        margin: 0 0 0.35rem;
        font-size: 1.1rem;
      }
      .report-details {
        margin: 0 0 0.75rem;
        color: var(--muted);
        font-size: 0.95rem;
      }
      .report-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .report-search,
      .report-upload {
        display: inline-block;
        padding: 0.45rem 0.85rem;
        border-radius: 999px;
        border: 1px solid var(--accent);
        font-size: 0.95rem;
        transition: background 0.15s ease;
      }
      .report-upload {
        cursor: pointer;
        background: var(--accent);
        color: var(--panel);
        font-weight: 600;
      }
      .report-upload:hover {
        background: color-mix(in srgb, var(--accent) 82%, var(--text));
      }
      .report-search {
        background: color-mix(in srgb, var(--text) 7%, var(--panel));
        color: var(--accent);
        text-decoration: none;
      }
      .report-search:hover {
        background: color-mix(in srgb, var(--accent) 14%, var(--panel));
      }
      .report-upload.is-uploading {
        opacity: 0.7;
        cursor: wait;
      }
      .empty {
        margin: 0;
        padding: 1rem;
        border: 1px dashed var(--border);
        border-radius: 8px;
        background: var(--panel);
        color: var(--muted);
      }
      .report-refresh {
        position: fixed;
        right: 1.25rem;
        bottom: 1.25rem;
        z-index: 10;
        padding: 0.65rem 1.1rem;
        border: 1px solid var(--accent);
        border-radius: 999px;
        background: var(--panel);
        color: var(--accent);
        font: inherit;
        font-size: 0.95rem;
        cursor: pointer;
        box-shadow: 0 4px 16px color-mix(in srgb, var(--text) 12%, transparent);
      }
      .report-refresh:hover:not(:disabled) {
        background: color-mix(in srgb, var(--accent) 12%, transparent);
      }
      .report-refresh:disabled {
        opacity: 0.7;
        cursor: wait;
      }
      @media (max-width: 640px) {
        .report-row {
          grid-template-columns: 1fr;
        }
        .report-cover {
          width: min(160px, 100%);
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Small cover masters</h1>
      <p id="report-summary" data-total="${entries.length}" data-hidden="${hiddenCount}" data-deleted="${deletedCount}" data-filtered="${filteredCount}" data-min-edge="${minEdge}" data-generated="${escapeHtml(generatedAt)}">
        ${entries.length} master cover(s) under ${minEdge}px on the longest edge · generated ${escapeHtml(generatedAt)}
      </p>
      <div class="report-controls">
        <label class="report-filter">
          <input type="checkbox" id="hide-hidden-books" checked />
          Hide hidden and deleted books
        </label>
      </div>
    </header>
    <main>
      ${rows}
    </main>
    <button type="button" class="report-refresh" id="report-refresh">Refresh</button>
    <script>
      (function () {
        const hideHiddenKey = "cover-review-hide-hidden";
        const hideHiddenCheckbox = document.getElementById("hide-hidden-books");
        const summary = document.getElementById("report-summary");

        function updateSummary() {
          if (!summary) {
            return;
          }
          const total = Number(summary.dataset.total || "0");
          const filteredTotal = Number(summary.dataset.filtered || "0");
          const minEdge = summary.dataset.minEdge || "480";
          const generated = summary.dataset.generated || "";
          const filtering = hideHiddenCheckbox?.checked === true;
          const visible = filtering ? total - filteredTotal : total;
          const generatedSuffix = generated ? " · generated " + generated : "";
          if (filtering && filteredTotal > 0) {
            summary.textContent =
              visible +
              " shown (" +
              filteredTotal +
              " hidden or deleted filtered) of " +
              total +
              " small master cover(s) under " +
              minEdge +
              "px on the longest edge" +
              generatedSuffix;
          } else {
            summary.textContent =
              total +
              " master cover(s) under " +
              minEdge +
              "px on the longest edge" +
              generatedSuffix;
          }
        }

        function applyHiddenFilter() {
          const filtering = hideHiddenCheckbox?.checked === true;
          document.body.classList.toggle("filter-hidden-books", filtering);
          try {
            sessionStorage.setItem(hideHiddenKey, filtering ? "1" : "0");
          } catch (_error) {
            // ignore storage errors
          }
          updateSummary();
        }

        if (hideHiddenCheckbox) {
          try {
            const stored = sessionStorage.getItem(hideHiddenKey);
            if (stored === "0") {
              hideHiddenCheckbox.checked = false;
            }
          } catch (_error) {
            // ignore storage errors
          }
          hideHiddenCheckbox.addEventListener("change", applyHiddenFilter);
          applyHiddenFilter();
        }

        document.getElementById("report-refresh")?.addEventListener("click", async () => {
          const button = document.getElementById("report-refresh");
          button.disabled = true;
          button.textContent = "Refreshing…";
          try {
            const response = await fetch("/cover-review/api/refresh", { method: "POST" });
            if (!response.ok) {
              throw new Error("Refresh failed");
            }
            location.reload();
          } catch (_error) {
            button.disabled = false;
            button.textContent = "Refresh";
            alert("Could not refresh. Run npm run report-small-covers so the review server is available.");
          }
        });

        document.querySelector(".report")?.addEventListener("change", async (event) => {
          const input = event.target.closest(".report-upload-input");
          if (!input?.files?.length) {
            return;
          }

          const bookId = input.dataset.bookId;
          const label = input.closest(".report-upload");
          const formData = new FormData();
          formData.append("cover", input.files[0]);

          if (label) {
            label.classList.add("is-uploading");
            label.textContent = "Uploading…";
          }

          try {
            const response = await fetch("/cover-review/api/books/" + bookId + "/cover", {
              method: "POST",
              body: formData,
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(payload.error || "Upload failed");
            }

            const refreshResponse = await fetch("/cover-review/api/refresh", {
              method: "POST",
            });
            if (!refreshResponse.ok) {
              throw new Error("Upload saved but refresh failed");
            }
            location.reload();
          } catch (error) {
            if (label) {
              label.classList.remove("is-uploading");
              label.textContent = "Upload cover";
            }
            input.value = "";
            alert(error.message || "Could not upload cover.");
          }
        });
      })();
    </script>
  </body>
</html>
`;
}

function writeSmallCoverReport(entries, options = {}) {
  const root = options.root || process.cwd();
  const reportDir = path.join(root, REPORT_DIR_NAME);
  fs.mkdirSync(reportDir, { recursive: true });
  const htmlPath = path.join(reportDir, "index.html");
  const html = renderSmallCoverReportHtml(entries, options);
  fs.writeFileSync(htmlPath, html);
  return htmlPath;
}

module.exports = {
  MIN_MASTER_EDGE,
  REPORT_DIR_NAME,
  parseCoverBookId,
  isObviouslyTooSmall,
  buildGoogleCoverSearchUrl,
  titleFromCoverSlug,
  findBookByCoverPath,
  resolveBookForCoverFile,
  collectSmallCoverMasters,
  renderSmallCoverReportHtml,
  writeSmallCoverReport,
};
