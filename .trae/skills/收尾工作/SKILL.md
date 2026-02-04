---
name: 收尾工作
description: "执行标准化的项目收尾流程：同步进度、管理版本、更新文档并提交代码。"
---

# 每日收尾工作流 (Session Wrap-Up Protocol)

**触发词 (Trigger):** "收尾工作", "今天结束", "Wrap up", "End session"

**描述 (Description):**
这是结束每日编程会话的标准流程。它作为日常任务 (`todo.json`) 和项目历史 (`Project_Review_Timeline.md`) 之间的桥梁，确保版本控制和文档始终自动保持最新，无需人工维护。

**执行步骤 (Steps):**

1.  **任务同步与文档归档 (Task Sync & Documentation)**:
    *   **读取**: 检查 `dev_docs/todo.json` 中本次会话完成的任务。
    *   **写入**: 将这些已完成任务的摘要追加到 `dev_docs/Project_Review_Timeline.md` 的新时间轴条目下 (使用当前日期)。
    *   *注意*: 不要手动维护 `task_plan.md` 或 `progress.md`。`todo.json` 是当前活动的追踪器，而 `Project_Review_Timeline.md` 是历史记录。

2.  **版本控制与日志 (Version Control & Changelog)**:
    *   **检查**: 是否有代码变更？
    *   **询问**: 询问用户是否需要升级 `manifest.json` 版本号 (如果尚未升级)。
    *   **更新**: 如果版本发生变化，在 `CHANGELOG.md` 中增加一个新条目，记录新版本号和关键变更。

3.  **Git 提交 (Git Commit)**:
    *   **暂存**: 执行 `git add .`
    *   **提交**: 生成符合规范的 Commit Message。
        *   格式: `type(scope): summary`
        *   包含新版本号 (如果适用)。
        *   在正文中包含已完成任务的简要列表。

4.  **最终清理 (Final Cleanup)**:
    *   **扫描**: 检查根目录是否有散落的临时文件 (如临时文档)。如果发现，将其移动到 `dev_docs/`。
    *   **报告**: 输出一份简洁的摘要，告知用户哪些内容已被记录和提交。

**语言要求 (Language Requirement):**
所有的输出内容和文档记录**必须**使用中文 (除非用户明确要求英文)。
