---
name: 收尾工作
description: "执行标准化的项目收尾流程：同步进度、管理版本、更新文档并提交代码。"
---

# Session Wrap-Up Protocol

**Trigger:** "收尾工作", "今天结束", "Wrap up", "End session"

**Description:**
Standard procedure to finalize a coding session. It acts as the bridge between your daily tasks (`todo.json`) and the project history (`Project_Review_Timeline.md`), ensuring version control and documentation are always up-to-date without manual effort.

**Steps:**

1.  **Task Sync & Documentation (Single Source of Truth)**:
    *   **Read**: Check `dev_docs/todo.json` for tasks completed in this session.
    *   **Write**: Append a summary of these completed tasks to `dev_docs/Project_Review_Timeline.md` under a new timeline entry (Current Date).
    *   *Note*: Do NOT manually maintain `task_plan.md` or `progress.md`. `todo.json` is the active tracker, `Project_Review_Timeline.md` is the history.

2.  **Version Control & Changelog**:
    *   **Check**: Are there code changes?
    *   **Prompt**: Ask the user if `manifest.json` version needs bumping (if not already done).
    *   **Update**: If version changed, add an entry to `CHANGELOG.md` with the new version and key changes.

3.  **Git Commit**:
    *   **Stage**: `git add .`
    *   **Commit**: Generate a conventional commit message.
        *   Format: `type(scope): summary`
        *   Include the new version number if applicable.
        *   Include a brief list of completed tasks in the body.

4.  **Final Cleanup**:
    *   **Scan**: Check root directory for loose files (e.g., temp docs). Move them to `dev_docs/` if found.
    *   **Report**: Output a concise summary of what was documented and committed.

**Language Requirement:**
All output and documentation MUST be in **Chinese** (unless user explicitly requests English).
