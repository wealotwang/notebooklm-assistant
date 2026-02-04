---
name: 保存记忆
description: "主动生成并保存当前对话的上下文快照、技术决策和任务进度，以防止记忆丢失。"
---

# Auto-Save Context Protocol

**Trigger:**
1.  **Manual:** "保存记忆", "存档", "Save memory", "Context dump"
2.  **Auto (Agent-Driven):** **MUST** be proactively triggered by the Agent when:
    *   A complex coding task or sub-task is successfully completed.
    *   The user initiates a context switch to a new topic.
    *   The Agent detects the conversation history is getting long (e.g., > 10 turns) and valuable technical details might be lost.

**Description:**
This skill acts as an "External Memory Bank". It creates a structured snapshot of the current session's status, ensuring that even if the chat context is reset, the project state can be recovered instantly.

**Steps:**

1.  **Analyze Context**:
    *   Summarize the **Current Focus** (what are we building/fixing?).
    *   List **Key Decisions** made in this session (architectural choices, library changes, etc.).
    *   Update **Task Status** (what's done, what's pending in `todo.json`).
    *   Identify **Unresolved Issues** or blockers.

2.  **Generate Snapshot**:
    *   Create a Markdown content with the above analysis.
    *   **Filename Format**: `dev_docs/memories/memory_YYYY-MM-DD_HH-mm.md` (Use current system time).

3.  **Save File**:
    *   Write the content to the file.

4.  **Notify User**:
    *   **Manual Trigger**: "已为您保存当前记忆快照：[Filename]"
    *   **Auto Trigger**: "（自动存档）检测到任务节点，已自动保存当前上下文记忆：[Filename]"

**Language Requirement:**
All output content in the memory file MUST be in **Chinese**.
