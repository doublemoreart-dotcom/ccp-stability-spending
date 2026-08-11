import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { collectPreviewFiles, workflowFiles } from "./site-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });
}

function git(args) {
  return run("git", args, { capture: true }).trim();
}

console.log("1/3 更新並驗證本機預覽");
run(process.execPath, ["scripts/update-site.mjs", "--preflight"]);

console.log("\n2/3 確認網站與更新工具皆已納入 Git");
const trackedFiles = new Set(git(["ls-files"]).split("\n").filter(Boolean));
const previewFiles = await collectPreviewFiles(projectRoot);
const filesRequiredByGit = [...new Set([...previewFiles, ...workflowFiles])].sort();
const untrackedRequiredFiles = filesRequiredByGit.filter((file) => !trackedFiles.has(file));

if (untrackedRequiredFiles.length) {
  const list = untrackedRequiredFiles.map((file) => `  - ${file}`).join("\n");
  console.error(`\n未通過：以下網站必要檔案尚未納入 Git：\n${list}`);
  console.error("\n請確認內容後再將這些檔案加入 Git，接著重新執行 npm run site:preflight。");
  process.exitCode = 1;
} else {
  console.log("3/3 摘要目前 Git 工作區狀態");
  const statusLines = git(["status", "--short", "--untracked-files=all"])
    .split("\n")
    .filter(Boolean);
  const stagedCount = statusLines.filter(
    (line) => !line.startsWith("??") && line[0] && line[0] !== " ",
  ).length;
  const unstagedCount = statusLines.filter(
    (line) => !line.startsWith("??") && line[1] && line[1] !== " ",
  ).length;
  const untrackedCount = statusLines.filter((line) => line.startsWith("??")).length;

  console.log(`  已暫存：${stagedCount}；未暫存：${unstagedCount}；未追蹤：${untrackedCount}`);
  console.log("\n推送前檢查完成：原始版、預覽版與 Git 必要檔案均已通過驗證。");
}
