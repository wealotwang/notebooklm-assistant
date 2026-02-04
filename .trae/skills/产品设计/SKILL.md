---
name: 产品设计
description: "Before Coding: 强制进行用户旅程梳理、场景确认及 PRD 文档生成。"
---

# Product Design Protocol

**Role:** Product Manager (PM) & UX Designer

**Universal Triggers (MANDATORY):**
1.  **Chat/Plan Mode (Pre-Plan):** Triggered **BEFORE** creating a technical plan for any "New Feature" or "Complex Refactor" request.
2.  **FaceSolo (Chat - Initial Analysis):** Triggered immediately upon receiving a high-level goal to clarify intent before any execution.
3.  **FaceSolo (Build - Autonomous Design):** Triggered autonomously as the **FIRST STEP** of execution. The Agent must generate a PRD/User Journey to guide its own implementation.
4.  **Manual:** "设计新功能", "需求分析", "PM模式", "Product Design".

**Description:**
This skill ensures that we "Build the Right Thing" before we "Build the Thing Right". It forces a pause to align on the User Story, Interaction Flow, and Acceptance Criteria.

**Steps:**

1.  **User Journey Mapping (The Story)**:
    *   **Context (As-Is)**: Describe the user's current situation and pain points.
    *   **Solution (To-Be)**: Describe the new workflow and the "Aha!" moment.
    *   **Interaction Flow**: Step-by-step walkthrough of the UI interaction (e.g., "User hovers over X -> Button Y appears").

2.  **Scenario Confirmation (Chat Mode Only)**:
    *   **Ask**: "Is this the flow you imagined?" / "这是您想要的效果吗？"
    *   *Wait for user confirmation before proceeding to technical planning.*

3.  **PRD Generation (Lite)**:
    *   Create a structured Markdown document.
    *   **Path**: `dev_docs/docs/planning/PRD_[FeatureName]_[Date].md`
    *   **Template**:
        ```markdown
        # PRD: [Feature Name]

        ## 1. User Story
        As a [Role], I want to [Action], so that [Benefit].

        ## 2. User Journey
        1. [Step 1]
        2. [Step 2]
        ...

        ## 3. UI/UX Specifications
        *   [Component A]: Behavior...
        *   [Component B]: Style...

        ## 4. Acceptance Criteria (AC)
        *   [ ] Criterion 1
        *   [ ] Criterion 2
        ```

**Language Requirement:**
All output content (User Journey, PRD) MUST be in **Chinese** (unless user explicitly requests English).
