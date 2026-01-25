是的，您说得对。

**确认保留的交互细节：**
1.  **三角形标志**: 时间轴上的锚点仍然是**指向左侧的小三角形**，这不仅符合我们的设计语言，也是 Voyager 风格的标志性特征（我们在 v2.1.19 中已经实现了这一点）。
2.  **50 字气泡**: 鼠标悬停时的 Tooltip 预览仍然保持**最多显示 50 个字**（约 3 行）的截断逻辑，超出部分显示省略号，保持界面整洁。

这次调整**只改变“Timeline 条本身挂载在哪里”**（从被裁剪的子容器移到 Body），**完全不影响**上面这两个核心的视觉和交互体验。它们会原封不动地保留下来。

### 修正后的实施计划 (v3.0.0.9)

1.  **位置迁移 (Re-parenting)**:
    *   将 Timeline DOM 元素直接 append 到 `document.body`。
    *   保留 `infinite-scroller` 作为滚动**监听对象**和**位置参考对象**。

2.  **动态定位 (Dynamic Positioning)**:
    *   在 `recalculateMarkers` 和 `ResizeObserver` 中，增加一步：获取 `infinite-scroller` 的 `getBoundingClientRect`。
    *   将 Timeline 的 `top`, `height`, `right` 样式设置为与 `infinite-scroller` 视觉重合（叠加在右侧滚动条区域）。

3.  **样式保留**:
    *   保留 `.nlm-timeline-dot` 的三角形 CSS 样式。
    *   保留 Tooltip 的文本截断逻辑 (`substring(0, 50) + '...'`)。

这样既能解决“看不见”的问题，又能原汁原味地保留我们精心设计的交互。