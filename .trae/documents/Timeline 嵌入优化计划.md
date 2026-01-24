# Timeline 嵌入优化计划

理解了，当前的时间轴是 `fixed` 定位在整个浏览器窗口的最右侧，这导致它在视觉上和 Chat Panel 分离了（特别是右侧还有 Studio 面板的时候）。我们需要将它**“移入”**到 Chat Panel 内部，使其看起来像是 Chat Panel 自带的增强滚动条。

## 1. 核心变更思路
*   **DOM 注入位置变更**：
    *   **旧方案**：`document.body.appendChild(bar)` (全局注入)
    *   **新方案**：`chatPanelContainer.appendChild(bar)` (局部注入)
    *   我们将把 `.nlm-timeline-bar` 直接插入到 `.chat-panel-content` 的父容器（或者同级容器）中，使其跟随 Chat Panel 的位置和大小。
*   **CSS 定位策略变更**：
    *   **旧方案**：`position: fixed; right: 12px;`
    *   **新方案**：`position: absolute; right: 10px; top: 0; height: 100%;`
    *   前提是 Chat Panel 的父容器必须有 `position: relative`。我们会动态给父容器添加这个属性。

## 2. 详细实施步骤

### Phase 1: DOM 注入逻辑重构 (`timeline.js`)
1.  **查找注入点**：找到 `.chat-panel-content` 的父元素（通常是负责布局的 Wrapper）。
2.  **设置相对定位**：给这个父元素设置 `position: relative`，为时间轴的 `absolute` 定位提供锚点。
3.  **注入 UI**：将 `.nlm-timeline-bar` append 到这个父元素中，而不是 `body`。
4.  **调整观察者**：继续使用 `MutationObserver`，但确保在 Chat Panel 重新渲染（例如切换 Notebook）时，时间轴能重新挂载。

### Phase 2: 样式调整 (`styles.css`)
1.  **移除 Fixed**：将 `.nlm-timeline-bar` 改为 `position: absolute`。
2.  **高度自适应**：设置 `height: 100%`，让它自动填满 Chat Panel 的高度。
3.  **微调边距**：根据 Chat Panel 的实际内边距，微调 `right` 和 `top` 的值，确保它紧贴着 Chat Panel 的右边缘，但不会遮挡关闭按钮或输入框。

### Phase 3: 验证与清理
1.  **清理旧元素**：如果页面上还残留着旧的 `fixed` 时间轴，脚本需要能自动识别并移除。
2.  **滚动测试**：确保在 Chat Panel 内部滚动时，时间轴能正确同步，且不会随整个页面（如果有的话）滚动。

---

**确认后，我将立即修改代码，将时间轴“搬家”到 Chat Panel 内部。**