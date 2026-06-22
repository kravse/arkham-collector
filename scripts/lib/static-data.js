const fs = require("fs");
const path = require("path");

function writeJsonFile(jsonPath, value) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsGlobal(jsPath, globalName, value) {
  fs.mkdirSync(path.dirname(jsPath), { recursive: true });
  fs.writeFileSync(
    jsPath,
    `window.${globalName} = ${JSON.stringify(value, null, 2)};\n`,
  );
}

function writeJsonAndJs({ jsonPath, jsPath, jsonValue, jsGlobal, jsValue }) {
  writeJsonFile(jsonPath, jsonValue);
  writeJsGlobal(jsPath, jsGlobal, jsValue);
}

module.exports = {
  writeJsonFile,
  writeJsGlobal,
  writeJsonAndJs,
};
