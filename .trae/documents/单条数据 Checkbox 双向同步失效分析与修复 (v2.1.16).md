# 单条数据 Checkbox 双向同步失效分析与修复 (v2.1.16)

从日志和截图来看，问题非常明确：
1.  **View -> Native 失效**：你点击了文件夹里的文件（`[View Action] User clicked ... to true`），但是随后的日志显示 `[Sync] Warning: Native row not found for "..."`。
    *   **根源**：插件找不到对应的原生 DOM 行 (`.row` 或 `div[role="row"]`)。这可能是因为你的文件名太长被截断，或者原生列表的结构在某些情况下发生了变化（比如被折叠、被搜索结果替换、或者虚拟滚动导致 DOM 还没渲染）。
    *   **证据**：日志里连续的 `[Sync] Warning: Native row not found` 证实了这一点。如果找不到原生 Checkbox，当然就无法模拟点击去同步状态了。

2.  **Native -> View 失效**：你点击了原生的 Checkbox，日志显示 `[DOM Watch]` 捕获到了变化，但是紧接着又是一堆 `[Sync] Warning: Native row not found`，并没有触发 `[Fast Sync]` 更新 View。
    *   **根源**：同样的，插件在反向查找时，也无法通过文件名匹配回原生行，导致无法确认状态。

## 修复计划：增强文件名匹配与查找鲁棒性

### 1. 模糊匹配 (Fuzzy Matching)
既然精确的全名匹配失败（可能是因为空格、特殊字符或截断），我们需要引入更智能的匹配机制。
*   **行动**：修改 `isNativeSelected` 和 `syncSingleFileToNative` 中的查找逻辑。
*   **策略**：如果精确匹配失败，尝试“包含匹配”或“去除非法字符后匹配”。只要 View 中的文件名包含了原生行提取出的文件名（或者反之），就认为是同一行。

### 2. 优化 `extractFileNameFromRow`
*   **行动**：检查 `extractFileNameFromRow` 是否在某些情况下返回了 `null` 或者不完整的名字。
*   **调试**：在 `Warning: Native row not found` 的日志里，打印出当前页面上所有能提取到的文件名，看看为什么对不上。

### 3. 处理 DOM 结构变异
*   **行动**：针对 `Warning` 的情况，增加更激进的查找策略。比如直接搜索包含特定文本的 `div`，而不仅仅局限于 `.row` 结构。

## 执行步骤
1.  **增强 Log**：在 `Warning` 时输出当前页面上找到的所有文件名列表，方便我们（和你）确认是哪里不匹配。
2.  **放宽匹配规则**：在 `content.js` 中引入宽松匹配逻辑。
3.  **提交 v2.1.16**。

准备好后，我将修改代码。