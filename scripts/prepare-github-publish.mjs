import { access, cp, mkdir, realpath, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputsRoot = path.join(projectRoot, "outputs");
const publishRoot = path.join(outputsRoot, "ccp-stability-spending-publish");
const expectedRemote = "https://github.com/doublemoreart-dotcom/ccp-stability-spending.git";
const publishEntries = [
  ".gitattributes",
  "README.md",
  "index.html",
  "styles.css",
  "script.js",
  "assets",
  "scripts",
  "config",
];
const publicFiles = ["favicon.ico", "favicon.svg", "social-share.png"];

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, cwd = projectRoot, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

function git(args, cwd = publishRoot) {
  return run("git", args, cwd, true).trim();
}

function normalizeRemote(remote) {
  return remote
    .trim()
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

if (!(await exists(path.join(publishRoot, ".git")))) {
  throw new Error("尚未建立發布 checkout，請先執行 npm run publish:init。");
}

const resolvedOutputsRoot = await realpath(outputsRoot);
const resolvedPublishRoot = await realpath(publishRoot);
const relativePublishPath = path.relative(resolvedOutputsRoot, resolvedPublishRoot);
if (relativePublishPath.startsWith("..") || path.isAbsolute(relativePublishPath)) {
  throw new Error("發布 checkout 不在本專案 outputs/ 內，已停止同步。");
}

const actualRemote = git(["remote", "get-url", "origin"]);
if (normalizeRemote(actualRemote) !== normalizeRemote(expectedRemote)) {
  throw new Error(
    `發布 checkout 的 origin 不符。\n預期：${expectedRemote}\n實際：${actualRemote}`,
  );
}

const branch = git(["branch", "--show-current"]);
if (branch !== "main") {
  throw new Error(`發布 checkout 必須位於 main，目前為：${branch || "detached HEAD"}`);
}

const initialStatus = git(["status", "--short", "--untracked-files=all"]);
if (initialStatus) {
  throw new Error(
    `發布 checkout 尚有未處理變更，為避免覆寫已停止同步：\n${initialStatus}\n請先提交、還原或另行備份。`,
  );
}

console.log("1/4 驗證本機原始版與預覽版");
run(process.execPath, ["scripts/preflight-site.mjs"]);

console.log("\n2/4 同步公開網站檔案至獨立發布 checkout");
for (const entry of publishEntries) {
  const target = path.join(publishRoot, entry);
  await rm(target, { recursive: true, force: true });
  await cp(path.join(projectRoot, entry), target, { recursive: true });
}
await rm(path.join(publishRoot, "public"), { recursive: true, force: true });
await mkdir(path.join(publishRoot, "public"), { recursive: true });
for (const file of publicFiles) {
  await cp(path.join(projectRoot, "public", file), path.join(publishRoot, "public", file));
}
await cp(
  path.join(projectRoot, "config/github-pages-package.json"),
  path.join(publishRoot, "package.json"),
);

console.log("3/4 驗證發布內容");
run(process.execPath, ["scripts/check-site.mjs", "--source"], publishRoot);
run("git", ["diff", "--check"], publishRoot);

console.log("\n4/4 顯示待發布差異");
const preparedStatus = git(["status", "--short", "--untracked-files=all"]);
console.log(preparedStatus || "  沒有內容差異");
console.log(`\n發布 checkout：${publishRoot}`);
console.log("流程未執行 git add、commit 或 push；請審閱差異後再手動發布。");
