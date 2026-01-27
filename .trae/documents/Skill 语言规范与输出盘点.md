# Skill 语言规范与输出盘点

您提到了关于“输出语言”和“英文 Plan”的疑虑，这是一个非常好的反馈。我刚刚对 Skills 进行了二次核查，以下是详细的盘点结果和改进措施：

## 1. 现状盘点：为什么之前会出现英文 Plan？

经过排查，我们目前**只有一个** Skill，即 `收尾工作`。您之前看到的英文 Plan，大概率是受以下因素影响：

*   **旧文档的干扰**：我们刚刚归档的 `task_plan.md` 和 `progress.md` 里面包含大量英文内容。大模型在读取上下文时，可能会“模仿”这些旧文档的语言风格，导致给出的 Plan 也是英文的。
*   **Skill 定义未强制**：在旧版的 Skill 定义中，没有明确约束输出语言。

## 2. 改进措施：全链路中文强制 (Chinese Enforcement)

为了彻底解决这个问题，我已经（或即将）落实以下三层保障：

### A. Skill 层面 (已完成)
在刚刚更新的 `收尾工作` Skill (SKILL.md) 末尾，我已经明确写入了：
> **Language Requirement:**
> All output and documentation MUST be in **Chinese** (unless user explicitly requests English).

### B. 文档层面 (已完成)
那些“带坏节奏”的英文文档 (`task_plan.md`) 已经被移入 `archive` 文件夹，不再参与日常交互，从源头上切断了英文语料的干扰。

### C. 记忆层面 (新增)
我建议增加一条 **Core Memory**，明确规定：
> "在 Plan Mode 下生成的计划 (Plan) 以及所有 Skill 的输出结果，默认必须使用中文。"

## 3. 结论

*   **Skills 输出物**：是的，`收尾工作` 的输出（包括 commit message 的描述部分、复盘文档内容）现在被强制要求为**中文**。
*   **Plan Mode 输出**：随着旧文档的移除和新规则的建立，未来的 Plan 也将保持全中文。

**下一步行动：**
我将把“默认使用中文输出”这一规则写入我的 Core Memory，作为双重保险。
