import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertPublishCheckout,
  expectedRepoSlug,
  gitOutput,
  isAllowedPublishPath,
  pagesUrl,
  publishStagePathspecs,
} from "./github-publish-config.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const message = args.filter((argument) => argument !== "--dry-run").join(" ").trim();
const pagesTimeoutMs = 5 * 60 * 1000;

function run(command, commandArgs, cwd, capture = false) {
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

function statusPaths(publishRoot) {
  const status = run(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    publishRoot,
    true,
  ).trimEnd();
  if (!status) return [];
  return status.split("\n").map((line) => line.slice(3).replace(/^"|"$/g, ""));
}

function assertAllowedChanges(paths) {
  const outside = paths.filter((file) => !isAllowedPublishPath(file));
  if (outside.length) {
    throw new Error(
      `發布 checkout 出現允許範圍外的差異，已停止：\n${outside
        .map((file) => `  - ${file}`)
        .join("\n")}`,
    );
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ccp-stability-spending-release",
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub public API 回應 ${response.status}：${url}`);
  }
  return response.json();
}

async function waitForPages(commitSha) {
  const deadline = Date.now() + pagesTimeoutMs;
  const apiUrl = `https://api.github.com/repos/${expectedRepoSlug}/actions/runs?head_sha=${commitSha}&per_page=20`;
  let latestRun;

  while (Date.now() < deadline) {
    const data = await fetchJson(apiUrl);
    latestRun = data.workflow_runs.find(
      (run) =>
        run.name === "pages build and deployment" ||
        run.name === "pages-build-deployment" ||
        run.path?.endsWith("/pages-build-deployment") ||
        run.path === "pages-build-deployment",
    );

    if (latestRun?.status === "completed") {
      if (latestRun.conclusion !== "success") {
        throw new Error(
          `Pages 部署失敗：${latestRun.conclusion || "unknown"}\n${latestRun.html_url}`,
        );
      }
      return latestRun;
    }

    await sleep(5000);
  }

  throw new Error(
    `等待 Pages 部署逾時。${latestRun?.html_url ? `\n${latestRun.html_url}` : `\n${apiUrl}`}`,
  );
}

async function verifyPublishedPage(commitSha) {
  const separator = pagesUrl.includes("?") ? "&" : "?";
  const verificationUrl = `${pagesUrl}${separator}release=${commitSha.slice(0, 12)}`;
  const deadline = Date.now() + 60_000;
  let lastStatus = 0;

  while (Date.now() < deadline) {
    const response = await fetch(verificationUrl, { redirect: "follow" });
    lastStatus = response.status;
    if (response.status === 200) {
      const bytes = (await response.arrayBuffer()).byteLength;
      return { verificationUrl, bytes };
    }
    await sleep(3000);
  }

  throw new Error(`Pages 驗證失敗：HTTP ${lastStatus}\n${verificationUrl}`);
}

const { publishRoot } = await assertPublishCheckout(projectRoot);

run("git", ["config", "--local", "user.name", "doublemoreart-dotcom"], publishRoot);
run(
  "git",
  ["config", "--local", "user.email", "doublemoreart-dotcom@users.noreply.github.com"],
  publishRoot,
);
run("git", ["config", "--local", "http.version", "HTTP/1.1"], publishRoot);
run("git", ["config", "--local", "http.postBuffer", "524288000"], publishRoot);

console.log("1/5 更新並核對 origin/main");
run("git", ["fetch", "origin", "main"], publishRoot);
const headBeforeRelease = gitOutput(publishRoot, ["rev-parse", "HEAD"]);
const originMain = gitOutput(publishRoot, ["rev-parse", "origin/main"]);
if (headBeforeRelease !== originMain) {
  throw new Error(
    `發布 checkout 未與最新 origin/main 對齊。\nHEAD：${headBeforeRelease}\norigin/main：${originMain}`,
  );
}

console.log("2/5 驗證發布差異範圍");
const changedPaths = statusPaths(publishRoot);
if (!changedPaths.length) {
  console.log("沒有待發布差異；未建立 commit，也未執行 push。");
  process.exit(0);
}
assertAllowedChanges(changedPaths);
run(process.execPath, ["--check", "script.js"], publishRoot);
run(process.execPath, ["scripts/check-site.mjs", "--source"], publishRoot);
run("git", ["diff", "--check"], publishRoot);

if (dryRun) {
  console.log(`Dry run 通過：${changedPaths.length} 個允許範圍內的檔案可發布。`);
  process.exit(0);
}
if (!message) {
  throw new Error('缺少 commit 訊息。用法：npm run publish:release -- "message"');
}

console.log("3/5 明確暫存允許發布的檔案");
run("git", ["add", "--", ...publishStagePathspecs], publishRoot);
const stagedPaths = gitOutput(publishRoot, ["diff", "--cached", "--name-only"])
  .split("\n")
  .filter(Boolean);
assertAllowedChanges(stagedPaths);
run("git", ["diff", "--cached", "--check"], publishRoot);

const remainingPaths = statusPaths(publishRoot).filter(
  (file) => !stagedPaths.includes(file),
);
if (remainingPaths.length) {
  throw new Error(`仍有未納入發布的差異：\n${remainingPaths.map((file) => `  - ${file}`).join("\n")}`);
}

console.log("4/5 建立 commit 並推送 main");
run("git", ["commit", "-m", message], publishRoot);
const commitSha = gitOutput(publishRoot, ["rev-parse", "HEAD"]);
run("git", ["push", "origin", "main"], publishRoot);

console.log("5/5 等待 Pages 並驗證公開網址");
const pagesRun = await waitForPages(commitSha);
const page = await verifyPublishedPage(commitSha);
console.log(`發布完成：${commitSha}`);
console.log(`Pages run：${pagesRun.html_url}`);
console.log(`HTTP 200：${page.verificationUrl}（${page.bytes} bytes）`);
