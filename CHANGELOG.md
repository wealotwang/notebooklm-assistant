# Changelog

## [3.0.0.19] - 2026-02-01
### Refactored
- **Gemini: Shared Gems Auto-Pinning**: 现在进入共享 Gem 页面后，插件会自动识别 Gem 名称并固定到侧边栏，无需手动操作。
- **Gemini: Native-like Sidebar UI**: 
  - 侧边栏中的共享 Gem 现在会显示其真实名称（如“医药行业资料补充研究”）。
  - 每个列表项都配备了标准的“三个点”菜单，交互体验与原生侧边栏高度统一。
  - 点击“三个点”可以轻松从列表中移除共享项。
- **Version Management**: 增加了 Git 标签 (`v3.0.0.19`)，确保版本可回溯。

## [3.0.0.18] - 2026-02-01
### Fixed
- **Gemini: Gem Menu Blocking**: 优化了拦截逻辑，通过 `aria-expanded` 属性实时定位触发源，彻底移除了 Gems 列表中的“移动到文件夹”选项。
- **Gemini: Shared Gems Sidebar Integration**: 
  - 将共享 Gem 的“固定”功能集成到侧边栏中，不再干扰原生页面 Header。
  - 当访问共享 Gem 页面时，侧边栏会自动出现“+ 固定当前”按钮。
  - 优化了显示逻辑：该区域仅在有固定数据或处于可固定页面时显示，保持界面清爽。

## [3.0.0.17] - 2026-02-01
### Added
- **Gemini: Shared Gems Pinning**: 新增“共享给我的 Gem”收藏功能。
  - 当用户访问他人分享的 Gem 链接时，界面上方会出现“固定此共享 Gem”按钮。
  - 固定后的 Gem 会显示在侧边栏“文件夹分类”上方，方便快速访问。
  - 该区域仅在有数据时显示，并支持一键取消固定。
### Fixed
- **Gemini: UI Cleanup**: 彻底解决了 Gems 列表菜单中仍会出现“移动到文件夹”的问题。
  - 增强了 `injectMenuItem` 的上下文检查，确保仅在普通对话中注入管理选项。

## [3.0.0.16] - 2026-01-27
### Fixed
- **UI Cleanup**: 移除了 NotebookLM 和 Gemini 界面中的冗余“移动到文件夹”菜单项。
  - **NotebookLM**: 屏蔽了主页 (`/`) 和 Chat Panel（右侧对话面板）中的菜单注入，仅保留左侧资源列表中的功能。
  - **Gemini**: 屏蔽了 Gems 列表中的菜单注入，仅保留普通对话列表的功能。
- **Accuracy**: 引入了更精准的上下文判断逻辑（Context Guard），通过回溯触发按钮的位置来决定是否注入菜单，杜绝了误操作。

## [3.0.0.15] - 2026-01-25
### Fixed
- **NotebookLM Observer Optimization**: 解决了全选时的视觉频闪和性能问题。
  - **Refactor**: 重构了 `MutationObserver` 逻辑，移除了 `hasRows` 导致的无条件更新。现在，Detail View 的刷新仅在检测到 **源文件被删除 (removedNodes)** 时触发，这既保留了“防止幽灵文件”的功能，又彻底避免了因 Ripple 动画或 Class 变化导致的无限重绘。

## [3.0.0.14] - 2026-01-25
### Fixed
- **NotebookLM Infinite Sync Loop**: 彻底修复了全选频闪问题。
  - **Root Cause**: 原生的 `change` 事件不仅由用户触发，也会被插件的代码点击 (`element.click()`) 触发，导致了“插件同步 -> 触发原生事件 -> 插件捕获事件 -> 再次同步”的死循环。
  - **Fix**: 引入了 **Event Gating (事件门控)** 机制。使用 `state.isProgrammaticClick` 标志位，在插件执行点击操作期间，暂时屏蔽对 `change` 事件的响应，只允许用户真实的交互触发同步。

## [3.0.0.13] - 2026-01-25
### Fixed
- **NotebookLM Checkbox Flickering**: 修复了全选操作时 Checkbox 高速频闪的问题。
  - **Root Cause**: 之前的 `MutationObserver` 对 Checkbox 的属性变化监听过于敏感，导致插件与原生 UI 之间产生了死循环（Plugin Sync -> DOM Change -> Plugin Sync -> ...）。
  - **Fix**: 移除了针对 Checkbox 属性的观察者逻辑，转而使用原生的 `change` 事件监听器。这种方式只响应用户的真实交互，彻底切断了反馈回路。

## [3.0.0.10] - 2026-01-24
### Fixed
- **Gemini Timeline Revert**: 鉴于 v3.0.0.9 的 Body 注入方案在用户环境中失效，我们决定彻底回滚到 **v3.0.0.2** 的经典架构。
  - **Parent Injection**: 恢复将 Timeline 注入到 `infinite-scroller` 的父容器中（使用 `position: absolute`），而不是 Body。
  - **Logic Reset**: 移除了所有复杂的选择器纠错和动态定位逻辑，回归最纯粹的 DOM 注入。
  - **Diagnostics**: 增加了关键的调试日志 (`[Gemini Timeline] Diagnostic: ...`)，如果 Timeline 依然不显示，我们可以通过控制台明确知道是选择器没找到元素，还是 UI 被隐藏了。

## [3.0.0.9] - 2026-01-24
### Fixed
- **Gemini Timeline Visibility**: 采用了类似 Voyager 的 **Body 注入 + 绝对定位** 策略。
  - **Reparenting**: 将 Timeline UI 直接挂载到 `document.body`，彻底规避了 `infinite-scroller` 父容器可能存在的 `overflow: hidden` 裁剪或层叠上下文遮挡问题。
  - **Dynamic Positioning**: 实现了 `updateTimelinePosition` 逻辑，实时计算滚动容器的 `BoundingClientRect`，让悬浮的 Timeline 视觉上完美吸附在右侧滚动条区域。
  - **Interaction Preservation**: 完整保留了三角形锚点和 50 字气泡预览等核心交互体验。

## [3.0.0.8] - 2026-01-24
### Fixed
- **Gemini Timeline**: 鉴于单文件合并方案的不稳定，已**完全回滚**至 v3.0.0.3 的双文件架构 (`content_gemini.js` + `timeline_gemini.js`)。
  - **Revert**: 恢复了独立的 `timeline_gemini.js` 文件，确保时间轴逻辑与侧边栏逻辑解耦。
  - **Initialization**: 采用了 v3.0.0.2/3 时代的简单初始化逻辑，但保留了后续版本中对 `infinite-scroller` 选择器的精准修正。

## [3.0.0.7] - 2026-01-24
### Fixed
- **Gemini Timeline**: 彻底回归 v3.0.0.2 的极简初始化逻辑，移除了所有复杂的 SPA 路由监听和 MutationObserver 哨兵机制，仅保留基础的 DOM 注入。
- **Selector Config**: 恢复了 v3.0.0.2 的宽泛选择器配置 (`infinite-scroller, #chat-history-scroll-container`)，但增加了对父容器匹配的智能纠错逻辑（如果匹配到父级 wrapper，自动向下查找 `infinite-scroller`），确保滚动监听的准确性。

## [3.0.0.6] - 2026-01-24
### Fixed
- **Timeline Rollback & Fix**: 回滚了时间轴的架构至 v3.0.0.2 的简化版本，但保留了 v3.0.0.5 中精准的 `<infinite-scroller>` 选择器。
  - **Inline Integration**: 将 `timeline_gemini.js` 逻辑合并回 `content_gemini.js`，消除了脚本加载失败的风险。
  - **Stability**: 移除了复杂的 SPA 路由监听，回归最纯粹的 `MutationObserver` 注入逻辑，确保功能立即可用。

## [3.0.0.5] - 2026-01-24
### Fixed
- **Gemini Timeline**: 修正了时间轴滚动容器的选择器逻辑。
  - **Selector Precision**: 现在优先匹配 `<infinite-scroller>` 元素，解决了之前误匹配到父级非滚动容器 (`#chat-history-scroll-container`) 导致滚动监听失效的问题。
  - **Fallback Logic**: 增加了智能回退查找逻辑，如果直接匹配失败，会尝试从父容器向下查找，确保 100% 命中真正的滚动视图。

## [3.0.0.4] - 2026-01-24
### Fixed
- **Timeline Stability**: 彻底重构了时间轴的初始化逻辑，引入了“持久化生命周期监控”机制。
  - **SPA Support**: 新增了 URL 变化监听和路由导航检测，确保在 Gemini/NotebookLM 切换对话时，时间轴能自动重新绑定到新的滚动容器。
  - **Self-Healing**: 当检测到 DOM 容器被销毁或替换时，会自动触发清理和重新注入，解决了“滚动条偶尔失效”或“需要刷新才显示”的问题。

## [3.0.0.3] - 2026-01-24
### Fixed
- **Gemini ID Capture**: 重构了 `setupGlobalClickListener`，不再依赖点击事件冒泡，而是通过 DOM 遍历精准查找被点击按钮所属的对话链接，解决了“无法获取对话信息”的错误。
- **UI Positioning**: 修正了文件夹容器的插入逻辑，确保其位于 Gems 列表和 Chat History 之间，并增加了正确的边距。
- **Dark Mode**: 全面适配了 Gemini 的深色模式，文件夹列表、模态框和时间轴在 Dark Mode 下现在拥有正确的背景色和文字对比度。

## [3.0.0.2] - 2026-01-24
### Gemini Integration (Alpha)
- **Injection Robustness**: 增强了 Gemini 侧边栏的注入逻辑，增加了多种选择器策略和轮询兜底机制，确保在不同版本的 Gemini 界面上都能正确加载。
- **Debugging**: 移植了 `DOMService` 到 Gemini 模块，并添加了可视化的连接状态指示器（右上角红框），方便排查加载问题。
- **Manifest**: 修复了 Gemini App 路由 (`/app/*`) 的匹配规则，确保插件在深层链接中也能生效。

## [3.0.0] - 2026-01-24
### Changed
- **Rebranding**: 项目更名为 **Google AI Companion**。
- **Architecture**: 代码库重构，支持多平台架构。
  - `content.js` 重命名为 `content_notebooklm.js`。
  - 新增 `content_gemini.js` 用于未来的 Gemini 支持。
- **Manifest**: 更新权限和匹配规则，支持 `gemini.google.com`。

## [2.1.26] - 2026-01-24
### Improved
- **UX**: 移除了文件归类成功后的 Alert 弹窗提示，操作更加流畅无打扰。
- **UI**: 统一了批量模式下 Checkbox 的尺寸样式 (18px)，修复了在不同布局下大小不一致或被压缩变形的问题。

## [2.1.25] - 2026-01-24
### Improved
- **UX**: 引入批量操作的“专注模式” (Focus Mode)。
  - **Visual Shield**: 进入批量模式时，原生 NotebookLM 复选框和无关元素会自动变暗并禁止点击，彻底解决“两列复选框”带来的混淆。
  - **Row Highlight**: 选中文件时，整行会显示浅蓝色高亮背景，提供清晰的视觉反馈。
  - **Click-to-Select**: 在批量模式下，点击文件行的任意位置（不仅仅是复选框）即可切换选中状态，并自动拦截原生的“打开文件”操作，提升操作效率。

## [2.1.24] - 2026-01-24
### Fixed
- **Source Type Support**: 修复了 YouTube 链接、PDF 文件等 Source 无法被批量管理或显示分类标签的问题。
  - **New Detection Strategy**: 引入了 `getAllSourceRows()` 辅助函数，除了识别标准的表格行 (`.row`)，现在也能识别独立的 `.single-source-container` 元素。
  - **Tag Injection**: 优化了蓝色标签 (Tags) 的注入位置，确保在 YouTube/PDF 等特殊布局中也能正确插入到标题和复选框之间。
  - **Batch Checkbox**: 确保批量管理模式下的复选框能正确注入到这些特殊 Source 中。
  - **Filename Extraction**: 升级了文件名提取逻辑，支持直接从 Source Container 容器中提取标题。

## [2.1.23] - 2026-01-24
### Fixed
- **UI Refresh**: 修复了通过右键菜单或拖拽添加文件到文件夹后，文件列表上的蓝色标签（Tags）未立即显示的问题。
  - 确保在保存归类数据后，立即调用 `renderFileTags()` 刷新界面。
  - 确保在 Modal 保存后调用 `renderFolders()` 更新侧边栏状态。
- **UX**: 确认 Modal 弹窗在点击 "保存" 或 "取消" 后能正确触发后续 UI 更新逻辑。

## [2.1.22] - 2026-01-24
### Improved
- **UI/UX**: 优化文件夹删除体验。
  - 在当前激活的文件夹（Active Folder）名称旁新增显式的 "×" 删除按钮。
  - 移除了之前的右键菜单删除方式，操作更直观。
  - 删除时增加确认弹窗，防止误操作。

## [2.1.21] - 2026-01-24
### Added
- **Core**: 实现了 Notebook 维度的数据隔离（Isolation）。
  - **Context Awareness**: 插件现在能识别当前 URL 中的 Notebook ID。
  - **Namespace Storage**: 文件夹配置和文件归类数据现在按 Notebook ID 独立存储，互不干扰。
  - **SPA Support**: 监听 URL 变化，在切换笔记本时自动重载对应的文件夹数据。
- **Feature**: 实现了基础的文件夹删除功能（右键菜单）。

## [2.1.20] - 2026-01-24
### Improved
- **UI**: 深度优化 Tooltip 尺寸自适应逻辑。
  - **Adaptive Width**: 采用 `width: max-content` 配合 `max-width: 400px`，实现短文本紧凑、长文本换行的智能布局。
  - **Layout**: 设定单行最大承载约 25 个汉字，超过后自动换行。
  - **Truncation**: 保持最多显示 3 行（约 50-60 字）的视觉限制，超出部分以省略号显示。

## [2.1.19] - 2026-01-24
### Improved
- **UI**: 优化了 Timeline Tooltip 的视觉体验。
  - 宽度从 200px 增加至 300px，避免文字垂直堆叠。
  - 增加了 `line-clamp` 支持，最多显示 3 行文本，超出部分自动省略，保持界面整洁。
  - 调整了字体大小和背景透明度，提升可读性。
- **UI**: Timeline 节点形状更新为指向左侧的小三角，增强视觉引导性。

## [2.1.18] - 2026-01-24
### Added
- **Feature**: 引入了 Voyager 风格的“时间轴滚动条 (Timeline)”。
  - **Function**: 在右侧悬浮显示一个带有锚点的滚动条，直观展示所有“用户提问”的位置。
  - **Interaction**: 点击圆点可快速跳转到对应提问，滑动滑块可控制页面滚动。
  - **Design**: 采用 Shadow Overlay 设计，不修改原生滚动条，通过 `MutationObserver` 动态监听新消息上屏。
- **Debug**: 增强了 `timeline.js` 的初始化逻辑，引入 Observer Sentinel 机制，确保在 DOM 元素延迟加载时也能正确注入。


## [2.1.17] - 2026-01-22
### Fixed
- **Sync Architecture**: 彻底重构了双向同步的查找逻辑 (Checkbox-First Approach)。
  - **Problem**: 之前的版本依赖 `.row` 或 `div[role="row"]` 来定位原生文件，但 NotebookLM 的 DOM 结构可能因搜索、折叠或虚拟渲染而变化，导致 `Native row not found` 错误。
  - **Solution**: 现在直接遍历页面上所有的 `input[type="checkbox"]`，并从 Checkbox 上下文（如 `aria-label` 或父级结构）反向提取文件名。这种方法不依赖特定的行结构，具有极高的鲁棒性。
  - **Result**: 彻底解决了单选同步失效的问题，确保在任何 DOM 状态下都能精确定位并同步文件状态。

## [2.1.16] - 2026-01-22
### Fixed
- **Sync Robustness**: 增强了文件名的匹配算法 (Fuzzy Matching)。
  - 引入 `normalizeFileName`，去除文件名中的不可见字符并标准化空格。
  - 增加了“包含匹配”策略：当 View 和 Native 的文件名因截断或特殊字符不完全一致时，只要相似度高且相互包含，就视为匹配成功。这彻底解决了 `Native row not found` 的问题。
- **Debug**: 在匹配失败时，日志会输出当前页面上可见的所有文件名，方便进一步排查。

## [2.1.15] - 2026-01-22
### Fixed
- **View -> Native Sync**: 彻底重构了文件夹视图的事件绑定逻辑。
  - 移除了不可靠的事件委托，改为直接绑定 `click` 事件，确保每次点击都能精准触发。
  - 增强了原生点击模拟 (`safeClick`)，加入了 `mousedown`/`mouseup` 完整流程和 `change`/`input` 事件分发，完美穿透 Angular 的事件拦截。
- **Native -> View Sync**: 引入了 "Fast Path" 快速同步机制。
  - 当检测到原生 Checkbox 类名变化时，立即触发点对点的 View 更新，跳过全量同步的 Debounce 延迟，实现了毫秒级的响应速度。

## [2.1.14] - 2026-01-22
### Fixed
- **Deep Sync**: 深度修复了所有场景下的双向同步问题。
  - **Init Sync**: 每次打开文件夹详情视图时，立即从原生列表拉取最新状态，解决“打开即不同步”的问题。
  - **View -> Native**: 实现了“点对点”的强制同步逻辑。在文件夹中勾选单文件时，会精确定位并点击原生 Checkbox，不再依赖全量扫描，大幅提升 Angular 响应准确性。
  - **Native -> View**: 增加了反向同步的重试机制（Retry Logic），确保在 DOM 渲染延迟或动画过程中也能正确捕获状态更新。

## [2.1.13] - 2026-01-22
### Fixed
- **Bi-directional Sync**: 实现了原生的 "Select all sources" 与插件文件夹视图的完美全选联动。
  - 现在在原生列表点击全选，插件文件夹内的所有文件（及全选框）会立即自动选中。
  - 修复了原生单选反向同步到插件视图的延迟问题。
- **Checkbox Detection**: 增强了对 Angular Material 动画中间状态 (`mdc-checkbox--anim-unchecked-checked`) 的捕获，杜绝了点击过快导致的状态脱节。
- **Debug**: Log Viewer 新增 "DOM Watch" 模式，实时监控 Checkbox 的类名和属性变化。

## [2.1.12] - 2026-01-22
### Fixed
- **Sync Logic**: 彻底修复了 Checkbox 同步脱节问题。
  - 重写了 `isChecked` 逻辑，精准识别 Angular Material (`mat-checkbox`) 的复杂状态，解决了反选失效和初始状态不一致的问题。
  - 增强了同步机制，在打开文件夹时强制全量校对状态。
- **Log Viewer**: 正式上线弹窗日志查看器（点击插件图标即可使用），无需再打开开发者工具控制台。

## [2.1.11] - 2026-01-22
### Added
- **Log Viewer**: Added a popup interface (click extension icon) to view real-time debug logs. This makes troubleshooting filename extraction much easier.
- **Localization**: Added strict filtering for Chinese UI terms ("编辑", "更多", "取消", etc.) to prevent them from being captured as filenames.
- **Fix**: Resolved issue where "edit" (and localized variants) were still being captured in fallback scenarios.

## [2.1.10] - 2026-01-22
### Changed
- **Refactor**: Introduced `DOMService` pattern to centralize DOM operations.
- **Feature**: Added `debug` mode and detailed logging for filename extraction strategies.
- **Improvement**: Reordered extraction strategy to prioritize `.single-source-container` > `aria-description` > `.source-title`.
- **Fix**: Enhanced strict filtering to prevent "Edit", "More", "Menu" from being captured as filenames.

## [2.1.9] - 2026-01-22
### Fixed
- **Fix**: Changed filename extraction strategy to prioritize `aria-description` from the "More" button.
- **Improvement**: Added direct extraction from the clicked button in the global listener to bypass DOM traversal issues.
- **Improvement**: Updated `extractFileNameFromRow` to also look for `aria-description` within the row.

## [2.1.8] - 2026-01-22
### Fixed
- **Interaction Accuracy**: 修复了“移动到文件夹”菜单操作时无法获取正确文件名的问题。
  - 在 `setupGlobalClickListener` 中明确支持了 `.single-source-container` 容器识别，确保点击菜单按钮时能正确定位到包含文件名的父容器。
  - 增强了 `guessFileNameFromSiblings` 回退策略，增加了对 "edit", "rename", "delete" 等关键字的过滤，防止在无法定位容器时误抓取操作按钮文本。

## [2.1.7] - 2026-01-22
### Fixed
- **Content Accuracy**: 进一步增强文件名提取逻辑，深度适配用户提供的 DOM 结构。
  - 优先识别 `.source-title` 和 `single-source-container` 中的文本，确保 100% 准确获取文件名。
  - 强制屏蔽 "edit" 关键字，防止误将操作按钮文字识别为文件名。
  - 增加了详细的 Console 日志，方便追踪文件名提取来源。
- **UI/UX**: 优化了文件夹详情中长文件名的显示效果。
  - 强制允许文件名换行 (`white-space: normal`)，并限制最多显示 2 行，防止超长标题破坏布局。
  - 解决了之前因为 `text-overflow: ellipsis` 导致的标题显示不全问题。

## [2.1.6] - 2026-01-22
### Fixed
- **Extraction Logic**: 修复了文件名提取逻辑错误地捕获 "edit" 按钮文本的问题。
  - 增加了对 "edit", "rename", "delete" 等 UI 操作文本的屏蔽。
  - 优化了 `TreeWalker` 遍历逻辑，跳过按钮和图标内的文本。
  - 修复了 `makeSourcesDraggable` 中拖拽时可能使用了旧的提取逻辑的问题。

## [2.1.5] - 2026-01-22
### Fixed
- **Content Accuracy**: 优化了文件名的提取逻辑，现在优先从 `.source-title` 元素获取标题。
  - 确保文件夹内显示的文件名与 NotebookLM 原生列表中的 Source Title 完全一致（1:1 展示）。
  - 解决了之前可能因为从 Checkbox Label 提取而导致标题截断或不准确的问题。
- **UI/UX**: 文件夹详情视图中的文件名现在支持自动换行 (`word-break: break-word`)，完整展示超长标题，不再截断。

## [2.1.4] - 2026-01-22
### Fixed
- **Interaction**: 实现"所见即所得"的文件夹筛选模式。
  - **Exclusive Selection**: 现在，在文件夹详情视图中勾选任意文件（无论是全选还是单选），系统都会**强制**让 NotebookLM 的选中状态与当前视图完全一致。这意味着未在当前文件夹中被勾选的文件（包括其他文件夹的文件）都会被自动反选。这使用户能快速聚焦于特定文件夹的内容。
  - **Sync Logic**: 重构了状态同步逻辑 `syncNativeSelectionFromView`，采用全量比对而非增量更新，确保状态绝对准确。

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
