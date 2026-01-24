# Tooltip 尺寸与自适应优化计划

理解了，目前的“固定宽度”导致短文字显示过宽，而“固定高度”又导致长文字显示不全。我们需要一个**既能自适应短内容，又能优雅展示长内容**的智能气泡。

## 1. 核心需求解析
*   **自适应宽度 (Fit Content)**: 如果文字很少（少于25字），气泡宽度应该“刚刚好”包裹文字，不要留白。
*   **最大宽度限制 (Max Width)**: 如果文字很多，宽度最多延伸到能容纳约25个汉字的程度，然后强制换行。
*   **总字数限制 (Total Limit)**: 内容最多显示50个字，超过部分用 `...` 截断。
*   **行数限制**: 配合宽度，最多显示2-3行（视25字换行后的高度而定）。

## 2. 技术方案

### A. CSS 策略 (`styles.css`)
*   **移除固定宽度**: 删掉 `width: 300px` 或 `width: 100%`。
*   **使用 `max-width`**: 设置 `max-width: 400px` (大约是 25个汉字 * 14px字体 + padding)。
    *   *计算*: 14px 字体 * 25 字 ≈ 350px，加上 padding 左右各 12px，约 380px~400px。
*   **保留 `min-width`**: 设置 `min-width: auto` 或给一个小值（如 60px），确保极短文字（如“你好”）也能正常显示。
*   **换行逻辑**: `white-space: normal` (允许换行) + `word-break: break-word` (防止长单词溢出)。

### B. JS 逻辑 (`timeline.js`)
*   **截断逻辑**: 保持 JS 层面的 50 字截断。
    *   `text.substring(0, 50) + '...'`
    *   这样可以减轻 CSS `line-clamp` 的负担，且兼容性更好。

### C. 版本管理
*   **版本号**: 升级至 `2.1.20`。
*   **Changelog**: 记录 Tooltip 自适应宽度的优化。

## 3. 实施步骤

### Phase 1: CSS 改造
修改 `.nlm-timeline-tooltip`:
1.  `max-width`: `400px` (支持单行约25字)。
2.  `width`: `max-content` (关键！让宽度跟随内容自适应)。
    *   *注意*: 为了防止 `max-content` 导致单行过长，需配合 `max-width` 使用。
3.  `white-space`: `pre-wrap` 或 `normal`，确保换行。

### Phase 2: JS 验证
1.  确认 `timeline.js` 中的 50 字截断逻辑是否需要调整（目前看 50 字正好对应 2 行满 + 第 3 行开头，符合预期）。

### Phase 3: 发布
1.  修改 `manifest.json` -> `2.1.20`.
2.  更新 `CHANGELOG.md`.
3.  Git Commit.

---

**确认后，我将立即调整 CSS，让 Tooltip 变得“能屈能伸”。**