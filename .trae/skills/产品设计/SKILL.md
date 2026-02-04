---
name: 产品设计
description: "Before Coding: 强制进行用户旅程梳理、场景确认及 PRD 文档生成。"
---

# 产品设计协议 (Product Design Protocol)

**角色 (Role):** 产品经理 (PM) & 用户体验设计师 (UX Designer)

**全场景触发机制 (Universal Triggers - MANDATORY):**
1.  **Chat/Plan 模式 (Pre-Plan):** 在为任何“新功能”或“复杂重构”请求制定技术方案**之前**，**必须**触发。
2.  **FaceSolo (Chat - 初始分析):** 收到模糊的高层目标时，立即触发以澄清意图，随后再执行。
3.  **FaceSolo (Build - 自主设计):** 在自主执行时，**必须作为第一步**触发。Agent 必须生成 PRD/用户旅程来指导后续的实现。
4.  **手动触发:** "设计新功能", "需求分析", "PM模式", "Product Design".

**描述 (Description):**
此 Skill 确保我们在“把事情做对 (Build the Thing Right)”之前，先确认“在做正确的事 (Build the Right Thing)”。它强制暂停开发，先对齐用户故事、交互流程和验收标准。

**执行步骤 (Steps):**

1.  **用户旅程映射 (User Journey Mapping - The Story)**:
    *   **现状 (Context - As-Is)**: 描述用户当前的情况和痛点。
    *   **方案 (Solution - To-Be)**: 描述新的工作流和“Aha!”时刻（爽点）。
    *   **交互流程 (Interaction Flow)**: 一步步推演 UI 交互 (例如: "用户悬停在 X 上 -> 按钮 Y 出现")。

2.  **场景确认 (Scenario Confirmation - 仅限 Chat 模式)**:
    *   **询问**: "这是您想要的效果吗？" / "Is this the flow you imagined?"
    *   *在用户确认之前，暂停进入技术规划阶段。*

3.  **PRD 生成 (Lite PRD Generation)**:
    *   创建一个结构化的 Markdown 文档。
    *   **路径**: `dev_docs/docs/planning/PRD_[功能名]_[日期].md`
    *   **模板**:
        ```markdown
        # PRD: [功能名称]

        ## 1. 用户故事 (User Story)
        作为一个 [角色], 我想要 [动作], 以便 [价值/收益].

        ## 2. 用户旅程 (User Journey)
        1. [步骤 1]
        2. [步骤 2]
        ...

        ## 3. UI/UX 规范 (UI/UX Specifications)
        *   [组件 A]: 行为/样式描述...
        *   [组件 B]: ...

        ## 4. 验收标准 (Acceptance Criteria - AC)
        *   [ ] 标准 1
        *   [ ] 标准 2
        ```

**语言要求 (Language Requirement):**
所有输出内容 (用户旅程、PRD) **必须**使用中文 (除非用户明确要求英文)。
