# 单条数据 Checkbox 双向同步深度修复方案

从你提供的日志来看，**初始化同步**已经生效（日志中没有再出现加载时的状态不一致），**Native -> View 的全选/反选**也工作正常。

但是，**核心问题**依然存在于**单条数据的互操作**上：
1.  **View -> Native 失效**：当你点击文件夹里的单选框时，日志中**没有**出现 `[View Action]` 的记录。这意味着 `change` 事件监听器根本没有被触发，或者被某种机制阻断了。这可能是因为我们在 `showDetailView` 里绑定的事件委托逻辑有漏洞，或者 Checkbox 的点击被浏览器的默认行为或其他层遮挡了。
2.  **Native -> View 延迟或失效**：虽然日志显示了 `[DOM Watch]` 捕获到了类名变化，也触发了 `[Sync]`，但在单选场景下，似乎没有正确更新 View 的状态（或者更新慢了）。

## 修复计划

### 1. 彻底重构 View -> Native 的事件监听 (最关键)
目前我们使用的是事件委托 (`view.addEventListener('change', ...)`).
*   **问题**：可能因为 Shadow DOM 或者 stopPropagation 的影响，change 事件没冒泡上来。
*   **行动**：改为在创建 Checkbox 元素时，**直接绑定** `click` 和 `change` 事件。
*   **增强**：不仅监听 `change`，还要监听 `click`，确保万无一失。

### 2. 优化 syncSingleFileToNative 的点击逻辑
*   **行动**：在模拟点击原生 Checkbox 时，增加更强的交互模拟。除了 `click()`，还要确保 `checked` 属性被正确切换，并分发 `input` 事件（Angular 强依赖 input 事件）。

### 3. 增强 Native -> View 的响应速度
*   **行动**：在 `MutationObserver` 捕获到变化后，立即执行一次轻量级的同步（只针对变动的那个 Checkbox），而不是等待 50ms 后全量扫描。
*   **优化**：建立 `FileName -> ViewCheckbox` 的直接映射缓存，避免每次都 `querySelectorAll`。

## 执行步骤
1.  **重写 `showDetailView`**：移除事件委托，改为在 map 循环中直接给每个 Checkbox 绑定事件。
2.  **升级 `syncSingleFileToNative`**：增强点击模拟。
3.  **提交 v2.1.15**：更新版本号和 Changelog。

准备好后，我将立即开始代码修改。