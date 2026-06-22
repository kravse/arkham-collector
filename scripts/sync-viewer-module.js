const fs = require("fs");
const path = require("path");

const { VIEWER_SYNC_ENTRIES } = require("./viewer-sync-config");

const ROOT = path.join(__dirname, "..");
const VIEWER_DIR = path.join(ROOT, "js", "viewer");

function stripModuleExports(source) {
  return source.replace(/\nmodule\.exports = \{[\s\S]*$/, "");
}

function stripRequires(source) {
  return source.replace(/^const \{[\s\S]*?\} = require\([^)]+\);\n\n/m, "");
}

function indentBody(source) {
  return source
    .trimEnd()
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function readCombinedBody(entry) {
  const bodies = entry.sources.map((sourcePath, index) => {
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Missing viewer sync source: ${sourcePath}`);
    }
    let body = stripModuleExports(fs.readFileSync(sourcePath, "utf8"));
    if (entry.stripRequiresFromSources?.includes(index)) {
      body = stripRequires(body);
    }
    if (entry.transformBody) {
      body = entry.transformBody(body);
    }
    return body.trimEnd();
  });
  return bodies.join("\n\n");
}

function formatExports(exports) {
  return exports.map((name) => `    ${name},`).join("\n");
}

function syncViewerModule(entry) {
  const body = readCombinedBody(entry);
  const output = `/* ${entry.header} */

const ${entry.globalName} = (function () {
${indentBody(body)}
  return {
${formatExports(entry.exports)}
  };
})();
`;
  const targetPath = path.join(VIEWER_DIR, entry.target);
  fs.writeFileSync(targetPath, output);
  return targetPath;
}

function syncAllViewerModules() {
  for (const entry of VIEWER_SYNC_ENTRIES) {
    syncViewerModule(entry);
  }
}

module.exports = {
  VIEWER_SYNC_ENTRIES,
  stripModuleExports,
  stripRequires,
  indentBody,
  readCombinedBody,
  syncViewerModule,
  syncAllViewerModules,
};
