好的，这非常奇怪。既然 v3.0.0.7 (模拟 v3.0.0.2) 也不行，那说明可能我在“合并文件”的过程中引入了什么干扰，或者 v3.0.0.2 当时生效本身就是偶然。

既然您明确要求**回滚到 v3.0.0.3**（这是我们修复了 ID 捕获、Dark Mode 和 UI 位置的版本，也是 Timeline 第一次作为独立文件存在的版本），那么我们就**严格执行回滚**。

### 回滚计划 (Target: v3.0.0.3 State)

1.  **恢复双文件结构**:
    *   将 `content_gemini.js` 中的 Timeline 逻辑**剥离**出来。
    *   重建 `timeline_gemini.js` 文件，内容严格还原为 v3.0.0.3 的状态（基于我之前的记录和您提供的代码片段）。

2.  **Manifest 还原**:
    *   修改 `manifest.json`，重新把 `timeline_gemini.js` 加回 `content_scripts` 列表。

3.  **NotebookLM 保护**:
    *   这些修改仅限于 Gemini 相关的配置和文件，**绝不触碰** `content_notebooklm.js` 或 `timeline.js`，确保 NotebookLM 功能不受任何影响。

我将立即开始操作，将 Gemini 模块的时间轴部分“时光倒流”回 v3.0.0.3。