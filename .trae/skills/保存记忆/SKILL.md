---
name: 保存记忆
description: "主动生成并保存当前对话的上下文快照、技术决策和任务进度，以防止记忆丢失。"
---

# 自动记忆保存协议 (Auto-Save Context Protocol)

**触发机制 (Trigger):**
1.  **手动触发 (Manual):** "保存记忆", "存档", "Save memory", "Context dump"
2.  **自动触发 (Auto - Agent Driven):** 当满足以下条件时，Agent **必须**主动触发：
    *   一个复杂的编码任务或子任务已成功完成。
    *   用户发起话题切换，准备开始新的主题。
    *   Agent 检测到对话历史过长（例如 > 10 轮），有丢失关键技术细节的风险。

**描述 (Description):**
此 Skill 充当“外部记忆库”。它创建当前会话状态的结构化快照，确保即使对话上下文被重置，项目状态也能瞬间恢复。

**执行步骤 (Steps):**

1.  **分析上下文 (Analyze Context)**:
    *   总结 **当前焦点 (Current Focus)** (我们在构建或修复什么？)。
    *   列出 **关键决策 (Key Decisions)** (本次会话中做出的架构选择、库变更等)。
    *   更新 **任务状态 (Task Status)** (`todo.json` 中哪些已完成，哪些待办)。
    *   识别 **遗留问题 (Unresolved Issues)** 或阻碍点。

2.  **生成快照 (Generate Snapshot)**:
    *   基于上述分析创建 Markdown 内容。
    *   **文件名格式**: `dev_docs/memories/memory_YYYY-MM-DD_HH-mm.md` (使用当前系统时间)。

3.  **保存文件 (Save File)**:
    *   将内容写入文件。

4.  **通知用户 (Notify User)**:
    *   **手动触发时**: "已为您保存当前记忆快照：[Filename]"
    *   **自动触发时**: "（自动存档）检测到任务节点，已自动保存当前上下文记忆：[Filename]"

**语言要求 (Language Requirement):**
记忆文件中的所有输出内容**必须**使用中文。
