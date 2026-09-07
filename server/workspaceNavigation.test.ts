import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const tagManagementSource = readFileSync(new URL("../src/components/TagManagementPage.tsx", import.meta.url), "utf8");
const themeToggleSource = readFileSync(new URL("../src/components/ThemeToggle.tsx", import.meta.url), "utf8");

const readTopbar = () => readFileSync(new URL("../src/components/WorkspaceTopbar.tsx", import.meta.url), "utf8");

test("默认进入个人工作台且不预选任务详情", () => {
  assert.ok(/\[activeSection, setActiveSection\] = useState<PrimarySection>\("home"\)/.test(appSource), "初始区块应为个人工作台");
  assert.ok(/\[selectedTaskId, setSelectedTaskId\] = useState<string \| null>\(null\)/.test(appSource), "初始状态不得预选详情");
});

test("单任务工作区只挂载轻量顶栏，不保留侧栏或移动端导航抽屉", () => {
  assert.match(appSource, /<WorkspaceTopbar\b/);
  assert.match(appSource, /className="app-shell task-workspace-shell"/);
  assert.doesNotMatch(appSource, /<WorkspaceSidebar\b|mobileNavOpen|mobile-menu|nav-scrim/);
  assert.equal((appSource.match(/<WorkspaceTopbar\b/g) ?? []).length, 1);
  assert.doesNotMatch(appSource, /<TeamSwitcher\b/, "团队切换统一由顶栏承载，不能再复制移动入口");
});

test("顶栏只保留团队与必要工具，推荐入口留在任务索引内", () => {
  const topbarSource = readTopbar();
  assert.match(topbarSource, /<TeamSwitcher\b/);
  assert.match(topbarSource, /<GlobalNotifications\b[^>]*placement="topbar"/);
  assert.match(topbarSource, /id="workspace-account-trigger"/);
  assert.match(topbarSource, /<DropdownMenuTrigger\b[^>]*aria-label="打开账户菜单"/);
  assert.match(topbarSource, /<DropdownMenuContent\b[^>]*aria-label="账户菜单"/);
  assert.doesNotMatch(topbarSource, /<nav\b|onSectionChange|activeSection|primaryItems|连接 AI|新建对话|注意力地图/);
  const taskList = readFileSync(new URL("../src/components/TaskWorkspaceList.tsx", import.meta.url), "utf8");
  const header = taskList.match(/<header\b[\s\S]*?<\/header>/)?.[0];
  assert.ok(header, "个人入口保留可聚焦标题");
  assert.match(header, /onClick=\{onShowWorkbench\}[^>]*>推荐<\/button>/);
  assert.doesNotMatch(header, /onClick=\{onCreateTask\}/);
  assert.ok(taskList.indexOf('onClick={onCreateTask}') < taskList.indexOf(header), "新建任务属于上方搜索和筛选工具行");
  assert.doesNotMatch(taskList, /task-workspace-personal-entry|我负责的任务|task-workspace-scope-trigger/);
});

test("主题切换归入账户菜单并位于设置上方，顶栏不再保留独立入口", () => {
  const topbarSource = readTopbar();
  const accountMenu = topbarSource.match(/<DropdownMenuContent\b[\s\S]*?<\/DropdownMenuContent>/)?.[0];
  assert.ok(accountMenu);
  assert.match(accountMenu, /<ThemeToggle\b[^>]*onToggle=\{toggleTheme\}[^>]*theme=\{theme\}[^>]*\/>/);
  assert.match(accountMenu, /onOpenPersonalCenter\("profile"\)/);
  assert.match(accountMenu, /variant="destructive"[\s\S]*?退出登录/);
  assert.ok(accountMenu.indexOf("<ThemeToggle") < accountMenu.indexOf('onOpenPersonalCenter("profile")'), "主题切换应位于设置上方");
  assert.match(themeToggleSource, /aria-label=\{label\}/);
  assert.match(themeToggleSource, /title=\{label\}/);
  assert.doesNotMatch(topbarSource, /<Moon\b|<Sun\b|切换到深色|切换到浅色/, "顶栏只负责组合，不应复制主题组件内部表现");
  assert.doesNotMatch(topbarSource, /className="workspace-theme-trigger"/, "主题不应再占用顶栏独立入口");
});

test("账户菜单主题项沿用菜单触摸区域和图标尺寸，移除独立入口样式", () => {
  const styles = readFileSync(new URL("../src/styles/workspace-shell.css", import.meta.url), "utf8");
  assert.match(styles, /\.workspace-account-trigger\s*\{[\s\S]*?width:\s*var\(--ad-control-touch-min\);[\s\S]*?height:\s*var\(--ad-control-touch-min\);/);
  assert.match(styles, /\.workspace-account-trigger:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--ad-focus\);/);
  assert.match(styles, /\.workspace-account-menu \[data-slot="dropdown-menu-item"\]\s*\{[\s\S]*?min-height:\s*var\(--ad-control-touch-min\);/);
  assert.match(styles, /\.workspace-account-menu \[data-slot="dropdown-menu-item"\] svg\s*\{[\s\S]*?width:\s*var\(--ad-control-icon-sm\);[\s\S]*?height:\s*var\(--ad-control-icon-sm\);/);
  assert.match(styles, /\.workspace-account-menu\s*\{[\s\S]*?color:\s*var\(--ad-ink\);[\s\S]*?background:\s*var\(--ad-surface\);/);
  assert.match(styles, /\.workspace-account-menu \[data-slot="dropdown-menu-item"\]:focus,\s*\n\.workspace-account-menu \[data-slot="dropdown-menu-item"\]\[data-highlighted\]\s*\{[\s\S]*?background:\s*var\(--ad-surface-subtle\);/);
  assert.match(styles, /\.workspace-account-menu \[data-slot="dropdown-menu-item"\]:focus-visible\s*\{[\s\S]*?outline:\s*none;/);
  assert.match(styles, /\.workspace-account-menu \[data-slot="dropdown-menu-item"\]:focus span,\s*\n\.workspace-account-menu \[data-slot="dropdown-menu-item"\]\[data-highlighted\] span\s*\{[\s\S]*?color:\s*currentColor;/);
  assert.doesNotMatch(styles, /\.workspace-theme-trigger/);
  assert.match(styles, /\[data-variant="destructive"\] svg\s*\{\s*color:\s*currentColor;/);
});

test("移动主题入口不改变既有状态、页面主题与本地持久化契约", () => {
  assert.match(appSource, /useState<Theme>\(\(\) => \(loadStoredText\("agentdoor-theme"\) as Theme\) \|\| "light"\)/);
  assert.match(appSource, /document\.documentElement\.dataset\.theme = theme/);
  assert.match(appSource, /persistStoredText\("agentdoor-theme", theme\)/);
  assert.match(appSource, /toggleTheme=\{\(\) => setTheme\(\(current\) => current === "light" \? "dark" : "light"\)\}/);
});

test("设置关闭后焦点回到顶栏头像", () => {
  assert.match(appSource, /querySelector<HTMLElement>\("#workspace-account-trigger"\)\?\.focus\(\)/);
});

test("标签管理与新建任务有返回任务列表的路径，不清空搜索和筛选", () => {
  assert.match(tagManagementSource, /onBack: \(\) => void/);
  assert.match(tagManagementSource, /<button\b[^>]*onClick=\{onBack\}[^>]*>任务<\/button>/);
  assert.match(appSource, /<TagManagementPage\b[\s\S]*?onBack=\{showTaskList\}/);
  assert.match(appSource, /<TaskCreationExperience\b[\s\S]*?onCancel=\{closeTaskCreation\}/);
  assert.match(appSource, /const closeTaskCreation = \(\) => \{[\s\S]*?creationParentContext\?\.parentTaskId[\s\S]*?openTask\(parentTaskId\)[\s\S]*?showTaskList\(\)/);
  const returnToList = appSource.match(/const showTaskList = \(\) => \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(returnToList);
  assert.match(returnToList, /setSelectedTaskId\(null\)/);
  assert.match(returnToList, /setActiveSection\("tasks"\)/);
  assert.doesNotMatch(returnToList, /setTaskQuery|setTaskFilters|localStorage\.(?:clear|removeItem)/);
});

test("回到我的工作不重置筛选、已选详情或未完成创建草稿", () => {
  const changeSection = appSource.match(/const showPrimarySection = \(section: "home" \| "tasks"\) => \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(changeSection);
  assert.doesNotMatch(changeSection, /setTaskQuery|setTaskFilters|setSelectedTaskId|setCreationSessionOpen|setConversationRevision/);
  assert.match(appSource, /creation=\{creationSessionOpen \? <TaskCreationExperience/);
  assert.match(appSource, /active=\{activeSection === "conversation"\}/);
  const startCreation = appSource.match(/const startNewTaskConversation = \(\) => \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(startCreation);
  assert.doesNotMatch(startCreation, /setSelectedTaskId|setTaskQuery|setTaskFilters/, "进入创建不卸载原详情或重置列表上下文");
  assert.match(appSource, /<PersonalWorkbench[\s\S]*?hidden=\{activeSection !== "home"\}/);
  assert.match(appSource, /workbench=\{<PersonalWorkbench/);
  assert.match(appSource, /onShowWorkbench=\{\(\) => showPrimarySection\("home"\)\}/);
  assert.match(appSource, /onOpenTaskList=\{showTaskList\}/, "窄屏可明确返回列表，不被上次已选详情挡住");
});

test("隐藏入口保留 AI 页面，我的工作复用共享产品弹层且不记录伪连接", () => {
  for (const component of ["AiConnectionPage", "AiConnectionDialog"]) {
    assert.ok(existsSync(new URL(`../src/components/${component}.tsx`, import.meta.url)));
  }
  assert.match(appSource, /<AiConnectionDialog[\s\S]*?request=\{workbenchAiConnectionRequest\}/);
  assert.doesNotMatch(appSource, /<CliConnectionDialog|agentdoor-local-ai-connected|onConnected=/);
  assert.doesNotMatch(appSource, /localStorage\.clear\(\)/);
});
