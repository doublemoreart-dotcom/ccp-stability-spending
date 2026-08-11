import { access, cp, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createSourceFingerprint,
  previewEntries,
} from "./site-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputsRoot = path.join(projectRoot, "outputs");
const previewRoot = path.join(outputsRoot, "china-stability-site");
const previousRoot = path.join(outputsRoot, "china-stability-site-previous");
const stagingRoot = path.join(outputsRoot, `.china-stability-site-staging-${process.pid}`);
const backupRoot = path.join(outputsRoot, `.china-stability-site-backup-${process.pid}`);

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

await mkdir(outputsRoot, { recursive: true });
await rm(stagingRoot, { recursive: true, force: true });
await rm(backupRoot, { recursive: true, force: true });
await mkdir(stagingRoot, { recursive: true });

const sourceFingerprint = await createSourceFingerprint(projectRoot);

for (const entry of previewEntries) {
  await cp(path.join(projectRoot, entry), path.join(stagingRoot, entry), {
    recursive: true,
  });
}

let revision = "uncommitted";
let dirty = true;
try {
  revision = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: projectRoot,
    encoding: "utf8",
  }).trim();
  dirty = Boolean(
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: projectRoot,
      encoding: "utf8",
    }).trim(),
  );
} catch {
  // The local preview remains usable outside a Git checkout.
}

const generatedAt = new Date().toISOString();
await writeFile(
  path.join(stagingRoot, "LOCAL_PREVIEW.json"),
  `${JSON.stringify(
    {
      generatedAt,
      revision,
      dirty,
      sourceFingerprint,
      trackedByGit: false,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

await writeFile(
  path.join(stagingRoot, "README.md"),
  `# 本機預覽副本\n\n此目錄由 \`npm run site:update\` 產生，不納入 Git，也不應直接修改。\n\n- 來源版本：\`${revision}${dirty ? "（含未提交修改）" : ""}\`\n- 內容指紋：\`${sourceFingerprint.slice(0, 12)}\`\n- 產生時間：\`${generatedAt}\`\n- 網站入口：\`index.html\`\n`,
  "utf8",
);

const stagedFingerprint = await createSourceFingerprint(stagingRoot);
if (stagedFingerprint !== sourceFingerprint) {
  await rm(stagingRoot, { recursive: true, force: true });
  throw new Error("同步期間原始檔發生變動，已保留舊預覽；請重新執行更新。");
}

try {
  let hasPreviousPreview = false;
  if (await exists(previewRoot)) {
    await rename(previewRoot, backupRoot);
    hasPreviousPreview = true;
  }

  await rename(stagingRoot, previewRoot);

  if (hasPreviousPreview) {
    await rm(previousRoot, { recursive: true, force: true });
    await rename(backupRoot, previousRoot);
  }
} catch (error) {
  if (await exists(backupRoot)) {
    await rm(previewRoot, { recursive: true, force: true });
    await rename(backupRoot, previewRoot);
  }
  await rm(stagingRoot, { recursive: true, force: true });
  throw error;
}

console.log(`本機預覽已同步：${previewRoot}`);
if (await exists(previousRoot)) {
  console.log(`上一份本機預覽已保留：${previousRoot}`);
}
