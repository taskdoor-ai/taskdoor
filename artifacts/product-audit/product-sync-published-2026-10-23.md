# PM Demo 与正式项目交付记录 · 2026-10-23

本批按用户授权发布已确认的 10 项最终改法，原混合工作区保留。实现与 PRD 从 `d3033c0a` 隔离，交付分支 `codex/pm-input-discussion-files-2026-10-23`。

- PM Demo 实现：[`ef963ed4`](https://github.com/taskdoor-ai/taskdoor/commit/ef963ed41333f40835611458741e3663986ae049)；[PR #19](https://github.com/taskdoor-ai/taskdoor/pull/19) → `main`，当前待合并，尚未代表线上部署。
- 正式项目：[issue #60](https://github.com/nocoly/taskdoor/issues/60)，含 1—10 项规则、验收和 53 个固定源码链接。普通上传既有 1GiB、讨论附件原限制、Office／PDF 支持与正式持久化机制保持。
- TaskDoor 子任务：[同步输入保存、讨论附件与文件交互优化](https://sand.taskdoor.com/w/taskdoor-srctw7/tasks/cfbd5ba8-869c-47e7-adbe-d44c2bf07eff/overview)，父任务 `300a2c1f-c75b-4e4f-b1a1-80aa2cf548c7`，子任务 `cfbd5ba8-869c-47e7-adbe-d44c2bf07eff`。负责人沿当前账号，创建请求未设置日期或投入；回读时服务已自动生成 10 小时 AI 投入估算，本轮未手动设置该值。已确认所属父任务及 issue／PR 引用。
- 完整正文：[2026-10-22 已提交归档](product-sync-pending-issue-2026-10-22.md)。

## 交付边界

本批保留已发布基线的既有子任务和标注能力，没有提交新增子任务拆解 UI／Skill、统一及媒体标注、AI 交接、页面资源恢复或排序增量。暂缓实现及范围核对留在原工作区，不进入本次远程 issue 正文。

## 最小验证

结构门、应用 TypeScript、Vite 生产构建通过；31 个相关定向文件共 271 项通过、0 失败。隔离构建实操核对标题 12px 留白、真实保存后的绿色无 X 轻提示、40px 文件行、搜索和新建对齐、10% 黑底及 4px 模糊、文件原位预览及返回、390px 窄屏无横向溢出，未捕获页面运行异常。

PRD-0274 同步模块 08／10／11／15；失效截图转待采集，6 张文件页证据保留原采集时间。阅读页成功生成 25 模块；产品和模块版本保持。正式正文及治理证据见 [PRD 来源映射](../../docs/prd/source-map.md) 与[实现矩阵](../../docs/prd/current-implementation-matrix.md)。

完整 `npm run build` 的 `tsc -b` 仍受既有服务端测试 fixture 类型错误阻断；应用检查和生产打包已分别通过。未运行全量测试或双重审查，未将窄屏浏览器验证扩为真机、原生输入法或真实 1GB 端到端传输验证。
