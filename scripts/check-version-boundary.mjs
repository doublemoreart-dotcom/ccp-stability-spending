import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
}

const trackedPreviewFiles = git(["ls-files", "outputs"]);
if (trackedPreviewFiles) {
  throw new Error(`outputs/ 不應被 Git 追蹤：\n${trackedPreviewFiles}`);
}

try {
  git(["check-ignore", "outputs/china-stability-site/index.html"]);
} catch {
  throw new Error("outputs/ 尚未被 .gitignore 排除。");
}

const requiredSourceFiles = ["index.html", "styles.css", "script.js"];
const trackedFiles = new Set(git(["ls-files"]).split("\n"));
const missingSources = requiredSourceFiles.filter((file) => !trackedFiles.has(file));

if (missingSources.length) {
  throw new Error(`未納入 Git 的網站原始檔：${missingSources.join(", ")}`);
}

console.log("版本邊界正確：根目錄為 Git 原始版，outputs/ 為本機預覽版。");
