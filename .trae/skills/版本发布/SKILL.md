---
name: 版本发布
description: "自动化版本迭代管理：版本号推断、Changelog 生成（带脱敏）及代码提交。"
---

# 版本发布协议 (Release Master Protocol)

**触发机制 (Trigger):**
1.  **手动触发 (Manual):** "发布版本", "发版", "Bump version", "Release", "迭代发布"
2.  **自动触发 (Auto):** 当功能开发或 Bug 修复完成并验证通过，准备部署时，**必须**触发。
3.  **Plan 执行后 (Post-Plan Execution - CRITICAL):** 当成功执行完一个涉及代码修改的 Plan 后，**必须**立即触发。
4.  **自主/构建模式 (Builder/Autonomous Mode):** 在自主模式下，Agent 将复杂任务标记为“完成 (Done)”之前，**必须**触发。

**描述 (Description):**
此 Skill 扮演“发布经理”的角色。它负责处理版本号递增和 Changelog 维护等繁琐工作，确保所有公开文档都是专业且经过脱敏处理的。

**脱敏与清洗规则 (Sanitization Rules - CRITICAL):**
生成 Changelog 时，你**必须**对输入内容进行清洗：
1.  **移除引用**: **绝对禁止**提及外部来源，如 "Voyager", "GitHub", "Reference", "借鉴", "参考"。
2.  **关注价值**: 描述**修复了什么**或**增加了什么**，而不是怎么做的或从哪抄的。
3.  **专业语调**: 确保日志听起来像是原创、专业的产品更新。
4.  **来源隔离**: **不要**读取 `Learning from voyager.md` 或内部分析文档来生成公开日志。仅使用 `todo.json` 或代码变更记录。

**执行步骤 (Steps):**

1.  **版本推断 (Version Inference)**:
    *   读取 `manifest.json` 获取当前 `version`。
    *   **逻辑**:
        *   默认：末位版本号 (Patch) +1 (例如 `3.0.0.26` -> `3.0.0.27`)。
        *   如果用户指定 "Minor" 或增加了重大功能：倒数第二位 +1。

2.  **生成变更日志 (Changelog Generation)**:
    *   分析已完成的任务/代码变更。
    *   **应用脱敏规则** (移除 "Voyager" 等引用)。
    *   格式如下:
        ```markdown
        ## [版本号] - YYYY-MM-DD
        ### Added / Fixed / Changed
        - 变更描述...
        ```

3.  **更新文件 (File Updates)**:
    *   更新 `manifest.json` 中的 `version` 字段。
    *   将新条目插入到 `CHANGELOG.md` 的顶部 (保留原有头部)。

4.  **Git 提交与打标 (Git Commit & Tag)**:
    *   暂存所有更改: `git add .`
    *   提交: `git commit -m "chore(release): v[版本号] - [摘要]"`
    *   **打标签 (Tag)**: `git tag -a v[版本号] -m "Release v[版本号]"`
        *   *目的*: 创建永久的版本快照，以便未来通过 `git checkout v[版本号]` 实现一键回溯。

**语言要求 (Language Requirement):**
所有输出内容 (Changelog 和 Commit Message) **必须**使用中文 (除非用户明确要求英文)。
