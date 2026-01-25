非常好，感谢您提供的精准 DOM 截图！

### 问题诊断

1.  **文件夹注入位置**:
    *   您希望将文件夹插入到 **Gems 列表** 和 **Chat History 列表** 之间。
    *   **DOM 分析**: 从您的第一张截图看，目标位置是在 `.gems-list-container` 和 `.chat-history` 之间。
    *   **当前代码问题**: 我之前的代码是试图将文件夹插入到整个侧边栏容器的 *最顶部* (`targetContainer.insertBefore(container, targetContainer.firstChild)` )，这可能导致它被其他绝对定位元素覆盖，或者位置不对。
    *   **修正方案**: 我需要精确找到 `.chat-history` 元素，然后使用 `insertBefore` 将文件夹容器插入到它**之前**。

2.  **滚动条失效**:
    *   **DOM 分析**: 从您的第二张截图看，Gemini 的主要滚动容器是 `infinite-scroller`，它有一个 ID `chat-history-scroll-container` 和 data-testid `chat-history-container`。
    *   **当前代码问题**: 我目前还没把 `timeline.js` 的逻辑适配到 Gemini。NotebookLM 的滚动容器和 Gemini 完全不同，所以现在的代码根本不知道该监听谁的滚动事件。
    *   **修正方案**: 我需要将 `timeline.js` 的逻辑移植过来，并将滚动监听目标锁定为截图中的 `<infinite-scroller>` 或其父级 `<div id="chat-history-scroll-container">`。

### 实施计划

#### Phase 1: 修正侧边栏注入位置
*   **Target Selector**: 寻找 `.chat-history` 或 `[data-test-id="chat-history-list"]` (需确认具体类名)。
*   **Insertion Logic**: `chatHistoryElement.parentElement.insertBefore(folderContainer, chatHistoryElement)`。

#### Phase 2: 实现 Gemini 时间轴
*   **Scroll Container**: 锁定 `infinite-scroller` 或 `#chat-history-scroll-container`。
*   **User Query Selector**: 需要找到代表用户提问的气泡元素（通常是 `.user-query-bubble` 或类似）。*如果您能再提供一下用户提问气泡的 DOM 截图就完美了，不过我可以先尝试通用的 `.user-query` 选择器。*
*   **Timeline Injection**: 将时间轴容器插入到 `infinite-scroller` 的父容器中，并设置为绝对定位。

我将立即开始执行 **Phase 1**，修正文件夹的位置。