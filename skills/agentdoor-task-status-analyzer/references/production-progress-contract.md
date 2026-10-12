# 正式项目燃起图接入契约

核验仓库：`nocoly/taskdoor`，分支 `sand`，提交 `74c3ac267123a457e027465a32c10a37d833387b`。
源文件：`apps/web/src/shared/model/task-burn-up.ts`、`apps/web/src/features/tasks/lib/task-progress-comparison.ts`。后续接入重新核对版本，不把本地 demo 当成正式接口。

## 分析输出

`result.progress.comparison` 是以下正式前端数据字段的分析提案，缺少足够上下文时为 null。字段名称与正式项目一致；不输出 `source: example` 或虚构 scenario。它不是 MCP 写入参数。

```typescript
type ProgressComparisonProposal = {
  asOf: string // YYYY-MM-DD，本次观察日期，来自输入固定时钟
  explanation: string
  workload: {at: string; scopeMinutes: number; completedMinutes: number; scopeVersion: string; note?: string}[]
  creation?: {at: string; scopeMinutes: number}
  aiAssessment?: {observedAt: string; completedMinutes: number; scopeMinutes: number; scopeVersion: string; basis?: string}
  forecastTrend?: {
    asOf: string; scopeVersion: string; startMinutes: number
    points: {at: string; completedMinutes: number; note: string}[]
    scopePoints?: {at: string; scopeMinutes: number; note: string}[]
  }
  expected: {scopeVersion: string; points: {at: string; completedMinutes: number}[]}
  timing: {startOn: string; dueOn: string | null; forecastOn: string | null; completedOn?: string; scopeVersion: string; basis: string}
}
```

- workload 只保留真实历史记录，不用当前估算回填过去；未知完成量不能补零。若正式比较组件所需完整 workload 不可得，comparison=null，继续返回已有 progress/trend 部分。
- creation 仅来自创建时保留的估算与日期；创建时有总量不代表完成量为零。
- aiAssessment 是独立 AI 观察，绑定当前范围版本、观察时间和依据；不覆盖用户确认或历史。
- expected 是已保存的计划工作量曲线，不是测试用例的预期答案。没有计划曲线则 points=[]；不能从截止日期插值制造计划。
- timing.startOn 读取正式项目接受的起点记录，未知则 comparison=null；dueOn 读取任务截止日期。forecastOn 由交付节奏、剩余投入、依赖和恢复假设推导，缺依据为 null；不能把截止日期作为预测完成日。
- completedOn 仅从用户确认完成记录读取，未知就省略。100% 的 AI 判断、文件上传或讨论声称均不能产生实际确认完成日。
- forecastTrend 从当前已记录完成量开始。节点必须有交付日期、累计完成量和依据；等待阶段持平，最后节点在 forecastOn 达到当日总量。只有预测日期不造中间节点。scopePoints 单独记录预计范围变化，不修改当前分母或历史。
- 分钟字段使用非负安全整数，同一口径；scopeVersion 只能来自输入正式范围版本，不用任务版本假冒。燃起图人天展示使用正式项目的 480 分钟/人天，不使用分档百分比反算曲线。

## 程序计算的差值

接入层按正式项目 getTaskProgressComparison 计算，不让模型自由填写差值：

- finishOn = completedOn ?? forecastOn（确认完成优先，预测与确认分别留存）。
- deltaDays = finishOn 与 dueOn 的日历日期差；正数延期、负数提前、零按期，缺日期为 null。日期按项目 taskCalendarTimeZone 处理。
- deltaMinutes = 当前完成量 − 同范围版本的当前计划完成量；deltaPoints 为两者比例的百分点差。这与延期天数是不同量，不能混用。
- 计划版本不匹配或没有计划曲线时，计划差值未知；不显示为零。
- 历史、未来预测分别用阶梯线；总量灰色、记录完成量蓝色、AI 预测紫色虚线。截止、预测、确认日期独立展示，差值只表示日期差。

## 当前接入限制

正式 TaskBurnUpSeries 支持 source=recorded/example，但历史点使用 scopeHours/completedHours，转换时 minutes/60，并保留 estimatedLeafCount/totalLeafCount；未知覆盖数不伪造。
正式 TaskProgressComparisonSeries 及 getTaskProgressComparison 当前只接受 source=example，尚不能无改动消费真实分析。生产接入须先扩展正式类型和校验以接受真实来源，再映射本提案；禁止把真实输出标成 example 绕过校验。正式 MCP 当前没有分析回写工具，不能宣称分析已保存到任务。

## 隔离评测

用例输入仅含正式任务记录、固定时钟、范围版本、历史、计划、确认与可追溯执行依据；预期结果不得进入输入。分别验收：有据预测、缺依据保持未知、提前/按期/延期、人工确认与 AI100%分离、范围版本失配、未来范围增加、只有日期没有节点。预设日期与量值由输入证据确定；差值由程序计算再对照，不用另一个模型凭感觉决定数值。
