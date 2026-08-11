import { access, mkdir, realpath } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertPublishCheckout,
  expectedRemote,
  resolvePublishPaths,
} from "./github-publish-config.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { outputsRoot, publishRoot } = resolvePublishPaths(projectRoot);

async function exists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
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
  await assertPublishCheckout(projectRoot);
  console.log(`發布 checkout 已存在且設定正確：${publishRoot}`);
} else {
  execFileSync(
    "git",
    ["clone", "--branch", "main", "--single-branch", expectedRemote, publishRoot],
    { cwd: projectRoot, stdio: "inherit" },
  );
  await assertPublishCheckout(projectRoot);
  console.log(`已建立獨立發布 checkout：${publishRoot}`);
}

console.log("本機主專案的 Git remote 未被修改。");
