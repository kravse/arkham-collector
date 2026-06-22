const { exportArkhamCatalogCsv } = require("../lib/catalog-export");

function exportArkhamCatalog(options = {}) {
  const result = exportArkhamCatalogCsv(options);
  if (result.output !== "-") {
    console.log(`Wrote ${result.rowCount} rows to ${result.output}`);
  }
  return result;
}

module.exports = { exportArkhamCatalog };
