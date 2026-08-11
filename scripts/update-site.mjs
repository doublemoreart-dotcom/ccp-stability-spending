import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const calledFromPreflight = process.argv.includes("--preflight");

function run(command, args) {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
}

console.log("1/5 確認 Git 原始版與本機預覽版分離");
run(process.execPath, ["scripts/check-version-boundary.mjs"]);

console.log("2/5 檢查 JavaScript 語法與 Git diff 格式");
run(process.execPath, ["--check", "script.js"]);
run("git", ["diff", "--check"]);

console.log("3/5 驗證網站原始檔、連結與分享素材");
run(process.execPath, ["scripts/check-site.mjs", "--source"]);

console.log("4/5 安全重建本機預覽");
run(process.execPath, ["scripts/sync-local-preview.mjs"]);

console.log("5/5 比對本機預覽與原始版內容指紋");
run(process.execPath, ["scripts/check-site.mjs"]);

console.log("\n日常更新完成：可重新整理 outputs/china-stability-site/index.html。");
if (!calledFromPreflight) {
  console.log("準備提交或推送前，請再執行 npm run site:preflight。");
}
