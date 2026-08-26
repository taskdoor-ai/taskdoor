# Vokal × AgentDoor 2 产品分析与测试交接

> 日期：2026-08-24  
> 用途：把今天对 Vokal 的研究、实测和演示搭建上下文带入 AgentDoor 2 工作空间继续推进。  
> 状态原则：以下内容明确区分“已验证”“当前判断”和“待验证”。

## 1. 一句话结论

Vokal 不是另一个单人 Agent 或聊天工具，而是一个面向人类与多个 Agent 的团队协作层：Agent 仍可在本地运行、读取指定项目并使用本地模型能力；Vokal 为它增加身份、Owner、权限、Channel、Group、共享文档、任务、运行状态与团队交接。

它最值得关注的价值不是“Agent 回答得更聪明”，而是把个人私有的 Agent 工作变成可共享、可分工、可追踪、可审查、可由人类决定的团队工作。

## 2. 我们希望验证的产品命题

1. 本地 Agent 是否能在团队空间中拥有稳定身份与职责。
2. 多个 Agent 能否围绕同一个 Channel、Document 和 Task 接力，而不是复制聊天记录。
3. Agent 的本地源码访问和团队共享内容是否可以分开控制。
4. 人类是否能看到过程、修改范围、暂停或重定向，并保留最终决定权。
5. 共享文档、任务、运行记录和决策能否成为团队的持续上下文。

## 3. 已验证的产品结构

### Agents

- Agent 由角色指令、Runtime、模型、工作目录和 Vokal 权限组合而成。
- 当前 Runtime 使用本地 Codex；实际推理和本地文件操作发生在用户电脑上。
- Vokal 管理 Agent 的身份、消息、共享上下文、团队权限和运行观察。

### Agent Groups

- Group 表达“一支由哪些 Agent 构成的队伍”。
- Group 本身不自动共享全部数据，需要部署到具体 Channel。

### Channels

- Channel 是实际协作、消息触发、文件共享和任务发生的空间。
- Agent 当前设置为 `Mentions only`，需要真实 @mention 才会响应 Channel 消息。

### Documents

- 文档可作为共同事实源和持续更新的交付物。
- 可单独把成员或 Agent 设置为 Editor。

### Tasks

- Channel 内提供 Todo、In Progress、Needs Review、Done 看板。
- 任务可指定人类或 Agent，包含标题、描述、来源 Channel 和状态。

### 本地文件访问

- Working folder 决定本地 Agent 新会话的起始目录。
- 本地文件不会因为 Agent 加入 Vokal 就自动上传；进入 Channel 的消息、附件、文档、任务和显式引用才成为团队共享内容。

## 4. 当前真实搭建结果

### 本地项目

- AgentDoor 2 路径：`/Users/yxzuji/Documents/ChatGPT/agentdoor2`

### 三个在线 Agent

1. **Product Manager**
   - 职责：提炼用户问题、定义 MVP、成功指标和非目标，形成 Decision Brief。
   - 不负责修改代码。

2. **Cosmo / Engineering**
   - Runtime：本地 Codex。
   - Working folder：AgentDoor 2 真实项目目录。
   - 职责：只读理解架构，引用文件路径，评估改动范围、风险和测试建议。
   - 约束：未经人类批准，不修改代码、不安装依赖、不提交 Git。

3. **Nova / Reviewer**
   - 职责：交叉审查产品与技术方案，区分事实和推断。
   - 输出共识、分歧、证据不足、风险和需要人类决定的事项。
   - 不自行批准开发或上线。

### 协作空间

- Agent Group：`AgentDoor Feature Squad`
- Channel：`#agentdoor-feature-review`
- 成员：用户、Product Manager、Cosmo、Nova。
- Channel 用途：共享脱敏结论、证据摘要、任务状态、交接和人类决策。

### 共享文档

- 名称：`AgentDoor Shared Agent Template Review`
- 三个 Agent 都已获得 Editor 权限。
- 文档包括：测试目标、背景、用户问题、角色分工、约束，以及以下四个产物区：
  - Decision Brief
  - Technical Assessment
  - Review Memo
  - Human Decision

### 三张任务卡

1. `输出 Decision Brief 并更新共享文档` → Product Manager
2. `只读评估 AgentDoor 2 技术影响` → Cosmo
3. `交叉审查产品与技术方案` → Nova

任务均要求完成后更新共享文档、在 Channel 发布脱敏摘要，并交接给下一角色。

## 5. 当前测试题目

评估 AgentDoor 2 是否应该增加“团队共享 Agent 模板”能力。

核心问题：

1. 模板应该共享哪些内容：角色指令、Skills、模型偏好、连接器声明、权限建议？
2. 哪些内容必须保持本地：API Key、Token、绝对路径、用户数据、运行日志？
3. 接收者导入模板时，如何解释权限差异、运行环境差异和缺失连接器？
4. 谁能发布、编辑、撤回和复制模板？
5. 模板更新后是否影响已经复制的 Agent？
6. 是否需要版本、来源、审计和权限检查记录？

建议 MVP 边界：

- 仅同一 Workspace 内共享，不做公共模板市场。
- 只允许 Owner 发布或撤回。
- 不复制任何密钥和个人连接器凭据。
- 接收者必须重新授权自己的 Connector。
- 第一版只覆盖保存、共享、复制和导入前权限检查。

## 6. 本轮安全约束

- 不修改 AgentDoor 2 源码。
- 不安装依赖，不执行迁移，不提交或 Push Git。
- 不在 Channel 上传完整源码、配置文件、密钥或客户原始数据。
- 技术 Agent 只共享必要文件路径、模块关系、影响范围和少量证据摘要。
- 所有推断必须标注；最终是否开发由人类决定。

## 7. 已遇到并解决的技术问题

### 模型版本提示

Vokal 曾提示 `gpt-5.6-sol[low]` 需要 Codex CLI 0.144.0+。实测环境：

- Codex CLI：0.145.0
- ChatGPT 内置 Codex：0.148.0-alpha.15
- codex-acp：1.6.2

模型版本不是最终阻塞原因。

### Vokal 文件沙箱 EPERM

真实失败日志为 Node 执行 `lstat('/Users/yxzuji')` 时被 Vokal 生成的 OS 文件沙箱拒绝，三个并发 Agent 进程全部报 `EPERM`。

临时解决：关闭相关 Agent 的 Folder Access 沙箱后启动成功。当前 Product Manager 和 Cosmo 使用 Full access / No filesystem sandbox 以保证演示稳定。

风险：这是演示性 workaround，会扩大本地文件访问范围。正式环境需要使用独立 Demo 仓库、低权限账户，或等待 Vokal 修复 Node/NVM 路径的沙箱规则。

## 8. 当前状态

已验证：

- 三个本地 Codex Agent 均可创建并上线。
- Cosmo 可把 Working folder 指向 AgentDoor 2。
- Group 可部署到 Channel。
- Channel 可同时容纳人类和多个 Agent。
- 文档可共享给多个 Agent 并授予 Editor。
- Channel 可创建并分配 Agent 任务卡。
- 真实 @mention 已触发三个 Agent，界面显示多个 Agent active。

仍待验证：

- 三个 Agent 是否会按顺序完成文档写回和任务状态更新。
- Activity / Live Run 是否能稳定显示文件读取和工具调用。
- Redirect、Pause、Stop 的真实中途干预体验。
- Agent 是否会严格遵守“只读、不泄露源码”的约束。
- Document、Task、Channel 历史是否能在后续会话中稳定恢复上下文。
- 正式企业环境下的权限、审计、数据保留和隐私边界。

## 9. 在 AgentDoor 2 中继续工作的建议

请先只读完成以下工作：

1. 识别 AgentDoor 2 中与 Agent 配置、模板保存、导入导出、成员权限、连接器和发布流程相关的目录与文件。
2. 输出当前领域模型和数据流，不修改代码。
3. 对照“团队共享 Agent 模板”MVP，给出：
   - 需要新增或修改的模块；
   - 数据结构草案；
   - 权限检查点；
   - 敏感字段过滤规则；
   - 导入时的环境兼容检查；
   - 最小测试矩阵；
   - 风险、未知项和需要人类决定的问题。
4. 所有结论引用真实文件路径；没有代码证据的内容标记为推断。
5. 在获得人类批准之前，不实施任何代码修改。

## 10. 建议的后续交付物

- AgentDoor 2 当前 Agent 配置模型图。
- 共享模板的最小数据 Schema。
- “可共享字段 / 必须剔除字段 / 需要重新授权字段”清单。
- 权限和数据泄漏威胁模型。
- 导入、复制、撤回、版本升级的状态流程。
- PRD 与验收标准。
- 技术影响地图与测试矩阵。
- 最终人类决策记录。

## 11. 原始研究资料

完整研究与演示共创稿位于：

- `/Users/yxzuji/Documents/Garfield/docs/vokal-product-analysis.md`

本交接稿是用于 AgentDoor 2 后续工作的精简事实源。
