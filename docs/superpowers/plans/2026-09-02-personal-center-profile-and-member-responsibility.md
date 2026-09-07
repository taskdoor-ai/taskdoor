# Personal Center Profile and Member Responsibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 精简个人资料并支持本地头像，同时让管理员可原地编辑团队成员责任，并移除责任页团队切换器中的 Logo。

**Architecture:** 继续使用 `PersonalCenterState` 作为本机设置的唯一持久化边界，在个人资料增加可选头像 Data URL，在团队成员关系增加可选责任覆盖值。`PersonAvatar` 只负责展示自定义图片与现有生成头像回退；文件读取和成员责任更新分别放入小型纯逻辑模块，界面组件只管理草稿与交互状态。

**Tech Stack:** React、TypeScript、Base UI、Lucide、CSS、Node test runner、tsx。

---

## 文件结构

- Create: `src/lib/personalAvatar.ts` — 校验并读取本地头像文件，输出可持久化的压缩 Data URL。
- Create: `src/lib/teamMemberResponsibility.ts` — 解析和更新团队成员责任覆盖值。
- Create: `server/personalCenterProfile.test.ts` — 个人资料数据、头像校验、头像展示与页面结构测试。
- Create: `server/teamMemberResponsibility.test.ts` — 团队责任覆盖和保存逻辑测试。
- Modify: `src/data/memberProfiles.ts` — 扩展个人头像和成员责任的数据契约、初始值校验与旧状态兼容。
- Modify: `src/data/sharedTypes.ts` — 为人员展示资料增加可选自定义头像字段。
- Modify: `src/components/PersonAvatar.tsx` — 优先展示自定义头像，失败后回退现有生成头像。
- Modify: `src/App.tsx` — 把当前用户保存的头像合并进应用内人员资料。
- Modify: `src/components/PersonalInfoDialog.tsx` — 单列个人资料、头像片入口、只读邮箱和保存反馈。
- Modify: `src/components/PersonalCenterPage.tsx` — 单责任行内编辑，移除团队切换器 Logo。
- Modify: `src/styles/personal-center.css` — 头像片布局、责任编辑责任状态和响应式样式。
- Modify: `server/personalCenterResponsibility.test.ts` — 更新团队切换器和责任列的既有结构断言。

当前工作树包含用户的未提交改动，实施阶段不创建代码提交，避免把既有改动混入提交；只修改并核对上述文件。

### Task 1: 扩展本机状态数据契约

**Files:**
- Modify: `src/data/memberProfiles.ts`
- Test: `server/personalCenterProfile.test.ts`
- Test: `server/teamMemberResponsibility.test.ts`

- [x] **Step 1: 编写状态校验失败测试**

新增测试，复制 `initialPersonalCenterState` 后写入 `profile.avatarDataUrl` 和 `teams[0].memberships[0].responsibility`，断言 `isPersonalCenterState` 接受字符串并拒绝数字：

```ts
test("personal center state accepts optional local avatar and team responsibility", () => {
  const state = structuredClone(initialPersonalCenterState);
  state.profile.avatarDataUrl = "data:image/png;base64,avatar";
  state.teams[0].memberships[0].responsibility = "负责项目结果";
  assert.equal(isPersonalCenterState(state), true);
  assert.equal(isPersonalCenterState({ ...state, profile: { ...state.profile, avatarDataUrl: 1 } }), false);
  assert.equal(isPersonalCenterState({ ...state, teams: [{ ...state.teams[0], memberships: [{ ...state.teams[0].memberships[0], responsibility: 1 }] }] }), false);
});
```

- [x] **Step 2: 运行测试并确认因字段不存在或校验缺失而失败**

Run: `npx tsx --test server/personalCenterProfile.test.ts server/teamMemberResponsibility.test.ts`

Expected: FAIL，错误指向可选字段尚未进入类型或校验。

- [x] **Step 3: 最小实现数据字段与校验**

在 `PersonalCenterState.profile` 增加 `avatarDataUrl?: string`，在 `TeamMembership` 增加 `responsibility?: string`。校验规则为字段缺省或字符串；责任允许空字符串，头像存在时必须是 `data:image/` 开头的字符串。旧状态不补造头像或覆盖责任。

- [x] **Step 4: 运行定向测试确认通过**

Run: `npx tsx --test server/personalCenterProfile.test.ts server/teamMemberResponsibility.test.ts`

Expected: PASS。

### Task 2: 支持头像文件处理与全局展示

**Files:**
- Create: `src/lib/personalAvatar.ts`
- Modify: `src/data/sharedTypes.ts`
- Modify: `src/components/PersonAvatar.tsx`
- Modify: `src/App.tsx`
- Test: `server/personalCenterProfile.test.ts`
- Test: `server/personAvatarTrigger.test.ts`

- [x] **Step 1: 编写头像校验和渲染失败测试**

覆盖以下行为：JPEG／PNG／WebP 且不超过 2 MB 时通过；非图片或超限时返回中文错误；`PersonAvatar` 传入 `avatarUrl` 时静态 HTML 使用该地址；`App` 将 `profile.avatarDataUrl` 合并到当前用户的 `avatarUrl`。

```ts
assert.equal(validatePersonalAvatarFile({ size: 1024, type: "image/png" }), "");
assert.match(validatePersonalAvatarFile({ size: 1024, type: "text/plain" }), /图片格式/);
assert.match(validatePersonalAvatarFile({ size: 2 * 1024 * 1024 + 1, type: "image/png" }), /2 MB/);
assert.match(renderToStaticMarkup(createElement(PersonAvatar, { avatarUrl: "data:image/png;base64,x", name: "周岚" })), /src="data:image\/png;base64,x"/);
```

- [x] **Step 2: 运行测试并确认头像 API 缺失**

Run: `npx tsx --test server/personalCenterProfile.test.ts server/personAvatarTrigger.test.ts`

Expected: FAIL，缺少校验函数或 `avatarUrl` 属性。

- [x] **Step 3: 实现最小头像边界**

`personalAvatar.ts` 导出：

```ts
export const personalAvatarMaxBytes = 2 * 1024 * 1024;
export function validatePersonalAvatarFile(file: Pick<File, "size" | "type">): string;
export async function createPersonalAvatarDataUrl(file: File): Promise<string>;
```

读取文件后用浏览器图片和 canvas 把最长边限制为 512px，并导出质量 0.86 的 WebP；canvas 不可用时保留合法原始 Data URL。`PersonAvatar` 的图片优先级为显式 `avatarUrl`、`profile.avatarUrl`、现有 DiceBear；自定义图片失败时回退 DiceBear。`App` 仅为 `currentUserId` 合并保存头像。

- [x] **Step 4: 运行头像相关测试确认通过**

Run: `npx tsx --test server/personalCenterProfile.test.ts server/personAvatarTrigger.test.ts`

Expected: PASS。

### Task 3: 精简个人资料布局并接入本地头像

**Files:**
- Modify: `src/components/PersonalInfoDialog.tsx`
- Modify: `src/styles/personal-center.css`
- Test: `server/personalCenterProfile.test.ts`

- [x] **Step 1: 编写个人资料结构失败测试**

从 `PersonalInfoDialog.tsx` 的个人资料区间断言：存在 `type="file"`、`accept="image/jpeg,image/png,image/webp"`、大头像预览与“修改头像”按钮；姓名仍可编辑；邮箱使用只读文本；不存在“工作身份、时区、关于我”标签；保存调用现有 `savePersonalCenterState`。

- [x] **Step 2: 运行测试并确认旧表单仍存在而失败**

Run: `npx tsx --test server/personalCenterProfile.test.ts`

Expected: FAIL，旧字段仍存在且没有头像上传入口。

- [x] **Step 3: 实现个人资料表单**

使用隐藏文件输入和可见图标按钮；选择文件时先清空同一 input 的值以允许重复选择，校验后异步生成 Data URL 写入 `draft.avatarDataUrl`，错误写入 `saveError`。个人资料保存只改变头像和姓名，邮箱从 `state.profile.email` 只读展示，兼容字段沿用 `state.profile` 旧值。

- [x] **Step 4: 添加布局与状态样式**

个人资料主体改成单列，头像尺寸约 88–96px；编辑按钮覆盖右下角且保持 32px 可点击范围；邮箱值使用正文样式；小屏幕保持单列。加载图片期间禁用头像按钮和保存按钮，并展示“正在处理头像”。

- [x] **Step 5: 运行个人资料测试确认通过**

Run: `npx tsx --test server/personalCenterProfile.test.ts`

Expected: PASS。

### Task 4: 实现团队成员责任行内编辑

**Files:**
- Create: `src/lib/teamMemberResponsibility.ts`
- Modify: `src/components/PersonalCenterPage.tsx`
- Modify: `src/styles/personal-center.css`
- Modify: `server/personalCenterResponsibility.test.ts`
- Test: `server/teamMemberResponsibility.test.ts`

- [x] **Step 1: 编写责任解析与更新失败测试**

纯逻辑测试要求：覆盖值优先于 `member.dynamicResponsibility`；空覆盖值显示“未填写责任”；更新函数只修改指定团队和 membership，其他团队不变；找不到目标时返回原状态并报告失败。

```ts
assert.equal(resolveTeamMemberResponsibility({ responsibility: "团队覆盖" }, { dynamicResponsibility: "默认" }), "团队覆盖");
assert.equal(resolveTeamMemberResponsibility({ responsibility: "" }, { dynamicResponsibility: "默认" }), "未填写责任");
```

- [x] **Step 2: 运行测试并确认纯逻辑模块缺失**

Run: `npx tsx --test server/teamMemberResponsibility.test.ts`

Expected: FAIL，模块或导出不存在。

- [x] **Step 3: 实现责任覆盖纯逻辑**

导出 `resolveTeamMemberResponsibility` 和 `updateTeamMemberResponsibility`。更新结果返回 `{ changed, state }`，责任保存前 `trim()`；相同值不产生写入。

- [x] **Step 4: 运行纯逻辑测试确认通过**

Run: `npx tsx --test server/teamMemberResponsibility.test.ts`

Expected: PASS。

- [x] **Step 5: 编写成员表格交互失败测试**

更新结构断言：管理员正式成员行含 `Pencil` 图标按钮及 `aria-label="编辑…的责任"`；编辑态含单行输入、保存、取消；保存调用 `savePersonalCenterState`；无权限或受邀状态不进入编辑；一次只保存一个 `editingMembershipId`。

- [x] **Step 6: 实现行内编辑与焦点恢复**

在 `TeamMembersPanel` 保存 `editingMembershipId`、`responsibilityDraft`。点击编辑时用已解析值初始化草稿；保存用纯逻辑函数创建 next state，经 `savePersonalCenterState` 成功后 `onStateChange`，失败保留编辑态；保存或取消后焦点返回 `edit-member-responsibility-${membership.id}`。

- [x] **Step 7: 添加桌面与移动样式**

展示态为文本加尾部小图标；图标悬停和 `:focus-visible` 可见。编辑态在责任列内使用输入框和紧凑操作按钮；760px 以下占整行并保持触控尺寸。

- [x] **Step 8: 运行责任相关测试确认通过**

Run: `npx tsx --test server/teamMemberResponsibility.test.ts server/personalCenterResponsibility.test.ts`

Expected: PASS。

### Task 5: 移除团队选择器 Logo 并完成最小验证

**Files:**
- Modify: `src/components/PersonalCenterPage.tsx`
- Modify: `src/styles/personal-center.css`
- Modify: `server/personalCenterResponsibility.test.ts`

- [x] **Step 1: 把既有同构 Logo 测试改为新需求并确认失败**

团队选择器区间断言 `SelectTrigger` 与每个 `SelectItem` 只包含团队名称，并明确 `doesNotMatch(/<TeamLogo/)`；保留 Base UI 宽度、勾选项和键盘行为断言。

- [x] **Step 2: 运行测试并确认当前 Logo 导致失败**

Run: `npx tsx --test server/personalCenterResponsibility.test.ts`

Expected: FAIL，触发器仍包含 `TeamLogo`。

- [x] **Step 3: 删除触发器、选项中的 Logo 与专用色彩样式**

保留 `SelectValue`、团队名称、下拉箭头以及现有变更拦截；删除 `.responsibility-team-option .team-logo-*` 和触发器 Logo 尺寸规则。

- [x] **Step 4: 运行全部定向测试**

Run: `npx tsx --test server/personalCenterProfile.test.ts server/teamMemberResponsibility.test.ts server/personalCenterResponsibility.test.ts server/personAvatarTrigger.test.ts`

Expected: 所有定向测试 PASS，无 warning。

- [x] **Step 5: 运行类型与构建验证**

Run: `npm run build`

Expected: TypeScript 和 Vite 构建均成功，退出码 0。

- [x] **Step 6: 检查改动范围与格式**

Run: `git diff --check -- src/lib/personalAvatar.ts src/lib/teamMemberResponsibility.ts src/data/memberProfiles.ts src/data/sharedTypes.ts src/components/PersonAvatar.tsx src/components/PersonalInfoDialog.tsx src/components/PersonalCenterPage.tsx src/App.tsx src/styles/personal-center.css server/personalCenterProfile.test.ts server/teamMemberResponsibility.test.ts server/personalCenterResponsibility.test.ts server/personAvatarTrigger.test.ts`

Expected: 无输出，退出码 0；人工核对 diff 未覆盖范围外的用户改动。
