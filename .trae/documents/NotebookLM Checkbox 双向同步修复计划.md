# Checkbox 双向同步与动态调试方案 (最终确认版)

感谢提供的全选截图，这证实了 "Select all sources" 的 DOM 结构与普通单选框是一致的（都使用了 Angular Material 的 `mat-checkbox`）。方案已覆盖所有细节：

## 1. 核心修复：实现“原生 -> 插件”实时反向同步
这是解决“不同频”的终极手段。
- **全局监听**：修改 `MutationObserver` 监听所有 `mat-checkbox` 和 `input` 的 `class` 属性变化（包括动画过程）。
- **联动逻辑**：
  - **单选联动**：当原生单行被勾选 -> 插件视图对应的文件立即勾选。
  - **全选联动**：当原生“Select all sources”被勾选 -> 插件视图中的**所有文件**（及全选框）立即勾选。
  - **反选联动**：反之亦然，原生取消，插件立马取消。

## 2. 增强判定：捕获瞬间状态
- **更新 `isChecked`**：加入 `mdc-checkbox--anim-unchecked-checked` 类名判定，确保在点击瞬间的动画过程中就能“抓住”选中状态，杜绝脱节。

## 3. 调试工具：动态日志 (DOM Watch)
- **Log Viewer 升级**：新增 "DOM Watch" 类型日志。
- **效果**：当你点击 Checkbox 时，Log Viewer 会实时打印：
  `[DOM Watch] Native Checkbox Changed: "A Chatbot..." -> CHECKED (via class: mdc-checkbox--anim...)`
  这将帮助我们肉眼确认插件是否“看清”了每一次点击。

## 4. 执行步骤
1. 修改 `content.js`，升级 `MutationObserver` 配置。
2. 实现 `syncViewFromNative`（反向同步）函数。
3. 更新 `isChecked` 逻辑。
4. 增加版本号至 `v2.1.13` 并更新 Changelog。

准备就绪，开始执行。