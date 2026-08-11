import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  createSourceFingerprint,
  requiredSourceFiles,
} from "./site-files.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewRoot = path.join(projectRoot, "outputs", "china-stability-site");
const sourceOnly = process.argv.includes("--source");

async function fileExists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

const missingRequiredFiles = [];
for (const file of requiredSourceFiles) {
  if (!(await fileExists(path.join(projectRoot, file)))) {
    missingRequiredFiles.push(file);
  }
}

if (missingRequiredFiles.length) {
  throw new Error(`缺少網站必要檔案：${missingRequiredFiles.join(", ")}`);
}

const html = await readFile(path.join(projectRoot, "index.html"), "utf8");
const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

if (duplicateIds.length) {
  throw new Error(`index.html 出現重複 id：${duplicateIds.join(", ")}`);
}

const localReferences = [
  ...html.matchAll(/\s(?:src|href)=["']([^"']+)["']/g),
].map((match) => match[1]);

const missingReferences = [];
for (const reference of localReferences) {
  if (
    !reference ||
    reference.startsWith("#") ||
    reference.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(reference)
  ) {
    continue;
  }

  const cleanReference = reference.split(/[?#]/, 1)[0].replace(/^\/+/, "");
  if (cleanReference && !(await fileExists(path.join(projectRoot, cleanReference)))) {
    missingReferences.push(cleanReference);
  }
}

if (missingReferences.length) {
  throw new Error(`index.html 引用了不存在的檔案：${[...new Set(missingReferences)].join(", ")}`);
}

for (const requiredMeta of [
  'property="og:image" content="public/social-share.png"',
  'name="twitter:image" content="public/social-share.png"',
  'href="public/favicon.ico"',
]) {
  if (!html.includes(requiredMeta)) {
    throw new Error(`缺少必要的分享或圖示標記：${requiredMeta}`);
  }
}

const socialImage = await readFile(path.join(projectRoot, "public", "social-share.png"));
const pngSignature = "89504e470d0a1a0a";
if (socialImage.subarray(0, 8).toString("hex") !== pngSignature) {
  throw new Error("public/social-share.png 不是有效的 PNG。");
}

const socialWidth = socialImage.readUInt32BE(16);
const socialHeight = socialImage.readUInt32BE(20);
if (socialWidth !== 1200 || socialHeight !== 630) {
  throw new Error(`社群分享縮圖必須是 1200×630，目前為 ${socialWidth}×${socialHeight}。`);
}

const favicon = await readFile(path.join(projectRoot, "public", "favicon.ico"));
if (
  favicon.length < 22 ||
  favicon.readUInt16LE(0) !== 0 ||
  favicon.readUInt16LE(2) !== 1 ||
  favicon.readUInt16LE(4) < 1
) {
  throw new Error("public/favicon.ico 不是有效的 ICO。");
}

if (!sourceOnly) {
  const manifestPath = path.join(previewRoot, "LOCAL_PREVIEW.json");
  if (!(await fileExists(manifestPath))) {
    throw new Error("尚未產生本機預覽，請先執行 npm run site:update。");
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const sourceFingerprint = await createSourceFingerprint(projectRoot);
  const previewFingerprint = await createSourceFingerprint(previewRoot);

  if (
    sourceFingerprint !== previewFingerprint ||
    manifest.sourceFingerprint !== sourceFingerprint
  ) {
    throw new Error("本機預覽不是最新版本，請執行 npm run site:update。");
  }
}

console.log(
  sourceOnly
    ? "原始版檢查完成：檔案、連結、分享圖與 favicon 均有效。"
    : "網站檢查完成：Git 原始版與本機預覽版內容一致。",
);
