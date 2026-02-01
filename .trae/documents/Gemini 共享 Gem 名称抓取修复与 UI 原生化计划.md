# Gemini 共享 Gem 名称精准抓取修复计划

针对您反馈的“只能抓取到 Gemini”的问题，我分析了 Gemini 的底层数据结构，发现单纯依靠 DOM 渲染可能太慢，导致插件在名称加载前就抓取了默认标题。

## 1. 核心修复：多源名称提取 (Multi-Source Extraction)

我将升级名称提取逻辑，从以下三个维度同步“捕捉”真实名称：

*   **维度 A：原始数据层 (`bard-initial-data`)**
    *   直接解析页面中的脚本标签。那里通常包含了 Gem 的元数据（包括真实标题），比页面渲染快得多。
*   **维度 B：实时渲染层 (Enhanced DOM)**
    *   增加对 `.bot-name-container` 内部文本的持续监听。
    *   **关键词过滤**：如果抓取到的名称是 "Gemini"、"Google Gemini" 或空，则视为“无效抓取”，继续等待真实名称出现。
*   **维度 C：系统标题层 (`document.title`)**
    *   监听浏览器标签页标题的变化。通常 Gem 加载完成后，标签页标题会变为 Gem 的名称。

## 2. 交互增强：自我纠错机制 (Self-Correction)

*   **自动更新**：如果您的侧边栏中已经存在名为 "Gemini" 的收藏项，只要您再次进入该 Gem 页面，插件一旦探测到“医药代表 Kevin”等真实名称，会**立即自动覆盖**旧的脏数据。
*   **SPA 适配**：增加对 URL 变化的实时监听。当您在 Gemini 内部点击不同链接时，插件会立即重新启动名称抓取流程。

## 3. 诊断日志 (Diagnostic Logs)

我将在日志中加入详细的“名称搜寻轨迹”：
*   `[Gemini-Name-Search] Checking script data...`
*   `[Gemini-Name-Search] Found potential name: 医药代表 Kevin`
*   `[Gemini-Name-Search] Successfully updated 'Gemini' -> '医药代表 Kevin'`

## 4. 版本与同步

*   **版本号**：升级至 `3.0.0.20`。
*   **Git 提交**：记录“精准名称提取与自我纠错逻辑”。

**我将立即开始这项修复，确保您下次打开链接时，侧边栏能准确显示“医药代表 Kevin”。**
