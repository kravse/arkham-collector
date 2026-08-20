/**
 * Conservative JS compaction for deploy artifacts.
 * Strips comments and collapses whitespace outside strings/template literals.
 */

function needsSpaceBetween(prevChar, nextChar) {
  if (!prevChar || !nextChar) {
    return false;
  }
  if (/[\s;{},()]/.test(prevChar) || /[\s;{},()]/.test(nextChar)) {
    return false;
  }
  if (/[+\-*/%&|^<>!=?:~]/.test(prevChar) || /[+\-*/%&|^<>!=?:~]/.test(nextChar)) {
    return false;
  }
  if (/[.\])}]/.test(prevChar)) {
    return false;
  }
  if (/[[({]/.test(nextChar)) {
    return false;
  }
  return /[\w$]/.test(prevChar) && /[\w$]/.test(nextChar);
}

function compactJs(source) {
  const input = String(source);
  let out = "";
  let i = 0;
  let prevOutChar = "";

  function appendChar(ch) {
    out += ch;
    prevOutChar = ch;
  }

  function appendSpace() {
    if (!prevOutChar || prevOutChar === " ") {
      return;
    }
    appendChar(" ");
  }

  while (i < input.length) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") {
        i += 1;
      }
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (
        i < input.length - 1 &&
        !(input[i] === "*" && input[i + 1] === "/")
      ) {
        i += 1;
      }
      i += 2;
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      appendChar(ch);
      i += 1;
      while (i < input.length) {
        const current = input[i];
        appendChar(current);
        i += 1;
        if (current === "\\" && i < input.length) {
          appendChar(input[i]);
          i += 1;
          continue;
        }
        if (current === quote) {
          break;
        }
      }
      continue;
    }

    if (ch === "`") {
      appendChar(ch);
      i += 1;
      while (i < input.length) {
        const current = input[i];
        appendChar(current);
        i += 1;
        if (current === "\\" && i < input.length) {
          appendChar(input[i]);
          i += 1;
          continue;
        }
        if (current === "`") {
          break;
        }
        if (current === "$" && input[i] === "{") {
          appendChar("{");
          i += 1;
          let depth = 1;
          while (i < input.length && depth > 0) {
            const exprChar = input[i];
            appendChar(exprChar);
            i += 1;
            if (exprChar === "{") {
              depth += 1;
            } else if (exprChar === "}") {
              depth -= 1;
            }
          }
        }
      }
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      const nextChar = input[j];
      if (nextChar && needsSpaceBetween(prevOutChar, nextChar)) {
        appendSpace();
      }
      i = j;
      continue;
    }

    appendChar(ch);
    i += 1;
  }

  return `${out.trim()}\n`;
}

module.exports = {
  compactJs,
};
