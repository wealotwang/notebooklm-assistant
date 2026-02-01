# Google AI Companion: Project Timeline & Review

本文档汇总了项目的关键演进节点、技术决策及复盘总结，旨在提供一个清晰的全景视图。

## 🚀 Phase 3.1: 细节致胜 (Refining Gemini Experience)
**Period:** 2026-01-27 ~ 2026-02-01 (v3.0.0.16 - v3.0.0.20)

### 🔴 共享 Gem 收藏攻坚战 (The Naming Struggle)
**Date:** 2026-02-01
**Context:** 我们在侧边栏引入了“共享给我的 Gem”功能，旨在让用户固定的外部链接能够像原生 Gem 一样驻留。然而，Gemini 复杂的 SPA 渲染机制给名称抓取带来了巨大挑战。

*   **v3.0.0.17 - v3.0.0.18**: 初步实现了基于侧边栏的收藏功能，但在共享页面（/gem/...）抓取名称时频繁失败，只能拿到默认的 "Gemini"。
*   **v3.0.0.19 (重构)**: 将交互彻底原生化。引入了“三点菜单”管理和“自动固定”逻辑。
*   **v3.0.0.20 (精准抓取)**: 
    *   **方案**: 实施多源抓取（DOM 动画容器 + Document Title）。
    *   **机制**: 增加了“自我纠错”功能，进入页面后自动将旧的 "Gemini" 脏数据替换为真实标题。
    *   **现状**: 仍有部分特殊 Gem 抓取到 "Chat" 等非预期字符，说明 Gemini 的 DOM 结构可能存在多套模板，抓取逻辑仍需在下一阶段精进。

### 🧹 交互与 UI 清理
*   **冗余屏蔽**: 实现了精准的 `Context Guard`。
    *   NotebookLM: 屏蔽了主页卡片菜单和 Chat Panel 菜单中的“移动到文件夹”。
    *   Gemini: 屏蔽了 Gems 列表中的“移动到文件夹”，确保该功能仅出现在对话列表。
*   **布局自纠偏**: 解决了刷新页面时文件夹位置挪移的问题，通过 `ensureFolderPosition` 强制维持 `Gems -> Folders -> Chats` 的垂直顺序。
*   **智能侧边栏**: 实现了侧边栏折叠时自动隐藏文件夹，避免 UI 挤压。

### 🟡 基础设施与规范
*   **Skill 体系重构**: 重新定义了 `收尾工作` Skill，将 `todo.json` 确立为“单一真理源”，废弃了手动维护的 `task_plan.md`。
*   **语言规范**: 确立了全链路中文输出规则，并在 Core Memory 中固化。

---

## 🚀 Phase 3: 多平台融合 (Gemini Integration)
**Period:** 2026-01-24 (v3.0.0+)

### 🔴 Critical Incident Review: The "Timeline Disappearance" Saga (v3.0.0.4 - v3.0.0.10)
**Date:** 2026-01-25
**Context:** v3.0.0.3 发布后，用户反馈 Gemini 页面上的 Timeline 消失了。这是一次典型的从“过度优化”导致系统崩溃，最终通过“战略回滚”恢复服务的工程案例。

#### 1. 问题爆发
*   **现象**: 用户报告 Timeline 组件完全不可见。
*   **初步诊断**: 怀疑是 DOM 结构变化导致选择器失效，或是样式层叠 (`z-index`) 问题。

#### 2. 试错过程 (Trial & Error)
*   **Attempt 1: 样式微调 (v3.0.0.4 - v3.0.0.6)**
    *   **假设**: 元素存在但被遮挡。
    *   **操作**: 增加 `z-index`，强制 `display: flex`，更新 CSS 选择器。
    *   **结果**: **失败**。Timeline 依然不可见。
*   **Attempt 2: 激进的 Body 注入 (v3.0.0.7 - v3.0.0.9)**
    *   **假设**: 父容器 (`infinite-scroller`) 的 `overflow` 属性截断了 Timeline。
    *   **操作**: 放弃流式布局，将 Timeline 直接注入 `document.body`，并使用 `position: fixed` + JS 动态计算坐标来模拟跟随效果。
    *   **结果**: **失败**。Gemini 的动态布局极其复杂，JS 计算的位置难以实时同步，且 MutationObserver 在 Body 层级的监听开销巨大且不稳定。

#### 3. 最终解决 (Resolution: v3.0.0.10)
*   **决策**: 承认 v3.0.0.9 的架构方向错误，执行**战略性回滚**。
*   **操作**:
    *   **Revert**: 彻底回滚代码至 v3.0.0.2 的架构（父容器注入）。
    *   **Simplify**: 移除所有复杂的 JS 定位逻辑，回归纯 CSS (`position: absolute`) 布局。
    *   **Enforce**: 强制父容器 `position: relative`，确保子元素定位基准正确。
    *   **Diagnostics**: 引入 `[Gemini Timeline] Diagnostic` 日志系统，打印关键 DOM 节点状态，拒绝盲目调试。
*   **成效**: Timeline 恢复显示，交互功能正常。

#### 4. 深刻教训 (Lessons Learned)
*   **KISS Principle**: 在复杂的第三方 DOM 环境中，原生的 CSS 相对定位往往比 JS 模拟的绝对定位更健壮。
*   **Diagnostics First**: 遇到 UI 消失问题，首选方案应是“添加日志”而非“盲改代码”。
*   **Rollback Courage**: 当新的技术路径陷入泥潭时，要有勇气果断回滚到上一个已知稳定状态，而不是在错误的基础上继续打补丁。

### v3.0.0.3: Gemini 体验打磨 (Current)
*   **交互革新**: 重构了 Gemini 对话 ID 的捕获逻辑，不再依赖脆弱的事件冒泡，而是采用智能 DOM 遍历策略，彻底解决了“无法获取对话信息”的痛点。
*   **视觉融合**: 全面适配 Gemini 的 **Dark Mode**，从文件夹列表到右键菜单再到时间轴，所有 UI 元素在深色模式下都拥有了原生的质感。
*   **布局精修**: 修正了侧边栏注入逻辑，确保文件夹容器稳固地驻留在 Gems 和 Chat History 之间。

### v3.0.0.1 - v3.0.0.2: Gemini 基础设施
*   **架构重构**: 项目更名为 **Google AI Companion**，代码库拆分为 `content_notebooklm.js` 和 `content_gemini.js`，实现双平台独立运行。
*   **注入攻坚**: 针对 Gemini 复杂的 SPA 结构，实现了多策略注入机制（轮询 + 多种选择器兜底），并引入了可视化的“红框诊断”工具。
*   **功能复刻**: 成功将 NotebookLM 的核心功能（文件夹管理、时间轴导航）移植到 Gemini 平台。

### 🟡 NotebookLM 体验完善 (v3.0.0.11 - v3.0.0.15)
**Date:** 2026-01-25
**Context:** 在完善 Gemini 功能的同时，我们也对 NotebookLM 的核心体验进行了最后一公里的打磨，重点解决了全选频闪、重命名不便和“幽灵文件”三大痛点。

#### 1. 全选频闪与死循环 (Infinite Sync Loop)
*   **问题**: 用户反馈点击“全选”时，Checkbox 会疯狂闪烁。
*   **根源**: 我们的 `MutationObserver` 和 `change` 事件监听器过于“勤奋”。
    *   **Round 1 (Observer)**: 监听 `attributes` 变化，导致“插件修改 -> 触发 Observer -> 再次修改”的死循环。
    *   **Round 2 (Event)**: 切换到 `change` 事件后，发现插件代码调用 `element.click()` 也会触发原生 `change` 事件，再次陷入死循环。
*   **解决 (Event Gating)**: 引入了 **事件门控 (Event Gating)** 机制。使用 `isProgrammaticClick` 标志位，在插件执行操作期间暂时屏蔽监听器，彻底切断了反馈回路。

#### 2. 幽灵文件与性能优化 (Ghost Files)
*   **问题**: 删除源文件后，文件夹视图中依然残留该文件；且全选时性能不佳。
*   **根源**: `MutationObserver` 的触发条件过于宽泛（`hasRows`），导致任何微小变动都触发全量重绘。
*   **解决**: 重构了 Observer 逻辑，实施 **按需更新**。只有检测到 `removedNodes` 中包含源文件行时，才触发 Detail View 的刷新。这既解决了同步问题，又大幅提升了性能。

#### 3. 交互增强
*   **重命名**: 在文件夹右键菜单中增加了“重命名”选项，与双击重命名共享逻辑，提供了更明显的入口。
*   **Gemini 视觉**: 实现了侧边栏的磨砂透明效果，并采用了“Gems-First”插入策略，确保 UI 稳固地位于 Gems 和 Chats 之间。

---

## 🛠 Phase 2: NotebookLM 深度优化 (Refinement)
**Period:** 2026-01-22 ~ 2026-01-24

### v2.1.25 - v2.1.26: 专注模式与体验微调
*   **Focus Mode**: 引入批量操作的“专注模式”，自动屏蔽原生复选框，高亮选中行，并支持点击整行选中，极大提升了批量整理的效率。
*   **细节打磨**: 统一 Checkbox 尺寸 (18px)，移除干扰性的 Alert 弹窗。

### v2.1.24: 全能 Source 支持
*   **挑战**: YouTube、PDF 等特殊 Source 因 DOM 结构不同（`.single-source-container`）而被插件忽略。
*   **突破**: 引入 `getAllSourceRows()` 抽象层，统一了不同 Source 类型的查找逻辑，实现了 100% 的覆盖率。

### v2.1.21: 数据隔离与 SPA 适配
*   **痛点**: 不同 Notebook 间文件夹数据混淆。
*   **方案**: 实现了基于 URL ID 的命名空间隔离 (`nlm_folders_${notebookId}`)，并利用 MutationObserver 监听 URL 变化，实现了 SPA 页面内的自动数据重载。

### v2.1.18 - v2.1.20: 时间轴 (Timeline)
*   **创新**: 借鉴 Voyager 设计，在右侧引入可视化时间轴。
*   **演进**: 从最初的简单注入，到适配父容器相对定位，再到支持自适应宽度的 Tooltip 预览，逐步完善了长对话的导航体验。

---

## 🌱 Phase 1: MVP 原型 (Foundation)
**Period:** 2026-01-22

### v2.0.0 - v2.1.17: 核心功能构建
*   **拖拽归类**: 实现了基于 HTML5 Drag & Drop 的直观归类体验。
*   **同步机制**: 经历了多次重构，最终确立了 "Checkbox-First" 的查找策略，解决了文件名截断、特殊字符导致的同步失败问题，实现了 View 与 Native 状态的完美双向同步。
*   **DOM 探索**: 摸索出了 `MutationObserver` + `setTimeout` 的最佳实践，以应对 NotebookLM 的动态渲染特性。

---

## 📚 关键文档索引
*   **`CHANGELOG.md`**: 详细的版本变更记录。
*   **`Learning from voyager.md`**: Phase 2 阶段的技术深度复盘。
*   **`docs/planning/gemini_voyager_analysis.md`**: Gemini 架构调研报告。
