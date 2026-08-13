import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const message = process.argv.slice(2).join(" ").trim();

if (!message) {
  throw new Error('缺少 commit 訊息。用法：npm run publish:site -- "message"');
}

function run(script, args = []) {
  execFileSync(process.execPath, [script, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

console.log("完整發布 1/2：預檢並同步獨立發布 checkout");
run("scripts/prepare-github-publish.mjs");

console.log("\n完整發布 2/2：提交、推送並驗證 GitHub Pages");
run("scripts/release-github-publish.mjs", [message]);
