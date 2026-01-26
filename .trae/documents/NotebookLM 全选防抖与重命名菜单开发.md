# 解决 NotebookLM 全选闪烁与文件夹重命名问题

## 1. 修复全选闪烁 (Flickering Fix)
*   **问题根源**: 当前的同步逻辑 (`syncViewFromNative`) 过于优先信任全局的 "Select All" 状态。当用户取消全选时，NotebookLM 的全局全选框状态更新可能有延迟（Stale State），导致插件错误地将复选框重新勾选，随即又因为真实状态更新而取消，产生闪烁。
*   **解决方案**: 调整优先级。
    *   **优先信任**：单行复选框的真实状态 (`nativeStates`)。
    *   **次要信任**：全局全选状态 (`isGlobalSelectAllChecked`)。
    *   这样即使全局全选框滞后，只要单行复选框已经变了，我们就能正确显示，消除闪烁。

## 2. 增加文件夹重命名选项 (Folder Rename)
*   **现状**: 目前仅支持“双击文件夹名”进行重命名，功能入口隐蔽，用户未发现。
*   **改进**:
    1.  **右键菜单**: 在文件夹的右键菜单中增加 **"重命名"** 选项，与 "删除文件夹" 并列。
    2.  **交互逻辑**: 点击 "重命名" 后，触发与双击相同的“原地输入框编辑”体验。
    3.  **代码重构**: 将重命名逻辑提取为独立函数 `startRenaming(folder, liElement)`，供双击事件和菜单事件复用。

## 3. 执行计划
我们将直接修改 `content_notebooklm.js`：
1.  优化 `syncViewFromNative` 函数中的状态判断逻辑。
2.  重构 `renderFolders` 中的双击逻辑，提取为 `triggerFolderRename`。
3.  更新 `showFolderContextMenu`，添加重命名按钮并绑定事件。
