import { stat, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

export const expectedRepoSlug = "doublemoreart-dotcom/ccp-stability-spending";
export const expectedRemote = `https://github.com/${expectedRepoSlug}.git`;
export const publishDirectoryName = "ccp-stability-spending-publish";
export const pagesUrl = "https://doublemoreart-dotcom.github.io/ccp-stability-spending/";
export const publishPackageTemplate = "config/github-pages-package.json";

export const publishCopyEntries = [
  ".gitattributes",
  "README.md",
  "index.html",
  "styles.css",
  "script.js",
  "assets",
  "scripts",
  "config",
];

export const publishPublicFiles = ["favicon.ico", "favicon.svg", "social-share.png"];

export const publishStagePathspecs = [
  ".gitattributes",
  "README.md",
  "index.html",
  "styles.css",
  "script.js",
  "assets",
  "scripts",
  "config",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/social-share.png",
  "package.json",
];

const allowedFiles = new Set([
  ".gitattributes",
  "README.md",
  "index.html",
  "styles.css",
  "script.js",
  "package.json",
  ...publishPublicFiles.map((file) => `public/${file}`),
]);
const allowedDirectories = ["assets/", "scripts/", "config/"];

export function resolvePublishPaths(projectRoot) {
  const outputsRoot = path.join(projectRoot, "outputs");
  return {
    outputsRoot,
    publishRoot: path.join(outputsRoot, publishDirectoryName),
  };
}

export function normalizeRemote(remote) {
  return remote
    .trim()
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "")
    .replace(/\/$/, "")
    .toLowerCase();
}

export function isAllowedPublishPath(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join("/").replace(/^\.\//, "");
  return (
    allowedFiles.has(normalizedPath) ||
    allowedDirectories.some((directory) => normalizedPath.startsWith(directory))
  );
}

export function gitOutput(publishRoot, args) {
  return execFileSync("git", args, {
    cwd: publishRoot,
    encoding: "utf8",
  }).trim();
}

export async function assertPublishCheckout(projectRoot) {
  const { outputsRoot, publishRoot } = resolvePublishPaths(projectRoot);
  const gitDirectory = path.join(publishRoot, ".git");

  let gitStat;
  try {
    gitStat = await stat(gitDirectory);
  } catch {
    throw new Error("找不到獨立發布 checkout，請先執行 npm run publish:init。");
  }
  if (!gitStat.isDirectory()) {
    throw new Error("發布 checkout 的 .git 不是獨立目錄，已停止操作。");
  }

  const resolvedOutputsRoot = await realpath(outputsRoot);
  const resolvedPublishRoot = await realpath(publishRoot);
  const relativePublishPath = path.relative(resolvedOutputsRoot, resolvedPublishRoot);
  if (
    !relativePublishPath ||
    relativePublishPath.startsWith("..") ||
    path.isAbsolute(relativePublishPath)
  ) {
    throw new Error("發布 checkout 不在本專案 outputs/ 內，已停止操作。");
  }

  const repositoryRoot = await realpath(gitOutput(publishRoot, ["rev-parse", "--show-toplevel"]));
  if (repositoryRoot !== resolvedPublishRoot) {
    throw new Error("發布 checkout 並非獨立 Git 工作區，已停止操作。");
  }

  const actualRemote = gitOutput(publishRoot, ["remote", "get-url", "origin"]);
  if (normalizeRemote(actualRemote) !== normalizeRemote(expectedRemote)) {
    throw new Error(
      `發布 checkout 的 origin 不符。\n預期：${expectedRemote}\n實際：${actualRemote}`,
    );
  }

  const branch = gitOutput(publishRoot, ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`發布 checkout 必須位於 main，目前為：${branch || "detached HEAD"}`);
  }

  return { outputsRoot, publishRoot };
}
