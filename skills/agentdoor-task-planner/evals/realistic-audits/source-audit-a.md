# 真实场景数据包 A 独立审计

审计对象：

- `/tmp/agentdoor-realistic-bundle-a.json`
- `/tmp/agentdoor-realistic-expectations-a.json`

对照：`validate_realistic_data.py`、`validate_plan.py`、`references/planning-v0.2.md`。本审计没有修改被审文件。

## 结论

**有条件通过，修复 5 项后可并入 realistic 评测集。** 数据密度和主要业务逻辑较好：4 个行业、4 支 7 人团队，共 57 个任务、24 个文件、32 条讨论、24 条历史、39 条依赖、8 个确认字段、9 个查重候选；每个场景均为 4 层任务树，依赖图无环，所有任务、父子、依赖、Owner、文件关联、文件与 sourceRef 配对、讨论作者、历史任务、期望任务 ID 均可解析。

原始包直接运行真实性校验器得到 5 个错误：4 个场景缺 `input.dataClassification = "synthetic"`，包顶层缺 `dataPolicy.classification = "synthetic"`。在**仅用于审计的临时副本**中补齐这两类标记并将对应 `team.members` 注入 `input.members` 后，`validate_realistic_data.py` 为 `valid: true`，其余结构错误为 0。这证明骨架可用，但原包不能原样交给盲测执行器。

## 必须修复

1. **补齐合成数据分类。** 合并文件顶层加入 `dataPolicy.classification: "synthetic"`，4 个输入分别加入 `dataClassification: "synthetic"`。这是当前真实性校验器的硬要求，也避免把高拟真数据误称为生产数据。

2. **把团队快照放进每个 `input.members`。** 当前成员只存在于包顶层 `teams`；`evaluate.py` 冻结盲测时只复制 `scenario.input`，因此执行 Skill 实际看不到 28 名成员的职责、边界、证据和可用窗口。`validate_plan.py` 会把空成员列表当合法输入，这一遗漏不会被基础结构校验发现，但会让成员推荐能力无法测试。应按 `teamId` 将对应 7 人快照复制进每个场景输入，并保持同一快照内成员证据 ID 唯一。

3. **修正 SAAS 讨论的自相矛盾状态。** `syn-saas-d06` 的正文明确说“与正式任务仍 in_progress 并不冲突”，却标为 `state: conflicting_report`，并以 `conflictWithId: syn-saas-d05` 指向跨线程报告。建议改为普通 `active/contextual_report` 并移除冲突引用；否则模型会被要求同时相信“冲突”和“不冲突”。

4. **修正客服事故的跨线程回复。** `syn-cs-d08` 属于 `syn-cs-thread-status`，但 `replyToId` 指向 `syn-cs-thread-cases` 的 `syn-cs-d06`。线程树应保证回复父项与子项处于同一 `threadId`。可把 `replyToId` 改为同线程的 `syn-cs-d03`，再用单独的依据字段引用 `syn-cs-d05/syn-cs-d06`；或将该决定作为无父回复的新顶层状态结论。

5. **让客服场景的数据影响判断可机器评分。** `REAL-A-CS-01.manualChecks` 要求只能说“当前覆盖内尚未发现外泄迹象”，但现有 `requiredEvidenceRefs` 没有 `syn-cs-file-06` 或 `syn-cs-d07`，因此执行器即使完全不读数据影响证据也可通过结构评分。建议加入 `requiredEvidenceGroups: [["syn-cs-file-06", "syn-cs-d07"]]`。同理，恢复时长/队列与新增 P1 可分别改成等价证据组，减少对重复事实的双重强制引用。

## 建议修复

- `REAL-A-SAAS-01` 的 `syn-saas-mapping` 已完成，但完整历史中没有对应完成记录；现有 6 条历史里 `syn-saas-h06` 只是根任务快照刷新。若 `coverage.history = complete` 表示本轮相关历史完整，建议用映射完成记录替代快照刷新，或明确 coverage 的时间窗。
- `REAL-A-REL-01` 中已完成的 `syn-rel-regression` 依赖仍为 `in_progress` 的 `syn-rel-desktop`。真实系统可能因状态滞后出现这种快照，但应补一条讨论/历史解释“rc3 二进制已可测，桌面任务尚待其他收尾”，否则会被误读为完成项越过未完成前置。
- `syn-rel-d06`、`syn-ecom-d06` 的 `conflictWithId` 指向文件 ID，而 `syn-saas-d06`、`syn-cs-d06` 指向讨论 ID。协议未定义该扩展字段，建议拆为 `conflictWithDiscussionId` 与 `conflictWithSourceRef`，或在数据字典中声明允许的实体类型，避免消费者误把它当纯讨论外键。
- `REAL-A-ECOM-01` 机器评分要求复用渠道联检，但 `requiredEvidenceRefs` 未要求现有任务 `syn-ecom-channel-check` 或文件 `syn-ecom-file-02`。建议增加等价证据组 `[["syn-ecom-channel-check", "syn-ecom-file-02"]]`，使“复用已有结果”不只依赖人工检查。
- `mustNotCreateTitles` 只做标题精确相等检查，无法阻止“改个标题”的语义重复。例如“首波异常处置汇总卡”不会命中“形成首波异常处理总卡”。这属于评测器局限，必须保留人工语义审计，或后续增加 identity/outcome 级去重断言。
- 四个场景都有完整历史；若整套 realistic 数据要覆盖“有历史或没有历史”，应由其他数据包提供 `history = [] + coverage.complete`、`history.partial` 和 `history.unavailable` 三种不同语义，不能用空数组统一代表未知。

## 每场景事实摘要

### REAL-A-REL-01｜软件发布重规划

- 14 个任务、4 层、9 条依赖；6 个文件、8 条讨论、6 条历史、2 个查重候选。
- 已存在 `syn-rel-notary-v2`，新增要求是把它接入 `syn-rel-security-gate` 与 `syn-rel-store-submit`；不应再建回执、灰度或商店提交任务。
- `syn-rel-file-03` 是未签署草稿，讨论也明确 CLI 成功不等于公证完成；这能测试“文件状态、讨论报告、正式任务状态”三者分离。
- 期望只更新 2 个消费者依赖，保留 9 月 12 日、两小时灰度、Owner、确认字段与整棵父子树。依赖期望与现有状态差异自洽。

### REAL-A-SAAS-01｜SaaS 客户培训重复创建

- 13 个任务、4 层、8 条依赖；6 个文件、8 条讨论、6 条历史、2 个查重候选。
- 用户显式要求再建“15 名管理员培训验收”，但 `syn-saas-admin-training` 已覆盖相同客户、tenant、15 人、两批、9 月 10 日和证据边界。
- A 批 8 人仅有部分签到/测验，B 批未开始；讲义只是输入，不能把任务判为完成，也不能按两批拆成两个同结果任务。
- 期望 `intent=create + disposition=route_required`、零创建零更新、proposal 为空，符合协议的“保留用户原始意图但路由到现有任务”。

### REAL-A-ECOM-01｜电商开售下一批与跨分支依赖

- 15 个任务、4 层、12 条依赖；6 个文件、8 条讨论、6 条历史、3 个查重候选。
- 渠道联检、仓内异常卡、承运降级记录均已存在；仓内与承运是互补边界，不应另建“总异常卡”。
- `syn-ecom-launch-gate` 当前只有演练与仓位依赖，清单正文要求再接入渠道联检、仓内异常卡和承运降级，构成明确的结构化缺口。
- 期望仅更新开售闸门 1 项，结果依赖包含 5 个既有任务，保留 20:00、SKU、价格和已完成工作。机器依赖断言可评分且与 DAG 一致。

### REAL-A-CS-01｜客服事故只读状态查询

- 15 个任务、4 层、10 条依赖；6 个文件、8 条讨论、6 条历史、2 个查重候选。
- 当前仅稳定 45 分钟，队列仍有 37 条，切流后新增 4 个 P1，未满足连续 120 分钟、队列清零、无新增 P1 三个门槛。
- “已解决”话术已被事故指挥拒绝并撤回，正式根任务仍 `in_progress`；数据影响只能说当前日志覆盖内尚未发现外泄迹象。
- 期望 `query + route_required`、proposal 为空、零创建零更新，且明确禁止指派、发送和发布，符合只读查询协议。需修复跨线程回复及数据影响证据断言。

## 审计证据

- 原始真实性校验：57 tasks / 24 files / 32 discussions / 24 history / 39 dependency edges；仅报告 5 个合成分类缺失错误。
- 临时规范化副本校验：`valid: true`，4 个场景均为 maxTaskDepth 4，结构错误 0。
- `validate_plan._input_errors` 对 4 个原始输入均返回空列表；这也暴露了 `input.members` 缺失不会被当前基础验证器阻止。
- 全局 ID 检查：4 teamId、28 memberId、4 scenarioId、4 requestId、4 snapshotId、57 taskId、24 fileId、32 discussionId、24 historyId 均无重复。
- 所有文件与同 ID `synthetic_file_store` sourceRef 的 fileName、mimeType、version、checksum、status、linkedTaskIds 完全一致；任务 sourceRefs、Owner、讨论作者、历史任务均无悬空引用；父子图与依赖图均无环。

本审计只验证高拟真合成夹具和离线期望，不代表生产 ACL、真实文件读取、真实团队可用性或真实写入流程已经验证。
