# TaskDoor realistic bundle C 独立审计

审计日期：2026-09-01  
审计对象：

- `/tmp/agentdoor-realistic-bundle-c.json`
- `/tmp/agentdoor-realistic-expectations-c.json`

本报告以审计末次读取的文件为准：

- bundle SHA-256：`696a06ae74c5f26a5ce2d3b47e253a08008b2192fe7d40039dd887bbeb95f94f`
- expectations SHA-256：`be5f2c423a8c279743993ab1a66e7db29922aa961795b2a5da5339419b959326`

审计只检查高保真**合成数据**及离线 Skill 评测可用性，不代表生产 ACL、真实人员可用性、任务写入、外部系统或业务验收已验证。

## 结论

**条件通过。** C 组的四个业务情境在任务树、依赖、文件与 sourceRef 配对、讨论线程、历史、确认字段、查重候选和期望引用方面已经自洽；补齐 5 个合成数据分类字段后，`validate_realistic_data.py` 返回 `valid: true`、零错误。

当前原始文件仍不能直接通过真实性验证器，必须补齐：

1. 顶层 `dataPolicy.classification = "synthetic"`；建议同时保留 `purpose` 与 `noProductionData: true`。
2. 四个场景各自的 `input.dataClassification = "synthetic"`。

这 5 项是当前唯一的结构阻断项。修复后复算汇总为：4 个团队、4 个场景、30 名可指派成员、5 名不可指派外部发言人、63 个任务、30 个文件、37 条讨论、26 条历史、37 条依赖、18 个确认字段和 11 个查重候选。

## 审计方法与证据

对照了：

- `skills/agentdoor-task-planner/scripts/validate_realistic_data.py`
- `skills/agentdoor-task-planner/scripts/validate_plan.py`
- `skills/agentdoor-task-planner/references/planning-v0.2.md`
- `skills/agentdoor-task-planner/scripts/evaluate.py` 的期望评分逻辑

执行了以下检查：

- 严格 JSON 读取、ID 唯一性和所有跨引用核对。
- 任务父子树深度、缺失父节点、父循环、依赖悬空、父子依赖、依赖环和跨分支交接检查。
- 每个文件的 ID、版本、状态、checksum、linkedTaskIds 与同 ID `sourceRefs` 摘要逐项配对；30/30 的版本、状态、checksum 和任务关联均可在摘要中核对。
- 讨论作者必须来自成员或 `context.stakeholders`；外部客户、审计、候选人、物业和业主均登记为 `assignable:false`。回复目标存在且 threadId 相同。
- 历史、确认字段、查重候选、期望任务 ID 和证据 ID 均指向当前快照中的合法实体。
- `mustPreserveTaskIds` 精确等于“任务全集减去 requiredUpdateTaskIds”；四个场景均无“既要求更新又要求保留”的评分矛盾。
- 对 confirmedFields 的值与现有任务逐项比对，18/18 完全一致。
- 在内存中只补充上述分类字段后重新运行真实性验证器，结果为 `valid: true`、`errors: []`；没有修改原始文件。

## 必须修复

### M1. 补齐合成数据分类

当前验证器输出 5 个错误：顶层分类为空，`REAL-C-01` 至 `REAL-C-04` 的输入分类均为空。分类不是装饰字段，它使测试归档能够明确证明这些客户、候选人、财务、住宅、文件和隐私标识都是合成数据，避免被误当成生产快照。

建议合并时统一写入：

```json
{
  "dataPolicy": {
    "classification": "synthetic",
    "purpose": "offline task-planner evaluation",
    "noProductionData": true
  }
}
```

并在每个 `scenario.input` 增加：

```json
"dataClassification": "synthetic"
```

## 与最终总包的覆盖关系

C 组四例都是 `historyProfile=rich`，各有 6–7 条历史，本组用于检验历史、讨论、文件版本和正式任务状态发生冲突时的判断。审计期间，总包已另用 `REAL-A-SAAS-01` 覆盖 `coverage.history=complete + history=[]`，用 `REAL-B-LOG-01` 覆盖 partial history；因此“丰富历史／完整空历史／部分历史”三条路径不再是总包缺口。最终报告应分别列出这三类结果，避免把 C 组的 rich-history 通过误述为单独覆盖全部退化路径。

## 建议修复或增强

### S1. 让场景输入可脱离 prepare 脚本独立执行

四个 `scenario.input` 当前不直接包含 `members`；`evaluate.py prepare` 会在 ACL、teamId 和 authorizedTeamIds 匹配时从顶层 teams 注入成员，真实性验证器也使用同样回退，所以标准评测路径有效。但直接拿单个 `scenario.input` 调用规划器时，成员候选会为空。

可选方案：保留现状并在 fixture README 明确“必须经 prepare”；或在冻结输入前显式物化 members，并测试注入后哈希。不要把外部 stakeholder 混入 members；其 `assignable:false` 分离是正确的。

### S2. 增加至少一例已知成员可用窗口或明确不可用

30 名成员的 availability 全部是 unknown，这正确防止模型从职责或在办任务猜容量，但不能测试“职责匹配但时间不可用”“替补可用但职责边界不足”等成员推荐冲突。建议整套 realistic 数据保留多数 unknown，同时至少加入：

- 一位职责最匹配但硬窗口不可用的成员；
- 一位只部分可投入的成员；
- 一位可用但越过职责边界的成员。

这样才能验证推荐理由同时使用职责、边界与可用性，而不是只按角色名匹配。

### S3. 期望中的必引证据略偏严格

四例都要求逐字引用 4–6 个固定 evidenceRef。核心文件、硬截止和隐私边界属于不可替代证据；但“撤回错误建议”或“冲突日报”等证据有时可由请求、任务状态或正式文件等价证明。当前评分可能把业务上正确但选择了等价来源的输出判为失败。

建议将不可替代来源留在 `requiredEvidenceRefs`，将等价证明放入 `requiredEvidenceGroups`，并由 manualChecks 判断是否正确处理冲突。这样仍能迫使规划器读取动态讨论，又不会把表达路径当成唯一答案。

### S4. 文件元数据可再接近真实协作系统

当前 30 个文件已有 MIME、版本、64 位 checksum、状态、任务关联和来源，足够验证版本与授权边界。若要继续提升真实性，可增补不含敏感信息的 `sizeBytes`、`createdAt`、`updatedAt`、`uploadedById`、`accessClass` 和 `supersedesFileId`，用于测试旧版、并发上传和受限附件。不要添加真实 URL、真实地址或真实人员数据。

## 每场景事实摘要

| 场景 | 数据密度 | 本轮应有最小差异 | 关键语义判断 | 审计结果 |
| --- | --- | --- | --- | --- |
| REAL-C-01 内容战役 | 16 任务，4 层，9 依赖；7 文件；9 讨论/3 回复；6 历史；2 查重 | 仅更新 `cc-claim-v2`、`cc-landing-copy`、`cc-email-copy`，0 新建 | 客户 v2 回执与合规矩阵是现行依据；落地页和邮件从历史 v1 改接 v2；付费、CRM、上线核对通过既有依赖传递结果；策略、简报、v1、主视觉和已确认根字段不动 | 语义自洽。外部客户审批人正确建模为不可指派 stakeholder；撤回讨论、草稿与正式回执区分清楚 |
| REAL-C-02 财务关账 | 15 任务，4 层，8 依赖；8 文件；9 讨论/3 回复；6 历史；2 查重 | 仅更新 `fc-transfer-clear` 与 `fc-fx`，0 新建 | 已完成银行对账保留；异常任务等待带章回单，外币重估新增异常前置；报表、审计索引和董事会包保留既有交接；薪资只暴露封存状态/合计；51 小时为自然等待而非 EWD | 语义自洽。现有依赖无父子关系、无环；审计问询人不可指派。建议 manual check 明确异常任务实际改变字段，避免无意义改写来满足 requiredUpdate |
| REAL-C-03 招聘入职 | 16 任务，4 层，11 依赖；7 文件；10 讨论/2 回复；7 历史；4 查重 | 更新日期归档、基础账号、笔记本、薪资登记和入职日核对，0 新建 | 日期变更不覆盖已完成录用历史；基础账号与生产权限分层；生产权限继续依赖背景状态、培训和岗位范围，且不是入职日必需项；背景发现、证件、银行、地址等不得输出 | 语义自洽。候选人只作为不可指派 stakeholder；敏感正文未进入快照，sentinel 可用于泄露检测 |
| REAL-C-04 装修移交 | 16 任务，4 层，9 依赖；8 文件；9 讨论/3 回复；7 历史；3 查重 | 更新 RCD 正式复测、电气证书、业主复验，0 新建 | 复测受 9/18 90 分钟物业窗口约束；证书等待正式复测并预计 9/19 出具；业主复验依赖证书与木作；9/20 钥匙窗口不自动顺延；预检、受理回执、现场日报均不等于完成 | 语义自洽。物业审批人和业主均不可指派，且不具备专业证书或任务写入权；室内原图和住户信息有明确泄露 sentinel |

## 当前可确认的通过项

- 4 个任务树均达到 4 层；所有父节点存在，无父循环。
- 37 条依赖均引用可见任务，无自环、父子依赖和依赖环；每例均含跨分支交接。
- 30/30 文件都有同 ID `synthetic_file_store` sourceRef，checksum 为 64 位小写十六进制，linkedTaskIds 全部存在。
- 37 条讨论覆盖 decision、proposal、report、question 中至少三类；所有回复目标存在且 threadId 一致。
- 5 名外部发言人均与 30 名成员 ID 分离且 `assignable:false`，不会进入 Owner/Participant 推荐。
- 26 条历史全部关联可见任务，并明确区分完成、阻塞、版本加入、日期确认和受限读取等事件。
- 18 个 confirmedFields 与当前任务字段完全一致；期望没有要求更新已确认字段或终态任务。
- 11 个查重候选全部指向可见任务；same_outcome、overlap 与 different-instance 解释具备具体对象、周期或版本依据。
- 期望只使用当前评分器支持的字段；任务与证据引用全部可评分。

## 审计边界

本审计没有生成规划器输出，因此“场景可评分”不等于模型已通过这些场景；还需冻结输入、由未见 expectations 的执行者生成输出，再运行结构检查和独立语义复核。也没有连接生产任务、真实文件库、成员日历或外部系统，不能据此宣称生产可用。
