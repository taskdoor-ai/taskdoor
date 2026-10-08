# 前端代码结构

`src/` 的产品界面按四层组织：`app`、`shared`、`features`、`ai`。这份文档说明每层放什么、谁能引用谁、文件怎么命名，以及结构检查 `npm run structure:check` 怎么读、例外怎么登记。`src/test-lab/`、`src/prd/`、`src/assets/` 是独立的子项目，不受这套约定约束，结构检查也不扫描它们。

## 目录

```text
src/
├── main.tsx                      # 入口：挂载应用；样式 import 的顺序就是级联顺序
├── app/
│   ├── App.tsx                   # 工作区主程序
│   ├── styles/global.css         # 全局样式入口（Tailwind 在这里）
│   └── workspace/                # 工作区外框：侧栏、顶栏、团队切换、个人信息
│       ├── components/
│       └── styles/
├── shared/
│   ├── ui/                       # 跨领域的界面组件；shadcn 生成的原件（kebab-case 文件名）也在这里
│   ├── lib/                      # 通用工具（utils、clipboard、会话等）
│   ├── i18n/                     # I18nProvider、语言核心与各处共用的文案
│   ├── model/                    # 任务模型的类型与枚举：task-model、task-effort、task-burn-up、task-diagnosis、criterion-review
│   └── styles/                   # tokens.css、pm-global.css、theme.css、base.css、pm-global-tail.css 等全局样式
├── features/
│   ├── tasks/                    # 任务：components、lib、styles、i18n，以及 files/ 与 discussion/ 两个子域
│   ├── members/                  # 成员、团队生命周期
│   ├── workspaces/               # 工作区列表与目录
│   ├── auth/                     # 登录、注册、引导
│   ├── me/                       # 个人设置、标签
│   ├── notifications/            # 通知
│   └── ai-connection/            # 连接 AI 工具
├── ai/
│   └── mock/                     # 演示世界：data（夹具）、lib（模拟 AI 与场景）、i18n（演示文案）、prototype
├── test-lab/  prd/  assets/      # 独立子项目，不在本约定内
```

## 每层放什么

- **app**：应用壳。`App.tsx`、工作区外框和样式入口。其它层不引用 `app/`；只有 `main.tsx` 引用它。
- **shared**：两个以上领域都用到、且不属于任何一个领域的东西——通用界面组件、工具函数、共用文案、任务模型的类型。
- **features**：每个业务领域一个目录，领域自己的组件、逻辑、样式、文案都在里面。领域内部可以再分子域（`features/tasks/files/`、`features/tasks/discussion/`）。
- **ai**：演示数据与模拟 AI。`ai/mock/` 下是 Demo 的数据来源（任务种子、场景、示例、演示账号）。

## 依赖规则

1. `shared/` 不引用 `features/`、`app/`、`ai/`。
2. `features/<x>` 引用另一个 feature，必须是 `feature-dependencies.json` 里登记过的方向。
3. 只有 `ai/` 下的文件引用 `ai/mock/`。
4. 只有 `main.tsx`（以及 `app/` 内部）引用 `app/`。
5. `src/` 内不用 `../` 跨目录引用；同目录可以写 `./`，其余一律写 `@/`。
6. 文件名：`features/` 与 `shared/{lib,i18n,model}` 下，`.ts` 模块用 kebab-case（`task-effort.ts`），`.tsx` 组件用 PascalCase（`TaskDetail.tsx`），hook 用 `useX`。`shared/ui/` 与 `ai/mock/` 下的文件名保持原样。

### 现存的例外

Demo 没有后端，`ai/mock/` 的夹具就是产品的数据来源，很多组件直接引用它们；部分共用文案和小组件也直接读演示数据。这些现存引用登记在 `scripts/structure-exceptions.json`，按文件计数：

```json
{
  "$reasons": {
    "ai-mock-outside-ai": "demo 数据源：……",
    "shared-imports-upper-layer": "demo 数据源：……"
  },
  "ai-mock-outside-ai": {
    "src/app/App.tsx": 23,
    "src/features/tasks/components/TaskDetail.tsx": 5
  }
}
```

- 每条规则的理由写在 `$reasons`；某个文件需要单独说明时写在 `$fileReasons`。
- 计数只能减少：一个文件的违反数超过登记数，检查失败；减少了也会失败，提示你同步降低登记数。这样例外只会越来越少。
- feature 之间的环登记在 `scripts/structure-check.mjs` 的 `KNOWN_CYCLES`，每个环一句理由。目前有一个：`members <-> tasks`（删团队时清理任务的本地记录；任务用成员选择器）。

## feature-dependencies.json

每个 feature 一个键，值是它允许引用的其它 feature 与理由：

```json
{
  "tasks": {
    "members": "owners, participants and mentions are picked with MemberSelector / PersonPicker"
  },
  "me": {}
}
```

- 新增一条边：在对应 feature 下加一行，写清为什么需要；同时把 `scripts/structure-check.mjs` 里的 `MAX_FEATURE_EDGES` 加一。边数只应在确有需要时增加。
- 新增一个 feature 目录：在这里加一个键（可以是空对象）。目录与这里的键必须一一对应。
- 依赖图不能有环（`KNOWN_CYCLES` 里登记的除外）。

## 读 structure:check 的输出

```text
TaskDoor structure check
  扫描文件 353，import 说明符 1637，feature 边 9
  shared-imports-upper-layer: 10（例外 10）
  ...
新增结构违反：
- features/<x> 只能沿 feature-dependencies.json 登记的边 import 其它 feature：src/features/me/components/TagPicker.tsx 0 → 1
    src/features/me/components/TagPicker.tsx:1  @/features/tasks/lib/task-activity
```

- 第一段是各规则的现状与登记的例外数。
- 「新增结构违反」列出超出登记的文件，以及每一处引用的行号和写法。通常的修法是把文件放到正确的层、或改成引用正确的模块；确实需要的跨 feature 引用，按上一节登记一条边。
- 「违反已减少」表示你消掉了一些例外，按提示降低 `scripts/structure-exceptions.json` 里的数字即可。
- 不要为了让检查通过而调高例外计数。

`npm run build` 前会自动运行这项检查（`prebuild`）。

## 样式的顺序

- `app/styles/global.css` 是 Tailwind 的入口，它的 `@import` 顺序就是全局样式的级联顺序：Tailwind → `tokens.css` → 燃起图节点与本地 Agent 连接两份样式 → 动画库、shadcn 与字体 → `pm-global.css` → `theme.css` → `base.css` → `pm-global-tail.css`。
- `main.tsx` 先 import `global.css`，再依次 import 其余全局样式表；这个顺序同样就是级联顺序。
- 产品自有的 CSS 不在 `@layer` 里，顺序一变页面就可能变。**不要重排这些 import**，也不要把 `main.tsx` 里其余的样式表并进 `global.css`：进了 Tailwind 的入口，它们会被加上额外的兼容规则，构建出的 CSS 会变。
- 新的样式表放在它所属领域的 `features/<领域>/styles/` 下，由使用它的组件 import。

## 移动文件时还要改的地方

- `tsconfig.node.json` 显式列出了一批 `src/` 文件，移动或改名时同步修改。
- `server/*.test.ts` 用相对路径引用 `src/`（测试运行时没有 `@/` 别名），有些测试按路径读源码；移动文件后在 `server/` 里搜索旧路径。
- `components.json`（shadcn 的别名与样式入口）、`scripts/design-check.mjs`（全局样式表路径）、`scripts/audit-i18n.mjs`（扫描目录）。
