import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export const previewEntries = ["index.html", "styles.css", "script.js", "assets", "public"];

export const workflowFiles = [
  ".gitattributes",
  ".gitignore",
  "README.md",
  "package.json",
  "scripts/check-site.mjs",
  "scripts/check-version-boundary.mjs",
  "scripts/init-github-publish.mjs",
  "scripts/preflight-site.mjs",
  "scripts/prepare-github-publish.mjs",
  "scripts/rollback-local-preview.mjs",
  "scripts/site-files.mjs",
  "scripts/sync-local-preview.mjs",
  "scripts/update-site.mjs",
  "config/github-pages-package.json",
];

export const requiredSourceFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "assets/fonts/SNPro-Variable.ttf",
  "assets/images/hero-main.webp",
  "public/favicon.ico",
  "public/favicon.svg",
  "public/social-share.png",
];

async function collectFiles(root, relativePath, files) {
  const absolutePath = path.join(root, relativePath);
  const entryStat = await stat(absolutePath);

  if (entryStat.isFile()) {
    files.push(relativePath.split(path.sep).join("/"));
    return;
  }

  const children = await readdir(absolutePath);
  children.sort((left, right) => left.localeCompare(right));

  for (const child of children) {
    await collectFiles(root, path.join(relativePath, child), files);
  }
}

export async function collectPreviewFiles(root) {
  const files = [];

  for (const entry of previewEntries) {
    await collectFiles(root, entry, files);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export async function createSourceFingerprint(root) {
  const files = await collectPreviewFiles(root);

  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(await readFile(path.join(root, file)));
    hash.update("\0");
  }

  return hash.digest("hex");
}
