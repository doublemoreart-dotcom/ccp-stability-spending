import { access, readFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createSourceFingerprint } from "./site-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputsRoot = path.join(projectRoot, "outputs");
const previewRoot = path.join(outputsRoot, "china-stability-site");
const previousRoot = path.join(outputsRoot, "china-stability-site-previous");
const swapRoot = path.join(outputsRoot, `.china-stability-site-rollback-${process.pid}`);

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(previewRoot))) {
  throw new Error("找不到目前的本機預覽，請先執行 npm run site:update。");
}

if (!(await exists(previousRoot))) {
  throw new Error("尚未保留上一份本機預覽；至少完成兩次 npm run site:update 後才能切換。");
}

await createSourceFingerprint(previewRoot);
await createSourceFingerprint(previousRoot);
await rm(swapRoot, { recursive: true, force: true });

let previousMoved = false;
try {
  await rename(previewRoot, swapRoot);
  await rename(previousRoot, previewRoot);
  previousMoved = true;
  await rename(swapRoot, previousRoot);
} catch (error) {
  if (previousMoved && (await exists(previewRoot)) && !(await exists(previousRoot))) {
    await rename(previewRoot, previousRoot);
  }
  if ((await exists(swapRoot)) && !(await exists(previewRoot))) {
    await rename(swapRoot, previewRoot);
  }
  throw error;
}

let restoredVersion = "上一份本機預覽";
try {
  const manifest = JSON.parse(
    await readFile(path.join(previewRoot, "LOCAL_PREVIEW.json"), "utf8"),
  );
  restoredVersion = `${manifest.revision}${manifest.dirty ? "（含未提交修改）" : ""}`;
} catch {
  // Manifest is informational; a valid preview can still be restored without it.
}

console.log(`已切換至上一份本機預覽：${restoredVersion}`);
console.log("如要返回剛才的預覽，可再次執行 npm run local:rollback。");
console.log("如要重新套用目前原始檔，請執行 npm run site:update。");
