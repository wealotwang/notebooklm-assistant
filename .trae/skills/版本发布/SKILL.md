---
name: 版本发布
description: "自动化版本迭代管理：版本号推断、Changelog 生成（带脱敏）及代码提交。"
---

# Release Master Protocol

**Trigger:**
1.  **Manual:** "发布版本", "发版", "Bump version", "Release", "迭代发布"
2.  **Auto (Agent-Driven):** MUST be triggered when a Feature or Bug Fix is verified and ready for deployment.
3.  **Post-Plan Execution (CRITICAL):** MUST be triggered immediately after successfully executing a user-approved plan that involves code modifications.
4.  **Builder/Autonomous Mode:** MUST be triggered before the Agent marks a complex task as "Done" in autonomous mode.

**Description:**
This skill acts as the "Release Manager". It handles the tedious work of version bumping and changelog maintenance, ensuring all public documentation is professional and sanitized.

**Sanitization Rules (CRITICAL):**
When generating changelogs, you **MUST** sanitise the input:
1.  **Remove References**: **NEVER** mention external sources like "Voyager", "GitHub", "Reference", "借鉴", "参考".
2.  **Focus on Value**: Describe **WHAT** was fixed/added, not HOW or WHERE it came from.
3.  **Professional Tone**: Ensure the log sounds like an original, professional product update.
4.  **Source Isolation**: Do NOT read from `Learning from voyager.md` or internal analysis docs to generate public logs. Only use `todo.json` or code changes.

**Steps:**

1.  **Version Inference**:
    *   Read `manifest.json` to get the current `version`.
    *   **Logic**:
        *   Default: Increment the last digit (Patch) by 1 (e.g., `3.0.0.26` -> `3.0.0.27`).
        *   If user specifies "Minor" or major feature added: Increment the second-to-last digit.

2.  **Changelog Generation**:
    *   Analyze completed tasks/code changes.
    *   **Apply Sanitization Rules** (Remove "Voyager" references).
    *   Format as:
        ```markdown
        ## [Version] - YYYY-MM-DD
        ### Added / Fixed / Changed
        - Description of the change...
        ```

3.  **File Updates**:
    *   Update `version` in `manifest.json`.
    *   Prepend the new entry to `CHANGELOG.md` (Keep the header).

4.  **Git Commit**:
    *   Stage all changes: `git add .`
    *   Commit: `git commit -m "chore(release): v[Version] - [Summary]"`

**Language Requirement:**
All output content (Changelog & Commit Message) MUST be in **Chinese** (unless user explicitly requests English).
