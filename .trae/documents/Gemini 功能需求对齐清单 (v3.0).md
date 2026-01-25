太棒了，这正是我需要的关键信息！

**技术分析 (Gemini DOM 结构)**:
1.  **菜单容器**: 正如您所说，Gemini 使用 Angular Material 的 Overlay 系统。菜单实际渲染在 `div.cdk-overlay-container` -> `div.cdk-overlay-pane` -> `div.mat-mdc-menu-panel` 中，这与 NotebookLM 几乎一致。
2.  **菜单内容**: 核心内容区是 `.mat-mdc-menu-content`。
3.  **菜单项**: 现有的 "Pin" 和 "Rename" 按钮是 `button.mat-mdc-menu-item`。
4.  **关键标识**: 菜单面板有一个特定的类名 `.conversation-actions-menu`，这是我们精准定位“侧边栏对话菜单”的黄金标识！(NotebookLM 的菜单没有这个专用类名，Gemini 的更规范)。

### 🛠️ 开发实施方案 (Gemini 模块)

基于以上信息，我将执行以下步骤：

#### Phase 1: 基础设施 (Infrastructure)
1.  **`content_gemini.js` 初始化**: 搭建基础架构，包括 `MutationObserver` 和 `State` 管理（类似于 `content_notebooklm.js`）。
2.  **侧边栏注入**: 找到 Gemini 左侧导航栏的顶部区域，插入我们的 **"Folders"** 容器。

#### Phase 2: 菜单拦截与注入 (Menu Injection)
这是最核心的一步：
1.  **监听**: 使用 `MutationObserver` 监听 `document.body`。
2.  **捕获**: 当检测到 `.conversation-actions-menu` 出现时，说明用户点击了侧边栏的“三个点”。
3.  **注入**: 立即在 `.mat-mdc-menu-content` 的第一项（或合适位置）插入我们的 **"📂 Move to folder"** 按钮。
4.  **上下文捕获**:
    *   **难点**: 菜单是在 `body` 根部的 Overlay 里渲染的，和触发它的“三个点”按钮在 DOM 上相隔十万八千里。
    *   **解法**: 我们需要一个全局的 `mousedown` 监听器（参考 NotebookLM 的实现），当用户点击侧边栏的“三个点”时，立即记录下当前点击的 **Conversation ID** 或 **Title**。这样当菜单弹出并点击“移动”时，我们就知道是在操作哪个对话了。

#### Phase 3: 数据存储与展示 (Data & UI)
1.  **存储**: 使用 `gemini_folders` 和 `gemini_mappings`。
2.  **过滤逻辑**: 当用户点击某个文件夹时，我们将遍历侧边栏的 `recent-chats` 列表，通过比对 ID 或 Title，隐藏不匹配的对话。

我将从 Phase 1 和 Phase 2 开始，先让您能在 Gemini 里看到文件夹 UI 和右键菜单。准备好开始了吗？