# 正式项目燃起图接入契约

核验日期：2026-10-15。核验仓库：`nocoly/taskdoor`，分支 `sand`，提交 `9b43f3405544ff8f7656dd5cb598b09748e1b79e`；本次为源码核验，未进行线上读写。
源文件：`apps/web/src/shared/model/task-burn-up.ts`、`apps/web/src/features/tasks/lib/task-progress-comparison.ts`、`apps/web/src/features/tasks/ai-progress-trend.ts`、`apps/web/src/features/tasks/lib/ai-trend-burnup.ts`、`apps/web/src/features/tasks/components/TaskAiAnalysisPanel.tsx`。后续接入重新核对版本，不把本地 demo 当成正式接口。

## 分析输出

`result.progress.comparison` 是以下正式前端数据字段的本地分析提案，缺少足够上下文时为 null。字段名称与正式项目一致；模型不输出 `source: example` 或虚构 scenario。以下是本地提案约束，不代表生产适配器已完整使用这些字段；当前实际接线和差异见“当前接入限制”。它不是 MCP 写入参数。

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
- 本次 evaluatedAt、文件或讨论的 createdAt/updatedAt 不是已保存工作量观察、创建基线或正式起点。当前分析判断已有成果时，仍可计算当前进度；不能把本轮完成量追加为输入中不存在的历史节点，也不能取文件日期填 timing.startOn。
- creation 仅来自创建时保留的 AI 初始估算与日期；不要求隐藏估时先人工确认，创建确认也不等于估算人工确认。创建时有总量不代表完成量为零；后续补估或重估不回填 creation。
- aiAssessment 是独立 AI 观察，绑定当前范围版本、观察时间和依据；不覆盖用户确认或历史。
- expected 是已保存的计划工作量曲线，不是测试用例的预期答案。没有计划曲线则 points=[]；不能从截止日期插值制造计划。
- timing.startOn 读取正式项目接受的起点记录，未知则 comparison=null；dueOn 读取任务截止日期。forecastOn 由交付节奏、剩余投入、正文所需材料与有据执行条件或恢复安排推导，缺依据为 null；不读取前置关系字段或边，不能把截止日期作为预测完成日。
- completedOn 仅从用户确认完成记录读取，未知就省略。100% 的 AI 判断、文件上传或讨论声称均不能产生实际确认完成日。
- AI 判断 100% 也不产生 forecastOn：当前成果已齐全只说明内容完成；没有有据执行/复核安排时不把观察日设为预计完成日。
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
正式 TaskProgressComparisonSeries 及 getTaskProgressComparison 的类型和检查仍只接受 `source:'example'`，但生产已经接入真实趋势：`getTaskAiProgressTrend` → `useAiProgressTrend` → `aiTrendBurnUp` → `TaskAiAnalysisPanel` → `TaskProgressComparison`。其中 `ai-trend-burnup.ts` 为兼容原图表，明确生成 `source:'example', scenario:'ai-progress-trend'`。这是现有应用适配实现，不表示模型可以自行给真实输出加示例标记或直接提交本地 comparison。

当前适配器与本地提案存在明确差异：只画最新一段数值已知且服务允许连续连接的历史，早期断点前的记录不进入图表；`scopeVersion` 是显示层生成的 `scope-N`，不是正式范围版本；`expected.points=[]`；`timing.startOn` 优先取任务创建日，否则取首个绘制点日期；没有映射 creation、aiAssessment 或人工确认完成日。不能把这些显示层回退值反向当成真实输入事实，也不能声称全量历史、正式起点和计划曲线均已接通。本地提案保留上述证据与未知项约束；接入服务按正式趋势接口及来源事实映射，另行处理当前适配差异。

正式产品分析链路由 `taskdoor-analyze-progress` / `taskdoor-refresh-progress` 生成生产协议，任务业务服务校验保存，并提供趋势读取。MCP 当前没有分析回写工具，本地 comparison 也不是该生产协议，不能宣称本地提案已保存。两者映射边界见 [MCP 分析适配](mcp-analysis.md#执行边界)。

## 隔离评测

用例输入仅含正式任务记录、固定时钟、范围版本、历史、计划、确认与可追溯执行依据；预期结果不得进入输入。分别验收：有据预测、缺依据保持未知、提前/按期/延期、人工确认与 AI100%分离、范围版本失配、未来范围增加、只有日期没有节点。预设日期与量值由输入证据确定；差值由程序计算再对照，不用另一个模型凭感觉决定数值。
