# TaskDoor 2

- 使用中文回复。
- TaskDoor 产品讨论与设计只使用 `skills/agentdoor-task-design/SKILL.md` 中的原则。
- 任何 PRD 的新增、修改、删除、截图、版本发布或生成页更新，必须先完整读取并遵循 `skills/agentdoor-prd-governance/SKILL.md`；按该 Skill 判定、记录并校验变更。
- 项目搭建与代码变更遵循 `superpowers:using-superpowers` 的技能路由；用户的直接要求与本文件约定优先于 Superpowers 的默认流程。
- 操作正式项目 `nocoly/taskdoor` 前先读取该仓库最新 `README.md` 和 `AGENTS.md`。开发分支基于最新 `origin/dev`，在独立 worktree 中实施，普通开发 PR 明确指定 `--base dev`；`sand` 只接收发布负责人发起的 `dev` → `sand` release PR，普通修复不直接投向 `sand` 或 `main`。已交付分支优先合入最新 `dev` 保留历史，不为修正目标分支擅自改写已发布提交。
- 发布到独立仓库 `nocoly/taskdoor-skills` 时遵循该仓库最新 README：每个 Skill 放在独立目录，引用文件保留在自身目录内，只带必要运行资料，不带评测报告或历史设计协议；发布前运行 `node scripts/check-skills.mjs`。分支约定以对应仓库为准，不把正式项目的 `dev` 规则套到没有该分支的 Skill 仓库。
- 本项目是 PM demo，正式项目在 `nocoly/taskdoor`。每处新增或改动完成、最终方案确定后，先向用户确认是否写入本地待提交 issue；用户明确同意后才记录，当轮直接要求记录即视为已确认。有该仓库的待提交汇总草稿就复用，没有才新建；每个事项只写用户已确认且本地已完成的最终改法，供研发 AI 直接执行，并附对应 PM demo 提交、PR 与源文件链接；未完成方案、待确认内容和验证过程保留在本地待办／核对材料，不进入提交正文。每批新的 issue 从 1 连续编号。同一事项反复调整时更新尚未提交的原条目，不追加试排、撤回方案或改动过程。默认不创建、更新或评论远程 issue，也不把确认写入本地草稿当作授权提交远程；只有用户明确要求提交时才执行。
- 汇总 `artifacts/product-audit/product-sync-pending-issue-2026-10-14.md` 已提交为 `nocoly/taskdoor#49`，`artifacts/product-audit/product-sync-pending-issue-2026-10-15.md` 已提交为 `nocoly/taskdoor#55`，两份均保留归档；当前暂无待提交汇总。后续经用户确认的新改动新建待提交汇总，已提交归档不再追加。
- Issue 标题和正文尽量简洁明了，让 AI 能直接理解改什么、怎么做、如何验收；保留对应 PR 链接，省略重复背景和过程叙述。
- 默认按改动风险执行最小必要验证；只有用户主动明确要求时，才运行全量测试或双重审查。不得因通用实现流程、Skill 或收尾惯例自动执行这两项。

## 代码结构

- `src/` 分四层：`app/` 是应用壳（`App.tsx`、工作区外框、样式入口 `app/styles/global.css`）；`shared/` 放跨领域的界面组件、工具、文案与任务模型；`features/<领域>/` 是各业务领域（tasks、members、workspaces、auth、me、notifications、ai-connection）；`ai/mock/` 放演示数据与模拟 AI。`test-lab/`、`prd/`、`assets/` 不在这套约定内。
- 依赖方向：`shared/` 不引用 `features/`、`app/`、`ai/`；feature 之间只能沿 `feature-dependencies.json` 登记的边引用；只有 `ai/` 引用 `ai/mock/`。现存例外登记在 `scripts/structure-exceptions.json`，只减不增。
- 文件名：lib 模块用 kebab-case，组件用 PascalCase，hook 用 `useX`；`shared/ui/` 与 `ai/mock/` 下的文件名保持原样。`src/` 内的 import 一律写 `@/`。
- 新文件放哪：产品组件进 `features/<领域>/components/`，领域逻辑进 `features/<领域>/lib/`，夹具与演示数据进 `ai/mock/`；同时被两个领域用到才上提到 `shared/`。
- `npm run structure:check` 是结构门，`npm run build` 前会自动运行；细则见 `docs/architecture/frontend-layout.md`。
