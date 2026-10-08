# TaskDoor 2

- 使用中文回复。
- TaskDoor 产品讨论与设计只使用 `skills/agentdoor-task-design/SKILL.md` 中的原则。
- 任何 PRD 的新增、修改、删除、截图、版本发布或生成页更新，必须先完整读取并遵循 `skills/agentdoor-prd-governance/SKILL.md`；按该 Skill 判定、记录并校验变更。
- 项目搭建与代码变更遵循 `superpowers:using-superpowers` 的技能路由；用户的直接要求与本文件约定优先于 Superpowers 的默认流程。
- 默认按改动风险执行最小必要验证；只有用户主动明确要求时，才运行全量测试或双重审查。不得因通用实现流程、Skill 或收尾惯例自动执行这两项。

## 代码结构

- `src/` 分四层：`app/` 是应用壳（`App.tsx`、工作区外框、样式入口 `app/styles/global.css`）；`shared/` 放跨领域的界面组件、工具、文案与任务模型；`features/<领域>/` 是各业务领域（tasks、members、workspaces、auth、me、notifications、ai-connection）；`ai/mock/` 放演示数据与模拟 AI。`test-lab/`、`prd/`、`assets/` 不在这套约定内。
- 依赖方向：`shared/` 不引用 `features/`、`app/`、`ai/`；feature 之间只能沿 `feature-dependencies.json` 登记的边引用；只有 `ai/` 引用 `ai/mock/`。现存例外登记在 `scripts/structure-exceptions.json`，只减不增。
- 文件名：lib 模块用 kebab-case，组件用 PascalCase，hook 用 `useX`；`shared/ui/` 与 `ai/mock/` 下的文件名保持原样。`src/` 内的 import 一律写 `@/`。
- 新文件放哪：产品组件进 `features/<领域>/components/`，领域逻辑进 `features/<领域>/lib/`，夹具与演示数据进 `ai/mock/`；同时被两个领域用到才上提到 `shared/`。
- `npm run structure:check` 是结构门，`npm run build` 前会自动运行；细则见 `docs/architecture/frontend-layout.md`。
