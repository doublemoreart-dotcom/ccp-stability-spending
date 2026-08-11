import { access, mkdir, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputsRoot = path.join(projectRoot, "outputs");
const publishRoot = path.join(outputsRoot, "ccp-stability-spending-publish");
const expectedRemote = "https://github.com/doublemoreart-dotcom/ccp-stability-spending.git";

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function normalizeRemote(remote) {
  return remote
    .trim()
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

function git(args, cwd = publishRoot) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function assertExpectedCheckout() {
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
}

await mkdir(outputsRoot, { recursive: true });
const resolvedOutputsRoot = await realpath(outputsRoot);
const relativePublishPath = path.relative(resolvedOutputsRoot, publishRoot);
if (relativePublishPath.startsWith("..") || path.isAbsolute(relativePublishPath)) {
  throw new Error("發布 checkout 必須位於本專案 outputs/ 內。");
}

if (await exists(publishRoot)) {
  if (!(await exists(path.join(publishRoot, ".git")))) {
    throw new Error(`目標已存在但不是 Git checkout，未進行覆寫：${publishRoot}`);
  }
  assertExpectedCheckout();
  console.log(`發布 checkout 已存在且設定正確：${publishRoot}`);
} else {
  execFileSync(
    "git",
    ["clone", "--branch", "main", "--single-branch", expectedRemote, publishRoot],
    { cwd: projectRoot, stdio: "inherit" },
  );
  assertExpectedCheckout();
  console.log(`已建立獨立發布 checkout：${publishRoot}`);
}

console.log("本機主專案的 Git remote 未被修改。");
