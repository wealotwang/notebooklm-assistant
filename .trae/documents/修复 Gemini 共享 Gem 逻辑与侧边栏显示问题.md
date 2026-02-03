## 1. 核心逻辑修复 (Trigger Fix)
- **精准触发**：修改 [content_gemini.js](file:///Users/JackieWang/Documents/Notebooklm%20%E6%96%87%E4%BB%B6%E5%A4%B9%E5%B7%A5%E5%85%B7/content_gemini.js) 中的 `setupAutoPinObserver`。
- **条件校验**：增加代码逻辑，仅当 URL 包含 `usp=sharing` 时才执行自动添加 Gem 的逻辑。这能彻底解决你自己新建 Gem 时被误判为“共享 Gem”的问题。

## 2. 侧边栏布局彻底修复 (UI/UX Fix)
- **消除显示限制**：在 [styles.css](file:///Users/JackieWang/Documents/Notebooklm%20%E6%96%87%E4%BB%B6%E5%A4%B9%E5%B7%A5%E5%85%B7/styles.css) 中强制取消高度限制。
    - 为 `#gemini-shared-gems-list` 添加 `max-height: none !important` 和 `overflow: visible !important`。
    - 确保共享列表项不再以“胶囊”形式横向排列（目前的 `flex-wrap: wrap`），而是改为**纵向列表项**，与 Gemini 原生风格保持一致，这样不会挤压垂直空间。
- **防止原生 Gem 隐藏**：Gemini 会动态计算侧边栏高度。我会尝试将插件容器的 `margin` 和 `padding` 进一步压缩，并确保其不干扰 Gemini 原生容器（`.bots-list-container`）的高度计算逻辑。

## 3. 版本管理与更新
- **版本号升级**：将 [manifest.json](file:///Users/JackieWang/Documents/Notebooklm%20%E6%96%87%E4%BB%B6%E5%A4%B9%E5%B7%A5%E5%85%B7/manifest.json) 版本提升至 `3.0.0.25`。
- **更新日志**：在 [CHANGELOG.md](file:///Users/JackieWang/Documents/Notebooklm%20%E6%96%87%E4%BB%B6%E5%A4%B9%E5%B7%A5%E5%85%B7/CHANGELOG.md) 中详细记录此次修复（修复共享 Gem 误触发、修复侧边栏显示受限）。

## 4. 验证与交付
- 执行修复后，我将通过代码自检确保逻辑无误。
- 最终会再次运行打包脚本，为你生成最新的 `.zip` 文件以便分发。