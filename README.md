# 中國維穩成本觀察（網站試作版）

以資料新聞與長篇敘事形式，拆解中國維穩體系的成本、資金來源、權力運作及不同媒體視角。

## 入口

直接開啟根目錄的 `index.html` 即可閱讀。網站使用原生 HTML、CSS 與 JavaScript，不需要安裝前端套件。

日常檢視建議開啟 `outputs/china-stability-site/index.html`。這是由原始檔產生的本機預覽副本，不納入 Git。

若要透過本機伺服器預覽：

```bash
python3 -m http.server 4173
```

然後開啟 `http://localhost:4173/`。

## 原始版、本機版與發布版

網站採三層分離，避免預覽產物、編輯環境與公開 Repo 混在一起：

- **專案原始版**：本專案根目錄。所有正式修改都在這一層完成；不替這個本機主專案設定公開網站的 `origin`。
- **本機預覽版**：`outputs/china-stability-site/`。由同步指令重新產生，整個 `outputs/` 已列入 `.gitignore`，不會被 commit 或 push。
- **Git 發布版**：`outputs/ccp-stability-spending-publish/`。這是 [公開 Repo](https://github.com/doublemoreart-dotcom/ccp-stability-spending) 的獨立 checkout，有自己的 `.git`、歷史與 `origin`，同樣被本機主專案忽略。

這三層都位於本專案內，但只有發布 checkout 連到公開 Repo。跨專案的檔案、設定與 Git 歷史不會被帶入。

## 日常更新流程

所有正式修改都只需在根目錄完成。修改後執行一個指令：

```bash
npm run site:update
```

這個指令會依序：

1. 確認 Git 原始版與 `outputs/` 預覽版仍正確分離。
2. 檢查 JavaScript 語法、Git diff、必要素材與 HTML 內部連結。
3. 先在暫存目錄建立完整預覽，確認內容一致後才一次替換舊預覽。
4. 記錄 Git revision、是否含未提交修改及內容指紋。
5. 再次確認原始版與預覽版完全一致。

完成後重新整理：

`outputs/china-stability-site/index.html`

若任何一步失敗，原本可閱讀的預覽會被保留，不會先遭刪除。

每次成功更新後，上一份本機預覽會保留在 `outputs/china-stability-site-previous/`。若新版雖通過檢查，但實際閱讀後仍想回看上一版，可執行：

```bash
npm run local:rollback
```

這個指令會交換目前與上一份預覽，因此再次執行即可切回。若要放棄回復結果、重新套用根目錄的最新原始檔，執行 `npm run site:update` 即可。本機回復只影響已被 Git 忽略的 `outputs/`，不會改動、還原或覆蓋 Git 原始版。

## 提交或推送前檢查

準備交給 Git 前執行：

```bash
npm run site:preflight
```

這個指令會先完成一次日常更新，再確認：

1. 網站原始版與本機預覽版仍正確分離。
2. HTML、JavaScript、內部連結、分享縮圖與 favicon 均有效。
3. `index.html`、`styles.css`、`script.js`、`assets/`、`public/` 與更新工具都已納入 Git。
4. 本機預覽內容指紋與原始版一致。
5. 顯示已暫存、未暫存與未追蹤檔案數量，方便提交前確認。

此檢查不會自行執行 `git add`、commit 或 push。若必要素材尚未納入 Git，指令會列出完整檔名並停止，避免線上版本缺圖或缺少互動程式。

## Git 發布流程

第一次使用時建立獨立發布 checkout：

```bash
npm run publish:init
```

日後每次準備發布時：

```bash
npm run publish:prepare
```

`publish:prepare` 會先完成本機預檢，再以白名單把公開網站需要的檔案同步到獨立 checkout，並驗證 Repo、`main` 分支、頁面語法與待發布差異。像 `public/` 內屬於開發樣板、但未被本網站使用的檔案不會帶入。若 checkout 原本已有未提交變更，流程會停止，不會覆寫。

同步完成後，進入以下目錄審閱：

```bash
cd outputs/ccp-stability-spending-publish
git status --short
git diff --check
git diff
```

確認後才自行執行 `git add`、commit 與 push。更新腳本不會自動發布，也不會修改本機主專案的 remote。

若已推送的版本需要退回，請在發布 checkout 對對應 commit 執行 `git revert <commit>`，再推送新產生的還原 commit；這會保留完整發布歷史。尚未 commit 的同步結果則可在發布 checkout 內先檢查狀態，再個別還原，避免影響本機原始版與預覽版。

### 個別指令

只想檢查、不更新預覽時：

```bash
npm run site:check
```

只想重新產生預覽、不執行完整檢查時：

```bash
npm run local:sync
```

切換至上一份本機預覽時：

```bash
npm run local:rollback
```

只檢查 Git 與預覽版本邊界時：

```bash
npm run version:check
```

請勿直接修改 `outputs/` 內的檔案，因為下一次同步時會重新產生。本機預覽中的 `LOCAL_PREVIEW.json` 會記錄同步時間與來源 Git 版本，方便辨識目前看到的副本。

## 主要檔案

- `index.html`：網站內容與語意結構
- `styles.css`：桌機、平板與手機版視覺
- `script.js`：估算情境、手機選單及閱讀動效
- `assets/fonts/`：SN Pro 可變字型與 OFL 授權；中文 M PLUS 1 由 Google Fonts 載入
- `assets/icons/`：Heroicons 24px outline SVG 與 MIT 授權
- `assets/images/hero-main.webp`：首頁概念主視覺（AI 生成，非紀實照片）
- 首頁三張摘要卡片可直接跳至資金、體系與外部視角章節
- 資金章節以「上游資源 → 財政匯流 → 下游治理」垂直流程呈現
- 四張媒體視角卡片可開啟詳細資料 popup，支援鍵盤與 Esc 關閉
- 體系章節加入制度轉譯插圖、六階段圖示及可點擊詳情 popup
- 成本章節加入九模組估算計算機、壓力係數與跨章節導覽

## 版本拆分

1. `chore: initialize site scaffold`：建立專案及託管骨架
2. `feat: add editorial site structure and content`：加入專題資訊架構與內容
3. `feat: add responsive interactions and motion`：加入互動與響應式行為
4. `fix: finalize static entry and accessibility`：瀏覽器驗證與可及性修正

## 資料聲明

目前頁面是版面與敘事方向的試作。成本數字沿用前期對話中的模型假設，尚未完成逐項資料查證，不應視為官方統計或確定事實。
