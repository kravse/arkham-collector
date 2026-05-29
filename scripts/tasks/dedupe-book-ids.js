const { loadExistingPayload, writeOutput } = require("../lib/books");

function dedupeBookIds() {
  const payload = loadExistingPayload();
  const { jsonPath, jsPath } = writeOutput(payload);
  console.log(`JSON: ${jsonPath}`);
  console.log(`JS:   ${jsPath}`);
}

module.exports = { dedupeBookIds };
