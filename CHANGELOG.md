# Changelog

## [2.1.3] - 2026-01-22
### Fixed
- **Interaction**: 深度优化“全选”联动逻辑，基于用户反馈的 Angular Material DOM 结构进行了适配。
  - **Selector Accuracy**: 改用 `aria-label="Select all sources"` 精确查找全局全选框，解决了之前基于文本查找可能失效的问题。
  - **Event Simulation**: 升级了点击模拟逻辑 `safeClick`，除了 `click()` 还会分发 `change`/`input` 事件，确保能触发 Angular/MDC 的状态变更。
  - **State Detection**: 增强了复选框状态检测 `isChecked`，现在会同时检查 `.checked` 属性、`mdc-checkbox--selected` 类名和 `aria-checked` 属性，确保在所有状态下都能正确判断。

## [2.1.2] - 2026-01-22
### Fixed
- **Interaction**: 修复了文件夹详情视图中“全选”功能未与 NotebookLM 原生选择联动的问题。
  - 现在点击文件夹详情中的“全选”，系统会自动**清除 NotebookLM 原有的选择**，并**选中该文件夹内的所有文件**。
  - 支持双向状态同步：打开文件夹详情时，会正确显示当前文件的选中状态。
  - 支持隐藏元素操作：优化了 DOM 操作逻辑，即使在原生列表被折叠隐藏的情况下也能正确进行选择。

## [2.1.1] - 2026-01-22
### Fixed
- **Performance**: 修复了 `MutationObserver` 与批量模式 UI 更新导致的无限循环（浏览器卡死）问题。
- **Visibility**: 在原生文件列表中新增文件归属标签（Tags），现在无需点击文件夹即可直观看到文件归类情况。
- **Interaction**: 文件夹详情视图新增“全选/反选”功能，提升批量管理效率。

## [2.1.0] - 2026-01-22
### Added
- **Batch Operations**: 新增批量操作模式，支持多选文件并批量移动到文件夹。
- **UI**: 文件夹头部新增“批量管理”按钮（Toggle）。
- **UI**: 新增底部浮动工具栏（Floating Toolbar），显示选中数量并提供操作入口。
- **Interaction**: 在批量模式下，自动向文件列表注入 Checkbox，支持跨页面的选择状态管理。

## [2.0.3] - 2026-01-22
### Fixed
- 重构文件名捕获逻辑，移除对 `.row` 类名的强依赖。
- 新增 `guessFileNameFromSiblings` 算法，从按钮的前序兄弟节点中智能提取文件名。
- 在 `mousedown` 阶段自动记录最后一次点击的按钮，作为 Fallback 恢复点。
- 增强了 `extractFileNameFromRow` 的鲁棒性，使用 `TreeWalker` 遍历文本节点，不再仅依赖 innerText。

## [2.0.2] - 2026-01-22
### Fixed
- 紧急修复文件名获取失败问题。
- 引入全局 `mousedown` 监听器替代 `click`，确保在事件被 Angular 拦截前捕获文件名。
- 增强文件名提取逻辑 (`extractFileNameFromRow`)，支持多策略（Checkbox aria-label > Title Class > innerText）。
- 完善日志输出，方便调试文件名捕获过程。

## [2.0.1] - 2026-01-22
### Fixed
- 修复了上下文菜单（Context Menu）注入不稳定的问题，改用 MutationObserver 实时监听菜单 DOM 变化。
- 修复了 "移动到文件夹" 无法获取文件名的问题，增加了基于 `aria-expanded` 的回退查找策略。

### Changed
- **Menu**: 上下文菜单现在会显示“移动到文件夹...”选项，并自动捕获当前选中的文件名。

## [2.0.0] - 2026-01-22
### Added
- **Core**: 实现了基于 Manifest V3 的 Chrome 插件基础架构。
- **UI**: 实现了文件夹管理界面的注入（Inject Folder UI）。
- **Interaction**: 实现了文件拖拽（Drag & Drop）归类功能。
- **Storage**: 实现了基于 `chrome.storage.local` 的本地数据持久化。
- **Stability**: 引入 MutationObserver 解决 SPA 页面动态加载导致的注入失效问题。

### Fixed
- 修复了 `manifest.json` 文件名拼写错误导致无法加载的问题。
- 优化了注入点查找逻辑，支持多种 DOM 结构策略。
