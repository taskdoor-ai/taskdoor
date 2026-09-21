# TaskDoor realistic bundle B 独立审计

审计对象：

- `/tmp/agentdoor-realistic-bundle-b.json`
- `/tmp/agentdoor-realistic-expectations-b.json`

审计依据：`validate_realistic_data.py`、`planning-v0.2.md`、`planning-v0.2.schema.json`、`validate_plan.py` 与 `evaluate.py`。本报告只审计离线合成夹具及可评分性，不修改原文件，不代表生产 ACL、真实附件读取、幂等提交或任务写入已经验证。

## 结论

**条件通过。** 四个场景的业务语义、任务树、依赖图、版本化文件、讨论线程、历史记录、查重与完成记录保护都达到高密度合成测试要求；任务依赖均为 DAG，引用没有悬空，文件目录与同 ID `sourceRefs` 全部配对，讨论回复均在同一线程且晚于父消息。当前片段合并前仍有两个分类字段问题必须修复，否则 `validate_realistic_data.py` 会失败。

把片段临时补上顶层 `dataPolicy.classification=synthetic` 后运行密度校验，唯一错误是四个场景均缺少 `input.dataClassification="synthetic"`。直接对片段运行时还会额外报告顶层 `fixtures.dataPolicy.classification` 缺失。四个输入通过 `validate_plan._input_errors()`；源证据 ID 无重复，所有任务 owner 均属于对应团队，所有记录时间均不晚于快照 `asOf`。

数据总量：4 个团队、30 名成员、59 个任务、30 个文件目录项、36 条讨论、14 个讨论线程、22 条回复、24 条历史、30 条依赖边、23 条跨一级分支依赖、13 个确认字段、15 个查重候选。四个场景任务树最大深度均为 4。

## 必须修复

1. **合并后的总夹具必须提供顶层分类对象。** 当前片段只有 `syntheticNotice`，而密度校验读取 `dataPolicy.classification`。合并时至少写入：

   ```json
   {
     "dataPolicy": {
       "classification": "synthetic",
       "noProductionData": true
     }
   }
   ```

2. **四个场景的 `input` 都必须增加 `dataClassification: "synthetic"`。** 缺失场景为 `REAL-B-NPI-01`、`REAL-B-LOG-01`、`REAL-B-RETAIL-01`、`REAL-B-PROC-01`。这是当前结构化校验的四个实际失败项。

除上述两点外，没有发现必须修改的悬空 ID、父子环、依赖环、文件配对、线程引用、历史引用或期望字段错误。

## 建议修复与测试增强

1. **明确成员注入边界。** 场景 `input` 自身没有 `members`，成员只存于顶层 `teams`。当前 `evaluate.prepare()` 会在 ACL verified 且团队处于授权范围时把相应成员注入冻结输入，因此正式离线评测不会丢失成员信息；但直接消费 `scenario.input` 会看到空成员集合。建议合并后加一个单测，断言四个冻结输入分别含 7、7、8、8 名成员，并保留职责证据与可用窗口；如果夹具要脱离 `evaluate.prepare()` 复用，则直接在 `input.members` 中展开成员。
2. **加强密度校验器。** 当前脚本只检查讨论回复是否存在，没有检查回复与父消息同线程、回复时间晚于父消息，也没有检查讨论/历史不晚于 `asOf`、task owner 属于成员快照、task `sourceRefs` 均存在。B 组数据实际全部满足，建议把这些条件加入校验，防止后续回归。
3. **自动评分仍需语义复核。** `requiredUpdateTaskIds` 只验证命中了哪些任务，`requiredEvidenceRefs` 只验证输出任意位置是否出现来源；一个执行器可能把来源集中堆在 `reasoningSummary`，或对已有依赖的任务只改无关 `tips`，仍通过部分结构分。B 组 `manualChecks` 已覆盖这些风险，最终结论必须结合逐例语义审阅，不能只看 `structurally_valid`。
4. **文件测试当前只覆盖目录元数据与相关节选。** 30 个文件有版本、状态、64 位 checksum、任务关联及同 ID `sourceRefs`，足以测试 planner 的版本判断；它们没有真实二进制附件内容，因此不能据此声称附件上传、下载、解析、checksum 与实体文件一致已经验证。若明天要验证文件链路，应另加 synthetic attachment transport 测试，不把这一层混入规划语义结论。
5. **`requiredEvidenceGroups` 应只放可替代证据。** 大多数组内来源语义可替代；`REAL-B-NPI-01` 的 BOM v5 与 RC 图纸、`REAL-B-PROC-01` 的 NDA 与质量报告分别代表两个不同完成项，自动评分目前只要求每组命中任意一个。现有 `mustPreserveTaskIds`/`mustNotUpdateTaskIds` 和人工检查能兜底；若要求自动评分逐项核实引用，应把这些来源移入 `requiredEvidenceRefs`。

## 每场景事实摘要

### REAL-B-NPI-01｜制造业 NPI 版本变更

- 团队 7 人；14 个任务，状态为 9 `in_progress`、3 `completed`、1 `blocked`、1 `open`；树深 4。
- 6 条依赖边，其中 5 条跨一级分支。当前图无环；期望补入 PCN、来料、作业指导、DVT 与门禁间的真实消费者依赖。
- 8 个文件，包含 ECO-042 v2/v3、BOM v5、RC 图纸、PCN v3、来料清单、作业指导和 COC 占位记录；8 个文件均有同 ID `sourceRef`。
- 9 条讨论、3 个线程、6 条回复；6 条历史；3 个确认字段；4 个现有查重匹配。
- 语义自洽：ECO v3 只影响四个既有消费者；BOM、图纸、PCN 的完成记录不可重开；9 月 7 日 COC 是承诺而非完成事实，9 月 10 日试制是硬边界。`ready_for_confirmation` 可成立，但输出必须保留条件和风险，不能把 COC 写成已收。
- 期望可评分：允许 `replan`，0 create、恰好覆盖四个允许 update 的现有消费者；required dependency 均指向可见任务并保持 DAG；确认字段没有落在可更新范围内。

### REAL-B-LOG-01｜物流仓切换的分页上下文

- 团队 7 人；当前只见 13/27 个任务，状态为 9 `in_progress`、2 `completed`、1 `blocked`、1 `open`；树深 4。
- 当前页 4 条依赖边，全部跨一级分支且无环；6 个文件；7 条讨论、3 个线程、4 条回复；5 条历史；3 个确认字段；2 个 partial 查重匹配。
- `coverage` 对 tasks/subtasks/discussions/history 均为 `partial`，`sourceRefs` 明确给出任务游标 `b-log-page-2`、`b-log-page-3` 和讨论游标 `b-log-thread-page-2`；文件目录为 complete。
- 语义自洽：面单映射 v4 已知影响局部消费者，但剩余 14 项和部分讨论未读；关务 SFTP 只有审批编号与预计时间，无凭据正文。正确结果应是 `needs_clarification`、`proposal=null`、`retry_context`，而非猜测完整消费者或承诺全树就绪。
- 期望可评分：max create/update 均为 0；partial duplicate 状态和两项匹配可直接回显；禁止暴露的隐藏 ID/凭据字符串不在授权输入中。

### REAL-B-RETAIL-01｜零售门店开业硬期限重排

- 团队 8 人；16 个任务，状态为 9 `in_progress`、3 `completed`、3 `open`、1 `blocked`；树深 4。
- 10 条依赖边，其中 7 条跨一级分支，无环；8 个文件；10 条讨论、4 个线程、6 条回复；7 条历史；4 个确认字段；4 个查重匹配。
- 语义自洽：物业 v3 把整批进场推迟到 9 月 13 日，现有货架任务 9 月 12 日期冲突是故意设置的重规划触发点；只应调整货架、入库、陈列和软开门禁，POS/培训不受货梯影响。消防 9 月 18 日只是约见，不是通过。
- 被拒绝的夜间搬运与“把预约当通过”提议均由后续 decision 明确否定；平面图、招牌、物业交付完成记录有历史和文件双重证据。
- 期望可评分：0 create、最多并要求四个 update；softopen 的确认 dueOn 仍锁定，更新只能在其他字段表达依赖与风险；所需依赖不会产生环。

### REAL-B-PROC-01｜供应商准入实体资料小版本变更

- 团队 8 人；16 个任务，状态为 10 `in_progress`、3 `completed`、2 `blocked`、1 `open`；树深 4。
- 10 条依赖边，其中 7 条跨一级分支，无环；8 个文件；10 条讨论、4 个线程、6 条回复；6 条历史；3 个确认字段；5 个查重匹配。
- 语义自洽：登记册 v3 只补地址，法律实体号、税号和人员不变；制裁筛查、NDA、样品试用都可复用。MSA、税务、银行及门禁消费新地址；银行函 9 月 7 日仅是外部承诺。
- 被撤回的重签 NDA 与未接受的“快速准入”都有后续讨论证据；9 月 10 日门禁和 9 月 12 日首单硬边界保留风险。
- 期望可评分：0 create、最多并要求五个既有消费者 update；required dependencies 均引用可见任务，且不会形成环；受保护完成项与确认字段不在允许更新范围。

## 审计证据

- 严格 JSON 读取：两个文件均可解析，无重复键或非有限数。
- `validate_plan._input_errors()`：四个场景均返回空错误数组。
- `validate_realistic_data.validate()`：临时补顶层分类后仅返回四个 `dataClassification must be synthetic`；任务/文件/讨论/历史/期望项未返回其他错误。
- 自定义交叉核对：59 个 task sourceRef 全部存在；30 个 file 均有同 ID `synthetic_file_store` sourceRef；成员可用窗口均有成员 evidence；22 条 reply 均同线程、晚于父消息；所有任务 owner 都属于相应团队；所有 discussion/history 时间均不晚于 `asOf`；注入成员后证据 ID 仍无重复。

因此，修复两个合成分类字段并保留 `evaluate.prepare()` 的成员注入后，B 组可以进入盲测。结构通过只能证明契约和交叉引用，四个场景仍应逐例做人工语义审阅，特别检查“只改真正消费者”“未知外部结果不当完成”“部分上下文不猜全树”三类行为。
