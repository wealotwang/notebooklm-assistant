# 单条数据 Checkbox 双向同步终极修复方案 (v2.1.17)

感谢你提供了极其关键的日志：
`[Sync] Visible files on page: []`

这揭示了问题的**真正核心**：
尽管页面上明明有文件（你甚至点击了它们），但插件的 `extractFileNameFromRow` 在遍历页面时，**居然一个文件名都没提取出来**（返回了空数组 `[]`）。

这说明：
1.  **查找逻辑失效**：`document.querySelectorAll('.row, div[role="row"]')` 这个选择器可能在某些情况下失效了（比如 NotebookLM 改版了 DOM，或者这些元素在 Shadow DOM 里）。
2.  **提取逻辑失效**：即使找到了行，`extractFileName` 也没能从中拿回正确的文件名。

怪不得怎么匹配都失败，因为插件在反向查找时，眼里根本就是“空”的！

## 修复计划：重构 DOM 遍历与文件名提取

### 1. 扩大行元素查找范围 (DOM Traversal)
既然 `.row` 找不到，我们需要更激进地查找。
*   **行动**：不仅仅查找 `.row`，还要查找所有包含 Checkbox 的容器。
*   **新策略**：遍历所有 `input[type="checkbox"]`，然后向上查找其父容器，直到找到包含文件名的容器。

### 2. 增强文件名提取 (Extraction)
*   **行动**：针对每个 Checkbox 的上下文，重新审视文件名提取逻辑。
*   **新策略**：
    *   直接查找 Checkbox 的 `aria-label`（通常是 "Select [Filename]"）。
    *   查找 Checkbox 旁边的文本节点。
    *   查找 `.source-title` 类名（之前有用到，但可能层级变了）。

### 3. 实时 Log 验证
*   **行动**：在 `syncSingleFileToNative` 中，增加对“找到的所有 Checkbox”的 Log，看看究竟找到了什么，以及它们的 `aria-label` 是什么。

## 执行步骤
1.  **重写 `syncSingleFileToNative` 的遍历逻辑**：不再依赖 `.row` 选择器，改为遍历 `input[type="checkbox"]`。
2.  **重写 `isNativeSelected` 的遍历逻辑**：保持一致。
3.  **提交 v2.1.17**。

准备好后，我将立即开始代码修改。这是最后的攻坚战！