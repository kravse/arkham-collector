const { WIKI_API, USER_AGENT } = require("../config");
const { state, delayMs } = require("../state");
const { sleep } = require("./text");

async function throttle() {
  const elapsed = Date.now() - state.lastRequestAt;
  if (elapsed < delayMs()) {
    await sleep(delayMs() - elapsed);
  }
  state.lastRequestAt = Date.now();
}

async function fetchWithRetry(url, options = {}, retries = 3) {
  await throttle();
  state.requestCount += 1;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "User-Agent": USER_AGENT,
        ...(options.headers || {}),
      },
    });

    if (response.status === 429 && attempt < retries) {
      console.warn(`Rate limited (429). Waiting 60s before retry...`);
      await sleep(60000);
      continue;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = await response.json();
      if (
        json.error &&
        /maxlag|ratelimited/i.test(json.error.code || json.error.info || "")
      ) {
        if (attempt < retries) {
          console.warn(`API rate limit: ${json.error.info}. Waiting 60s...`);
          await sleep(60000);
          continue;
        }
      }
      return json;
    }

    return response;
  }

  throw new Error(`Failed after retries: ${url}`);
}

async function fetchParseHtml(pageTitle) {
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    prop: "text",
    format: "json",
    redirects: "true",
  });
  const json = await fetchWithRetry(`${WIKI_API}?${params}`);
  if (json.error) {
    throw new Error(json.error.info || json.error.code);
  }
  const text = json.parse.text;
  return typeof text === "string" ? text : text["*"];
}

module.exports = {
  throttle,
  fetchWithRetry,
  fetchParseHtml,
};
