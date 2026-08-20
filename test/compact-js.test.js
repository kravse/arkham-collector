const { test } = require("node:test");
const assert = require("node:assert/strict");

const { compactJs } = require("../scripts/lib/compact-js");

test("compactJs removes line and block comments outside strings", () => {
  const source = `
    // leading
    const value = "keep // me";
    /* block
       comment */
    const next = 1;
  `;
  const compact = compactJs(source);
  assert.match(compact, /const value="keep \/\/ me"/);
  assert.doesNotMatch(compact, /leading/);
  assert.doesNotMatch(compact, /block/);
  assert.match(compact, /const next=1/);
});

test("compactJs preserves template literals and regex literals", () => {
  const source = `
    const label = \`Cover of \${book.title}\`;
    const re = /tag:\\s*(?:"([^"]*)"|(\\S+))/gi;
  `;
  const compact = compactJs(source);
  assert.match(compact, /Cover of \$\{book\.title\}/);
  assert.match(compact, /tag:\\s*/);
});

test("compactJs shrinks readable bundle output", () => {
  const source = `
    function example(value) {
      // comment
      return value + 1;
    }
  `;
  const compact = compactJs(source);
  assert.ok(compact.length < source.length);
  assert.match(compact, /function example\(value\)\{return value\+1;\}/);
});
