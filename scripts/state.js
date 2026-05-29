const { parseArgs } = require("./cli");

const state = {
  args: null,
  pageCache: new Map(),
  coverDownloadCache: new Map(),
  descriptionHtmlCache: new Map(),
  requestCount: 0,
  lastRequestAt: 0,
};

function initState(argv) {
  state.args = parseArgs(argv);
}

function delayMs() {
  return state.args?.delayMs ?? 2000;
}

module.exports = { state, initState, delayMs };
