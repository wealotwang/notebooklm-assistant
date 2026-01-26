# 终极防抖：切断 DOM 监听的“无限续杯”

## 1. 问题根源 (Root Cause)
Log 和代码分析显示，我们的 `MutationObserver` 逻辑存在严重漏洞，导致任何微小的 DOM 变动都会触发全量重绘。
*   **罪魁祸首**: `const hasRows = getAllSourceRows().length > 0; if (shouldUpdateTags || hasRows) ...`
*   **逻辑漏洞**: 只要页面上有 Source（`hasRows` 为真），**任何**未被过滤的 DOM 变动（例如 Checkbox 状态改变引发的 Ripple 动画、Class 变化）都会进入 `if` 分支，触发 `showDetailView`。
*   **后果**: `showDetailView` 会销毁并重建所有 Checkbox -> 触发 View 的初始化同步 -> 再次触发原生事件（可能）-> 再次触发 Observer... 即使不触发原生事件，光是重建 DOM 就足以导致视觉上的“频闪”和性能崩溃。

## 2. 解决方案
我们需要对 `startObserver` 进行外科手术式的精准改造。

### 策略：按需更新 (On-Demand Updates)
1.  **移除 `hasRows` 触发条件**: 只有当明确检测到需要更新的信号（`shouldUpdateTags` 或 `shouldRefreshDetailView`）时，才执行更新逻辑。
2.  **分离关注点**:
    *   **Tags 更新**: 仅在 `addedNodes`（有新元素）或特定结构变化时触发。
    *   **Detail View 刷新**: 仅在 `removedNodes` 包含 Row（源文件被删除）时触发。**这是解决“幽灵文件”的关键，同时避免了全选时的误伤。**
3.  **防抖优化**: 保持现有的 debounce 逻辑，但触发门槛变高了。

## 3. 执行计划
1.  修改 `content_notebooklm.js` 的 `startObserver`：
    *   增加 `shouldRefreshDetailView` 标志位。
    *   遍历 `mutations` 时，检查 `removedNodes` 是否包含 `.row` 或 `.single-source-container`，如果是，置位 `shouldRefreshDetailView`。
    *   删除 `const hasRows = ...` 的无条件触发逻辑。
    *   在回调中，只有 `shouldRefreshDetailView` 为真时，才调用 `showDetailView`。
2.  更新版本号至 `3.0.0.15`。

此修复将确保：
*   **全选时**: 只有 Checkbox 状态变化（由 Event Listener 处理），没有 DOM 重绘，**零频闪**。
*   **删除文件时**: 检测到 Row 移除，触发 Detail View 刷新，**无幽灵文件**。
