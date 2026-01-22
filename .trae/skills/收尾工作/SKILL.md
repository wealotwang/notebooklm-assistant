---
name: 收尾工作
description: "\"下次你只需要说 “收尾工作” 或 “今天结束” ，我就会自动识别并执行以下标准流程："
---

# Session Wrap-Up Protocol

**Trigger:** "收尾工作", "今天结束", "Wrap up", "End session"

**Description:**
Standard procedure to finalize a coding session, ensuring code quality, version control, and documentation.

**Steps:**
1.  **Code Review & Cleanup**:
    *   Ensure no temporary code or debug logs remain (unless requested).
    *   Verify all linter errors are addressed.
2.  **Version Control (Git)**:
    *   Check for modified files.
    *   Update `CHANGELOG.md` if significant changes occurred.
    *   Bump version in `manifest.json` (or equivalent) if applicable.
    *   Execute `git add .`
    *   Execute `git commit` with a descriptive message following Conventional Commits.
    *   Execute `git tag` for new releases.
3.  **Timeline/Summary**:
    *   Generate a bullet-point summary of the session's achievements.
    *   List any technical decisions made.
    *   List pending tasks for the next session.
每次的复盘必须写明复盘报告什么时候生成的，并且保存在一个固定的文档中，文档会在每次收尾时都增加增量的时间线复盘。
4.  **Final Output**:
    *   Present the summary to the user.
    *   Confirm the session is ready to close.