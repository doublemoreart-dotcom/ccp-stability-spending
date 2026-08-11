import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertPublishCheckout,
  gitOutput,
  publishCopyEntries,
  publishPackageTemplate,
  publishPublicFiles,
} from "./github-publish-config.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, cwd = projectRoot, capture = false) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

const { publishRoot } = await assertPublishCheckout(projectRoot);

const initialStatus = gitOutput(publishRoot, ["status", "--short", "--untracked-files=all"]);
if (initialStatus) {
  throw new Error(
    `發布 checkout 尚有未處理變更，為避免覆寫已停止同步：\n${initialStatus}\n請先提交、還原或另行備份。`,
  );
}

console.log("1/4 驗證本機原始版與預覽版");
run(process.execPath, ["scripts/preflight-site.mjs"]);

console.log("\n2/4 同步公開網站檔案至獨立發布 checkout");
for (const entry of publishCopyEntries) {
  const target = path.join(publishRoot, entry);
  await rm(target, { recursive: true, force: true });
  await cp(path.join(projectRoot, entry), target, { recursive: true });
}
await rm(path.join(publishRoot, "public"), { recursive: true, force: true });
await mkdir(path.join(publishRoot, "public"), { recursive: true });
for (const file of publishPublicFiles) {
  await cp(path.join(projectRoot, "public", file), path.join(publishRoot, "public", file));
}
await cp(
  path.join(projectRoot, publishPackageTemplate),
  path.join(publishRoot, "package.json"),
);

console.log("3/4 驗證發布內容");
run(process.execPath, ["scripts/check-site.mjs", "--source"], publishRoot);
run("git", ["diff", "--check"], publishRoot);

console.log("\n4/4 顯示待發布差異");
const preparedStatus = gitOutput(publishRoot, ["status", "--short", "--untracked-files=all"]);
console.log(preparedStatus || "  沒有內容差異");
console.log(`\n發布 checkout：${publishRoot}`);
console.log("流程未執行 git add、commit 或 push；請審閱差異後再手動發布。");
