# TaskDoor 2

- 使用中文回复。
- TaskDoor 产品讨论与设计只使用 `skills/agentdoor-task-design/SKILL.md` 中的原则。
- 任何 PRD 的新增、修改、删除、截图、版本发布或生成页更新，必须先完整读取并遵循 `skills/agentdoor-prd-governance/SKILL.md`；按该 Skill 判定、记录并校验变更。
- 项目搭建与代码变更遵循 `superpowers:using-superpowers` 的技能路由；用户的直接要求与本文件约定优先于 Superpowers 的默认流程。
- 操作正式项目 `nocoly/taskdoor` 前先读取该仓库最新 `README.md` 和 `AGENTS.md`。开发分支基于最新 `origin/dev`，在独立 worktree 中实施，普通开发 PR 明确指定 `--base dev`；`sand` 只接收发布负责人发起的 `dev` → `sand` release PR，普通修复不直接投向 `sand` 或 `main`。已交付分支优先合入最新 `dev` 保留历史，不为修正目标分支擅自改写已发布提交。
- 发布到独立仓库 `nocoly/taskdoor-skills` 时遵循该仓库最新 README：每个 Skill 放在独立目录，引用文件保留在自身目录内，只带必要运行资料，不带评测报告或历史设计协议；发布前运行 `node scripts/check-skills.mjs`。分支约定以对应仓库为准，不把正式项目的 `dev` 规则套到没有该分支的 Skill 仓库。
- 本项目是 PM demo，正式项目在 `nocoly/taskdoor`。待提交 issue 只记录正式项目需要调整的产品行为和实现差异；仅服务 PM demo 的账号识别、演示样例、测试工具等内部改动不进入正文。符合此范围的改动在本地完成并确定最终方案后，自动记录或更新本地待提交 issue，无需另行确认。有该仓库的待提交汇总草稿就复用，没有才新建；每个事项只写本地已完成的最终改法，供研发 AI 直接执行，并附对应 PM demo 提交、PR 与源文件链接；未完成方案、待确认内容和验证过程保留在本地待办／核对材料，不进入提交正文。每批新的 issue 从 1 连续编号。同一事项反复调整时更新尚未提交的原条目，不追加试排、撤回方案或改动过程。远程 issue 的创建、更新和评论须等用户明确指示；本地记录不构成远程提交授权。
- 汇总 `artifacts/product-audit/product-sync-pending-issue-2026-10-14.md`、`artifacts/product-audit/product-sync-pending-issue-2026-10-15.md`、`artifacts/product-audit/product-sync-pending-issue-2026-10-20.md`、`artifacts/product-audit/product-sync-pending-issue-2026-10-22.md` 已分别提交为 `nocoly/taskdoor#49`、`nocoly/taskdoor#55`、`nocoly/taskdoor#58`、`nocoly/taskdoor#60`，均保留归档；#58 当前仅保留任务详情上滑吸顶、人员选择列表与参与人名单改造两项，当前正文另存于 `artifacts/product-audit/issue-58-current-2026-10-20.md`，初次归档保持。#60 对应已合并的 PM Demo PR #19，含输入保存、讨论附件与文件交互的 10 项最终改法，交付记录见 `artifacts/product-audit/product-sync-published-2026-10-23.md`；子任务 UI／Skill、新增标注及 AI 交接、页面资源恢复与排序增量暂缓，范围与交付边界见上述交付记录。2026-10-23 的参与人名单圆形入口单项已提交为 `nocoly/taskdoor#61`，归档见 `artifacts/product-audit/product-sync-pending-issue-2026-10-23.md`，对应 PM Demo PR #20（当前待合并）。2026-10-26 与 2026-11-05 两批分别归档为 `nocoly/taskdoor#73` 与 `nocoly/taskdoor#74`。2026-11-07 的 16 项汇总已提交为 `nocoly/taskdoor#77`，归档保留在 `artifacts/product-audit/product-sync-pending-issue-2026-11-05-02.md`。当前待提交汇总为 `artifacts/product-audit/product-sync-pending-issue-2026-11-07.md`，后续已完成的改动自动记录在当前草稿，已提交归档不再追加。
- Issue 标题和正文尽量简洁明了，让 AI 能直接理解改什么、怎么做、如何验收；保留对应 PR 链接，省略重复背景和过程叙述。
- 用户授权提交正式项目 issue 时，同一批必须同步交付对应 PM Demo：将已完成的最终实现提交、推送并创建或更新 PM Demo PR，在必要验证通过后直接合并该仓库 `main`，再把本批实现提交、合并提交、PR 和各项源码对应关系写入 issue。PM Demo 是用户直接使用的 Demo，用户已授权合并对应已授权改动的 PM Demo PR，无需再次确认；此授权不扩展到正式项目的代码合并或发布。只提交 issue、仅保留本地代码或引用历史基线不算完成交付；不将无关的未完成改动一并发布。
- 默认按改动风险执行最小必要验证；只有用户主动明确要求时，才运行全量测试或双重审查。不得因通用实现流程、Skill 或收尾惯例自动执行这两项。

## 代码结构

- `src/` 分四层：`app/` 是应用壳（`App.tsx`、工作区外框、样式入口 `app/styles/global.css`）；`shared/` 放跨领域的界面组件、工具、文案与任务模型；`features/<领域>/` 是各业务领域（tasks、members、workspaces、auth、me、notifications、ai-connection）；`ai/mock/` 放演示数据与模拟 AI。`test-lab/`、`prd/`、`assets/` 不在这套约定内。
- 依赖方向：`shared/` 不引用 `features/`、`app/`、`ai/`；feature 之间只能沿 `feature-dependencies.json` 登记的边引用；只有 `ai/` 引用 `ai/mock/`。现存例外登记在 `scripts/structure-exceptions.json`，只减不增。
- 文件名：lib 模块用 kebab-case，组件用 PascalCase，hook 用 `useX`；`shared/ui/` 与 `ai/mock/` 下的文件名保持原样。`src/` 内的 import 一律写 `@/`。
- 新文件放哪：产品组件进 `features/<领域>/components/`，领域逻辑进 `features/<领域>/lib/`，夹具与演示数据进 `ai/mock/`；同时被两个领域用到才上提到 `shared/`。
- `npm run structure:check` 是结构门，`npm run build` 前会自动运行；细则见 `docs/architecture/frontend-layout.md`。
