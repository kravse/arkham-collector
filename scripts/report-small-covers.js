#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { ROOT, COVERS_DIR, DATA_DIR } = require("./config");
const { loadEdits, applyEditsToBooks } = require("./lib/edits");
const {
  saveBookCoverUpload,
  createCoverUploadMiddleware,
} = require("./lib/cover-upload");
const {
  MIN_MASTER_EDGE,
  REPORT_DIR_NAME,
  collectSmallCoverMasters,
  writeSmallCoverReport,
} = require("./lib/cover-small-report");

const DEFAULT_PORT = 28471;

function parseArgs(argv) {
  const options = {
    minEdge: MIN_MASTER_EDGE,
    serve: true,
    port: Number(process.env.COVER_REVIEW_PORT) || DEFAULT_PORT,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--min-edge") {
      options.minEdge = Number(argv[++i]);
    } else if (arg === "--port") {
      options.port = Number(argv[++i]);
    } else if (arg === "--no-serve") {
      options.serve = false;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Scan cover masters in covers/ and write a review page for images that
are obviously too small (longest edge below the threshold).

Output: ${REPORT_DIR_NAME}/index.html (gitignored)

Usage:
  npm run report-small-covers [-- --min-edge 700] [-- --port 28471] [-- --no-serve]

Options:
  --min-edge N   Flag masters whose longest edge is below N pixels (default ${MIN_MASTER_EDGE})
  --port N       Local server port (default ${DEFAULT_PORT}, or COVER_REVIEW_PORT)
  --no-serve     Write the report only; do not start a local server
`);
}

function loadBooksForReport() {
  const booksJson = path.join(DATA_DIR, "books.json");
  if (!fs.existsSync(booksJson)) {
    throw new Error("Missing data/books.json. Run the crawler first.");
  }
  const payload = JSON.parse(fs.readFileSync(booksJson, "utf8"));
  const edits = loadEdits().edits;
  return applyEditsToBooks(payload.books || [], edits);
}

async function regenerateSmallCoverReport(options = {}) {
  const minEdge = options.minEdge ?? MIN_MASTER_EDGE;
  const books = loadBooksForReport();
  const entries = await collectSmallCoverMasters({
    coversDir: COVERS_DIR,
    books,
    minEdge,
  });
  const htmlPath = writeSmallCoverReport(entries, {
    root: ROOT,
    minEdge,
    generatedAt: new Date().toLocaleString(),
  });
  return {
    entries,
    htmlPath,
    count: entries.length,
  };
}

async function startCoverReviewServer(root, options = {}) {
  const express = require("express");
  const port = options.port ?? DEFAULT_PORT;
  const app = express();
  const upload = createCoverUploadMiddleware();

  if (typeof options.onRefresh === "function") {
    app.post("/cover-review/api/refresh", async (_req, res) => {
      try {
        const result = await options.onRefresh();
        res.json({ count: result.count });
      } catch (error) {
        res.status(500).json({ error: error.message || "Refresh failed" });
      }
    });
  }

  app.post(
    "/cover-review/api/books/:id/cover",
    upload.single("cover"),
    (req, res) => {
      try {
        const bookId = Number(req.params.id);
        if (!Number.isInteger(bookId) || bookId < 1) {
          res.status(400).json({ error: "Invalid book id" });
          return;
        }
        if (!req.file) {
          res.status(400).json({ error: "No image uploaded" });
          return;
        }

        const result = saveBookCoverUpload(bookId, {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
        });
        res.json(result);
      } catch (error) {
        const status = error.message === "Book not found" ? 404 : 500;
        res.status(status).json({ error: error.message || "Upload failed" });
      }
    },
  );

  app.use((error, _req, res, next) => {
    if (error?.message) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  });

  app.get("/", (_req, res) => {
    res.redirect(`/cover-review/`);
  });
  app.use(express.static(root));

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve({
        server,
        port,
        url: `http://localhost:${port}/cover-review/`,
      });
    });
    server.on("error", reject);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!Number.isFinite(options.minEdge) || options.minEdge < 1) {
    throw new Error("--min-edge must be a positive number");
  }
  if (!Number.isFinite(options.port) || options.port < 1) {
    throw new Error("--port must be a positive number");
  }

  const { htmlPath, count } = await regenerateSmallCoverReport({
    minEdge: options.minEdge,
  });

  console.log(
    `Wrote ${count} small master cover(s) to ${path.relative(ROOT, htmlPath)}`,
  );

  if (!options.serve) {
    console.log(`Open file://${htmlPath} in a browser to review.`);
    return;
  }

  const { url } = await startCoverReviewServer(ROOT, {
    port: options.port,
    onRefresh: () => regenerateSmallCoverReport({ minEdge: options.minEdge }),
  });
  console.log(`Review at ${url}`);
  console.log("Press Ctrl+C to stop.");

  await new Promise(() => {});
}

if (require.main === module) {
  main().catch((error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(
        `Port ${parseArgs(process.argv.slice(2)).port} is in use. Try --port or set COVER_REVIEW_PORT.`,
      );
    } else {
      console.error(error.message || error);
    }
    process.exit(1);
  });
}

module.exports = {
  main,
  parseArgs,
  loadBooksForReport,
  regenerateSmallCoverReport,
  startCoverReviewServer,
  DEFAULT_PORT,
};
