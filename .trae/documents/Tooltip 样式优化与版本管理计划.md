# Tooltip 样式优化与版本管理计划

非常抱歉，我忽略了版本号更新和“方便回复”机制。关于 Tooltip 的视觉问题，我也注意到了它现在可能过于狭窄，导致文字垂直堆叠，观感不佳。

## 1. Tooltip 视觉优化
目前的 Tooltip 样式可能受限于 `max-width: 200px` 且内容过多，导致像“春联”一样垂直显示。
*   **宽度调整**：将 `max-width` 增加到 `300px` 或 `280px`，让文字有更多横向伸展空间。
*   **字数截断**：目前的截断逻辑是“50字符”，对于中文来说可能还是有点多。我们将：
    *   保留 50 字的截取逻辑，但确保如果截断，末尾添加 `...`。
    *   利用 CSS `line-clamp` 限制显示行数（例如最多 3 行），多余部分用省略号表示，确保 Tooltip 高度可控。
    *   增加 `white-space: normal` 确保正常换行。

## 2. 版本管理与保障 (Version Control)
*   **版本升级**：`manifest.json` 升级至 **2.1.19**。
*   **Changelog 更新**：记录本次关于 Tooltip 样式优化和 Timeline 形状变更的内容。
*   **Git 快照**：提交代码，确保可回滚。

## 3. 实施步骤

### Phase 1: 样式修正 (`styles.css`)
1.  修改 `.nlm-timeline-tooltip`：
    *   `max-width`: 从 `200px` -> `280px`。
    *   增加多行省略号支持：
        ```css
        display: -webkit-box;
        -webkit-line-clamp: 3; /* 最多显示3行 */
        -webkit-box-orient: vertical;
        overflow: hidden;
        ```
    *   微调 `padding` 和 `font-size` 提升可读性。

### Phase 2: 逻辑微调 (`timeline.js`)
1.  检查 `showTooltip` 中的文本截取逻辑，确保 `...` 添加正确。
2.  (可选) 如果 CSS `line-clamp` 生效，JS 里的 50 字截断可以作为一种“数据清洗”的兜底，防止传输过大数据。

### Phase 3: 发布准备
1.  修改 `manifest.json` 版本号。
2.  更新 `CHANGELOG.md`。
3.  执行 Git 提交。

---

**确认后，我将立即执行优化并完成版本发布流程。**