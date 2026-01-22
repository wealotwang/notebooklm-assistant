# Changelog

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
