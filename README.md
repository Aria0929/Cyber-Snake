# Cyber Snake 霓虹深淵：貪食蛇小遊戲 🐍⚡

一個以 **Cyberpunk 霓虹美學** 與 **毛玻璃擬態 (Glassmorphism)** 風格打造的網頁版貪食蛇小遊戲。

這是專為前端互動與遊戲邏輯優化設計的獨立作品。專案不依賴任何外部前端框架（如 React/Vue），完全使用原生 **HTML5 Canvas**、**Vanilla CSS** 與 **Vanilla JavaScript** 實作，具備極致的運行效能與視覺微動畫。

---

## 🎮 線上遊玩網址
> 💡 *（部署於 GitHub Pages 後，可在此處填入您的線上遊玩網址，例如：`https://<你的GitHub帳號>.github.io/cyber-snake/`）*

---

## ✨ 專案亮點與技術特色

### 1. 視覺美學與動態回饋 (Premium UI/UX)
- **毛玻璃擬態 (Glassmorphism)**：使用 `backdrop-filter: blur(16px)` 與半透明漸層邊框，打造未來科技感控制面板。
- **霓虹發光特效**：運用 Canvas 的 `shadowBlur` 與 HSL 漸層，讓蛇身與食物呈現迷幻的 Cyber 霓虹發光。
- **動態打擊感**：死亡時觸發**畫面震動 (Screen Shake)**，並將蛇身炸裂成數百個隨機物理軌跡的**粒子爆炸特效 (Particle System)**。

### 2. 雲端資料庫與本地雙模式排行榜 (Cloud Firebase & Offline Fallback)
- **真‧全域即時排行榜**：整合 **Google Firebase Realtime Database**，實現所有玩家在不同電腦/手機上玩，資料均能實時同步至雲端，並利用 WebSockets 技術實現「無重整、實時跳動更新」的全域排行榜。
- **無縫本機降級備用**：當專案未設定 Firebase 金鑰或網路中斷時，系統會自動、無縫地降級為瀏覽器 `LocalStorage` 本機存儲模式，保證核心登入與玩遊戲功能 100% 正常，具備高強健性的網頁設計。
- **帳號最高分獨立記錄**：每個註冊帳號無論在雲端或本地，都會獨立保存其個人歷史最高紀錄。

### 3. 強健的遊戲物理與操控防護 (Logical Robustness)
- **雙重轉向防禦機制 (Double Keypress Prevention)**：為了解決傳統貪食蛇遊戲「極速雙擊鍵導致反向折返自殺」的經典 Bug，本專案首創同時比對「當前移動方向」與「即將踏出方向」的雙重過濾機制，確保操控絕對精確。
- **輸入法相容性**：使用 `KeyboardEvent.code` (物理鍵位代碼) 取代 `e.key`，完全防範中文輸入法（注音/拼音）開啟時造成的按鍵失效。
- **任意鍵啟動**：在 Ready 與 Game Over 狀態下，按 WASD/方向鍵/空白鍵即可直接無縫啟動/重玩遊戲。
- **行動端適配**：響應式佈局在手機等小螢幕會自動調用**虛擬方向鍵**，並全面支援觸控操作。

### 4. 輕量化 Web Audio API 音效合成
- 無須加載任何外部龐大的 MP3 或 WAV 音訊檔案。
- 呼叫瀏覽器底層 **Web Audio API** 的 `OscillatorNode`（振盪器）即時合成 8-bit 懷舊遊戲音效（吃普通食物、金色食物、死亡向下滑音等）。

---

## 🛠️ 本地運行方法

由於本專案為純靜態網頁，您可以直接用瀏覽器打開 `index.html` 進行遊玩。
若需要完整測試 LocalStorage 登入與 Web Audio API（部分瀏覽器因安全性限制，本機檔案載入時可能停用音訊），建議以本地伺服器啟動：

**使用 Python (Mac/Windows/Linux)：**
```bash
python3 -m http.server 8000
```
然後在瀏覽器中輸入：`http://localhost:8000`

---

## 📈 甄試 AI 課程 / 轉職作品集亮點說明（給面試官）
- **扎實的 JavaScript 原生基本功**：不依賴 TailwindCSS、React 等框架，展現從零建構 Canvas 渲染渲染引擎、座標系統、碰撞判定演算法的能力。
- **雲端資料庫整合與 Progressive Enhancement（漸進式增強）設計**：整合 Google Firebase Realtime Database 實作「跨裝置全域即時排行榜」，並設計了無縫的 LocalStorage 本地降級備用機制，展現了強健的雲端架構設計能力。
- **優異的邏輯思維與 Bug 除錯能力**：主動分析並解決「輸入法干擾鍵盤偵測」、「快速雙擊導致折返自殺」等邊緣狀況（Edge Cases），體現嚴謹的程式碼防禦思維。
- **跨領域技術應用**：結合 Web Audio API 硬體音訊合成、HTML5 Canvas 粒子物理模擬、LocalStorage 數據持久化，展現對瀏覽器 Web API 家族的高度掌握能力。
