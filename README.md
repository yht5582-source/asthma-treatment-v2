# 氣喘臨床決策工具 v2 · Asthma Clinical Decision Aid

依 **GINA 2026 Summary Guide for Asthma Management and Prevention** 整理的單頁互動工具，供**醫療專業人員**臨床參考。內容已與原始 PDF **逐項核對**。

介面為繁體中文，關鍵術語附英文。零相依、純靜態 HTML，開啟即用。

**線上版：** https://yht5582-source.github.io/asthma-treatment-v2/

> v2 由 [asthma-treatment](https://github.com/yht5582-source/asthma-treatment)（v1）延伸，主要改寫「治療階梯」分頁，呈現方式參考 [asthma](https://yht5582-source.github.io/asthma/) 的治療階梯推導。v1 保持不變。

## v2 更新：治療階梯分頁

- **左輸入、右結果**：左邊輸入年齡層（≥18／12–17／6–11／≤5）、初診或治療中、症狀、控制四題、過去 12 個月發作次數、FEV₁、穩定月數、升階前必查、風險因子；右邊固定顯示結果。
- **結果卡**：大字 STEP、1–5 階梯條（虛框為原階梯）、判斷依據、提醒（降階做法、換 Track、風險因子）。
- **處方卡**：Track 1 與 Track 2 並列，含維持／緩解藥與 Table 7 劑量範例；Track 2 區分「ICS-SABA 複方」與「只有 SABA」兩種緩解藥（Figure 7A／7B）。6–11 歲列出 Figure 8 的首選與其他選項。Step 5 依年齡列出可用的 LAMA 與生物製劑。
- **階梯總覽**：Track 1／Track 2 畫成階梯，標出「建議」與「目前」位置，另一條 Track 的同階選項也會標示；點任一格即可設為目前階梯。初始治療表（Table 3／4）會標出對應的列。
- **規則**：成人／青少年控制良好 2–3 個月可降階、6–11 歲 3 個月（p.27、p.30）；控制良好但有發作改為「考慮升階或同階換藥」，不自動升階；兒童 Step 1 升階依原用藥（需要時 ICS-formoterol → 低劑量 MART）；Track 1 不計 SABA 那一題（Table 2A）。
- **決策精靈**的「調整維持治療」改用同一套規則，結果頁可一鍵帶入治療階梯分頁。
- 可複製病歷摘要、列印。
- 推導規則集中在 `index.html` 的 `/*ENGINE-START*/ … /*ENGINE-END*/`，以 `node tests.cjs` 測試（62 項）。

---

## 功能

### 逐步決策精靈（主要功能）

選擇臨床情境後，依 GINA 2026 對應流程逐題作答，最後輸出結構化建議。三條路徑：

| 情境 | 流程 | 輸出 |
|---|---|---|
| **初次診斷評估** | 年齡 → 症狀型態（Table 1.1）→ 客觀檢查數值 | 自動計算 ΔFEV₁（mL、% 基線、% 預測值），逐項比對 Table 1.2 標準，輸出診斷結論與下一步 |
| **調整維持治療** | 年齡 → 控制四題（Table 2A）→ 風險因子（Table 2B.1）→ 目前 Step／Track | 控制分級、升階／降階建議、具體處方與劑量、階梯圖高亮。未治療者另依 Table 3／4 給**初始治療建議** |
| **急性發作處置** | 年齡 → Figure 9 徵象勾選 | 四級嚴重度判定、對應處置流程（劑量依成人／兒童切換）、返家條件、出院與追蹤 checklist |

> **注意年齡分界**：GINA 的**診斷**標準以 **18 歲**分界（成人 ≥18 / 兒童 6–17），**治療**階梯以 **12 歲**分界。精靈會依情境自動套用正確的分界。

### 參考分頁

- **診斷** — 定義、Figure 1 流程、支持／反向症狀線索、Table 1.2 完整判讀表（含停藥時間、PEF 變異度算法）、Type 2 生物標記
- **評估與分級** — Table 2A 控制分級（含 SABA 題的適用限制）、Table 2B.1–2B.3 三類風險因子、GINA 2026 的輕度／難治型／重度定義
- **治療階梯** — Track 1 / Track 2 完整階梯、兒童 6–11 歲 Figure 8（含「其他選項」欄）、初始治療 Table 3／4、升降階原則、Step 5 重度氣喘（LAMA 與生物製劑的**精確年齡適應症**）、其他與不建議的治療
- **急性發作** — Figure 9 三級判準表、分級處置與確切劑量、複評與返家條件、出院與追蹤 bundle、行動計畫（依緩解劑類型分列）
- **劑量表** — Table 6（ICS 低／中／高劑量，**逐列照原文**）、Table 7（AIR/MART 吸入器與劑量，依年齡分列）
- **更新與參考** — GINA 2026 變更重點、非藥物處置與 COVID-19、台灣在地補充、參考資料與縮寫表

結果頁支援**列印／存 PDF**。

---

## GINA 2026 主要變更（已納入）

**診斷**

- 診斷流程圖（Figure 1）簡化
- 指出 ERS/ATS 2022 的支氣管擴張劑反應標準（>10% predicted）可能造成**低診斷**；GINA 維持 ≥12% 且 ≥200 mL（成人 FEV₁ **或 FVC**）

**治療**

- **Track 2 Step 1 改為 AIR-only**：需要時低劑量 ICS＋SABA（複方或分開吸入器）— BATURA 研究顯示相較單用 SABA，嚴重發作風險減少近一半
- **兒童 6–11 歲 Step 1 改為 AIR-only**：需要時低劑量 ICS-formoterol 或需要時低劑量 ICS＋SABA — CARE 研究
- Step 5 LAMA 證據更新，新增三合一 budesonide-formoterol-glycopyrronium（≥12 歲）
- 新生物製劑：**depemokimab**（anti-IL5，≥12 歲）、生物相似藥 **omalizumab-igec**

**急性發作**

- 新流程圖，嚴重度統一為**輕度／中度／重度或危及生命**，各級判準明確化
- **ICS-formoterol 新增**為輕度發作的處置選項（budesonide-formoterol 160/4.5 mcg 2 puffs）
- SABA 劑量分級明確化（輕 4 / 中 4–6 / 重 6–10 puffs）
- <18 歲**強烈建議**使用 PRAM 評分

**新評估工具**：CAAT（成人）、Peds-AIRQ（5–11 歲）、PRAM（急性發作）

---

## 檔案結構

```
.
├── index.html                        # 完整工具（單一檔案，內嵌 CSS/JS，無外部相依）
├── tests.cjs                         # 治療階梯 engine 規則測試：node tests.cjs
├── .nojekyll                         # 停用 GitHub Pages 的 Jekyll 處理
└── README.md
```

---

## 使用方式

**線上**：直接開啟 GitHub Pages 網址。

**本機**：

```bash
git clone https://github.com/yht5582-source/asthma-treatment-v2.git
cd asthma-treatment-v2
open index.html          # macOS
# 或 xdg-open index.html  # Linux
```

沒有建置步驟、沒有相依套件、不需要伺服器。所有邏輯在瀏覽器端執行，**不會傳送任何輸入的病人資料**。

---

## 核對狀態

| 內容 | 出處 | 狀態 |
|---|---|---|
| 診斷流程 | Figure 1 | ✅ 已核對原文 |
| 診斷標準（含所有數值與停藥時間） | Table 1 | ✅ 已核對原文 |
| 控制分級與三類風險因子 | Table 2 | ✅ 已核對原文 |
| 嚴重度／難治型定義 | p.13 | ✅ 已核對原文 |
| 初始治療（成人／兒童） | Table 3、Table 4 | ✅ 已核對原文 |
| Track 1 / Track 2 階梯 | Figure 5、6、7 | ✅ 已核對原文 |
| 兒童 6–11 歲階梯 | Figure 8 | ✅ 已核對原文 |
| Step 5 / LAMA / 生物製劑年齡適應症 | p.26 | ✅ 已核對原文 |
| 降階原則 | p.27 | ✅ 已核對原文 |
| 急性發作判準與劑量 | Figure 9、p.35 | ✅ 已核對原文 |
| 行動計畫（依緩解劑分列） | p.33–34 | ✅ 已核對原文 |
| ICS 低／中／高劑量 | Table 6 | ✅ 已核對原文 |
| AIR / MART 劑量 | Table 7 | ✅ 已核對原文 |
| **幼兒 ≤5 歲診斷與治療** | — | ⚠️ **Summary Guide 未涵蓋**，內容取自完整報告，工具內已標註，使用前請核對 GINA 完整報告 |
| **台灣健保給付條件** | — | ⚠️ 未涵蓋，處方前請自行查核（可參考 [asthma](https://yht5582-source.github.io/asthma/) 的健保頁） |
| 其他控制藥選項（≥12 歲各階） | GINA 2026 完整報告 Box 4-6 | ⚠️ Summary Guide 未逐階列出，工具內已標註來源 |

---

## 資料來源

- **Global Initiative for Asthma. _Summary Guide for Asthma Management and Prevention, 2026._** [PDF](https://ginasthma.org/wp-content/uploads/2026/07/GINA-Summary-Guide-2026-WEB-WMS.pdf) ← 主要依據
- GINA. _Global Strategy for Asthma Management and Prevention, 2026 Update._ [PDF](https://ginasthma.org/wp-content/uploads/2026/05/GINA-2026-Strategy-Report-WMS.pdf)
- GINA. _Difficult-to-treat and severe asthma in adolescent and adult patients._ [ginasthma.org](https://ginasthma.org/)
- 台灣胸腔暨重症加護醫學會《台灣成人氣喘診療指引》 [PDF](https://asthma-copd.tw/med-asthma/content/2-%E5%8F%B0%E7%81%A3%E6%88%90%E4%BA%BA%E6%B0%A3%E5%96%98%E8%A8%BA%E7%99%82%E6%8C%87%E5%BC%95.pdf)
- 《兒童氣喘診療指引》 [PDF](https://asthma-copd.tw/med-asthma/content/3.%E5%85%92%E7%AB%A5%E6%B0%A3%E5%96%98%E8%A8%BA%E7%99%82%E6%8C%87%E5%BC%95.pdf)

---

## 免責聲明

本工具為**臨床決策輔助**，供醫療專業人員參考之用。

- **不能**取代個別臨床判斷、完整病史評估與身體檢查
- **不能**取代原始指引全文
- 藥物劑量請於處方前核對 GINA 原文、藥品仿單與當地健保給付規範
- 本工具與 GINA（Global Initiative for Asthma）**無隸屬關係**，亦未經其審閱或背書
- 內容為社群整理，可能存在錯誤或過時之處；發現問題請開 Issue

指引內容版權屬 GINA 及各原始出版單位所有。本儲存庫僅為衛教與臨床參考之整理。

---

*最後核對：2026-08-16 · 依據 GINA 2026 Summary Guide（2026 年 7 月版）；v2 治療階梯分頁 2026-10-10 再核對 Table 3、4、7 與 p.26–30*
