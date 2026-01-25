这是一个非常典型的 SPA (单页应用) 动态渲染问题。

### 问题分析
1.  **Gemini 滚动条失效**:
    *   Gemini 是高度动态的，用户切换对话时，DOM 中的滚动容器 (`infinite-scroller`) 可能会被销毁并重新创建。
    *   目前的 `timeline_gemini.js` 只在页面初次加载时执行一次 `startInitialization`。如果用户导航到另一个 Chat，旧的容器没了，脚本却没有重新绑定到新的容器上。
2.  **NotebookLM 生效慢**:
    *   目前的 `timeline.js` 使用了一个简单的 `setTimeout` 或 `MutationObserver` 监听 `document.body`，一旦找到容器就断开监听 (`disconnect`)。
    *   在 NotebookLM 中，切换 Notebook 或 Source 时，容器也可能发生变化，导致监听器失效或延迟。

### 优化方案：引入“生命周期管理”

我们需要一种机制，不仅能**发现**容器，还能**持续监视**容器的存活状态，一旦容器消失或变更，立即重新初始化。

#### 1. 通用优化策略 (适用于两边)
*   **持久化哨兵 (Persistent Sentinel)**: 不要轻易断开对 `document.body` 的监听。即使找到了容器，也要继续监听，以防页面路由切换导致容器被替换。
*   **URL 变更监听**: 监听 URL 变化（SPA 路由跳转），强制触发一次重新检查。
*   **防抖初始化**: 避免短时间内多次 DOM 变动导致重复初始化。

#### 2. Gemini 特异性优化
*   **选择器增强**: `infinite-scroller` 可能不是唯一的滚动容器，有时是 `main` 或其他元素。我们需要一个更健壮的查找逻辑。
*   **动态注入**: 确保每次检测到新的 Chat 界面加载完成时，都重新注入 Timeline UI。

### 实施计划

1.  **重构 `timeline.js` (NotebookLM)**:
    *   修改 `startInitialization`，使其成为一个长期运行的监听过程。
    *   引入 `reinit` 机制：当检测到 DOM 大规模变动或 URL 变化时，重新运行初始化逻辑。
2.  **重构 `timeline_gemini.js` (Gemini)**:
    *   同步上述优化。
    *   特别针对 Gemini 的切换对话场景，增加对 `.chat-history-scroll-container` 重建的敏感度。
3.  **版本更新**: 升级到 `v3.0.0.4`。

我将先从 `timeline.js` 开始优化，确立模式后再同步到 `timeline_gemini.js`。