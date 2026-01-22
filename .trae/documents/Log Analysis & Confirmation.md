# Checkbox 双向同步问题深度修复方案

感谢你提供的详细日志和测试反馈。你指出的 4 个问题非常精准，揭示了当前同步逻辑中缺失的环节。

## 问题根源分析
1.  **文件夹单选 -> 原生无反应 (问题 2)**：
    *   **原因**：`showDetailView` 中的事件监听器虽然更新了全选框状态，并调用了 `syncNativeSelectionFromView`，但 `syncNativeSelectionFromView` 目前只做了“强制同步”（即如果状态不一致就点击），这在某些情况下可能被浏览器或框架的事件循环阻断，或者因为触发频率过高被去抖动（Debounce）逻辑吞掉。更重要的是，我们可能没有正确触发 Angular 的 Change Detection。

2.  **原生单选 -> 文件夹无反应 (问题 3)**：
    *   **原因**：虽然日志显示 `[Sync] Updated View Checkbox ... to false`，但这可能只是逻辑上的更新。如果 DOM 元素被重新渲染了（例如 React/Angular 列表刷新），我们持有的旧 DOM 引用可能失效了。或者，`syncViewFromNative` 的触发时机（50ms 去抖动）可能在 DOM 还没完全稳定时就执行了。

3.  **加载时不同步 (问题 4)**：
    *   **原因**：`showDetailView` 在初始化时，虽然渲染了列表，但没有立即执行一次“从原生到视图”的同步检查。它默认渲染的是 `unchecked` 状态，除非显式调用同步。

## 修复与优化计划

### 1. 修复“文件夹单选 -> 原生” (View -> Native)
*   **行动**：在 `showDetailView` 的 `change` 事件监听中，不仅要更新全选框，还要**立即、显式**地找到对应的原生 Checkbox 并点击它。
*   **优化**：不再完全依赖 `syncNativeSelectionFromView` 的全量扫描，而是针对单个点击事件进行**点对点**的同步操作，提高响应速度和准确性。

### 2. 修复“原生单选 -> 文件夹” (Native -> View)
*   **行动**：优化 `syncViewFromNative`。
    *   增加**重试机制**：如果第一次同步没找到对应的 View 元素（可能正在渲染），在 100ms 后再试一次。
    *   **强制重绘**：确保在修改 `cb.checked` 后，视图能正确反映状态。

### 3. 修复“加载时不同步” (Init Sync)
*   **行动**：在 `showDetailView` 函数的末尾（渲染完 HTML 后），**立即调用一次 `syncViewFromNative()`**。
*   **效果**：确保每次打开文件夹，看到的勾选状态都是从原生列表新鲜获取的。

### 4. 解决“全选”逻辑冲突
*   **行动**：在 `syncViewFromNative` 中，如果发现原生的“Select all sources”被选中，强制将插件视图的所有 Checkbox 设为 `checked`，并禁用（或置灰）它们，或者保持可点击但立即触发原生反选。逻辑上优先遵循原生的全选状态。

## 执行步骤
1.  修改 `showDetailView`：添加初始化同步，优化点击事件处理。
2.  优化 `syncNativeSelectionFromView`：确保点击事件能穿透 Angular 的封装。
3.  验证修复：逐一测试你提出的 4 个场景。

准备好后，我将开始代码修改。