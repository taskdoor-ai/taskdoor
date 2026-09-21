# TaskDoor 多语言架构

当前定位：以任务为共同工作对象，连接人的协作与 AI 建议。海外版复用同一产品与同一数据模型，默认英文，提供简体中文。

## 四层边界

| 层 | 责任 | 当前落点 |
| --- | --- | --- |
| 表达层 | 语义键、完整句、插值、可访问文案 | `src/i18n/messages.ts` |
| 会话层 | 当前语言、设备偏好、跨标签同步、HTML lang | `src/i18n/I18nProvider.tsx` |
| 格式层 | 数字、复数、日历日期、指定时区的时间点 | `src/i18n/core.ts` |
| 业务层 | 稳定 ID、原文内容、AI 语言参数、团队时区 | 中文状态暂由 `src/i18n/taskStatus.ts` 兼容；其余迁移见 PRD |

当前使用 React Context 与浏览器 Intl，无新增运行时依赖。目录保持英文键类型和中文 Record 类型约束；后续词条增长时按 account、tasks、discussion、files 拆分模块，保留统一调用接口。当前插值器只处理文本占位符，不支持 ICU 富文本或任意复数语法；需要复杂消息时替换适配层，不在组件里堆条件表达式。

## 开发约定

组件用 `const { t, locale } = useI18n()` 获取当前语言，调用 `t('tasks.select')`。语义键按功能命名；动态姓名等通过参数传入。禁止 DOM 扫描替换、HTML 翻译注入、批量替换数据库中文值。业务工具接收 locale 参数，不能访问浏览器全局语言；模块加载时不缓存翻译结果。

新增日历日期展示调用 `formatCalendarDate(locale, '2026-09-20')`；时间点调用 `formatInstant(locale, instant, teamTimeZone)`。语言不决定时区。现行团队时区尚未改造，不得直接把 Shanghai 改成浏览器时区。

错误消息、Toast、placeholder、aria-label、title、图表单位和键盘提示同属系统文案。不要翻译用户任务标题、文件内容、标签、成员姓名或 AI 历史记录。

## 当前改造与剩余范围

基础层已接通工作区工具栏、侧栏、团队与主题菜单、加载页、列表主要控件、工作区外框和状态徽标。语言选择不通过 key 重新挂载应用，因而不会主动清除 React 编辑状态。设备偏好不是账户偏好。

高级筛选、登录邀请、创建与详情正文、讨论文件、通知设置、AI 请求响应和团队时区尚需逐流程迁移。测试实验室、MCP 和静态历史演示另行分类，不以扫描中文字符数量衡量发布质量。

执行 `node scripts/audit-i18n.mjs` 可重新盘点引用，输出含注释与数据，必须人工分类。当前盘点保存在 `docs/i18n-inventory.json`。完整产品约束和验收见 `docs/prd/modules/02-internationalization.md`（PRD-0003）。

## 最小验证

- `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --test server/i18n.test.ts`
- `npx tsc -p tsconfig.app.json --noEmit`
- `node scripts/build-agentdoor-prd.mjs`

浏览器仍需验证切换、刷新恢复、两个标签页同步、草稿保留与移动端布局。尚未达到英文全流程发布验收。
