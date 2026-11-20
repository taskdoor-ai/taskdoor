# 登录注册页轮盘交付（2026-11-20）

用户已确认此设计并授权单独提交正式 issue、同步交付 PM Demo。

- 基于 PM Demo `9327ead0a4e75cf4ea4cadb074ea75691bb59294`；只更新普通登录、注册页左侧展示。默认入口为 `/login`、`/signup`，无需 `story=wheel`。邀请、团队设置和找回密码保持原有展示，表单及认证行为沿用现有实现。
- 文案为「用你熟悉的 Agent 工作，／与团队共享任务目标、进展与上下文。」；同步英文。外围与中心仅保留图标，中心使用放大后的品牌图标，不显示说明和播放／暂停按钮；鼠标停留不暂停，填写输入时暂停，支持键盘及减少动态效果偏好。
- 轮盘基于用户提供的 Louis Studios Tool Wheel 组件调整，保留作者说明；新增组件与样式在 auth 领域，不引入依赖。
- 正式项目核对基于 `dev` 的 `ee8b46f0c6705ab92695826432f0a548b674be13`，当前认证入口复用 `apps/web/src/features/auth/components/OnboardingShell.tsx`；issue 要求沿用正式服务与表单，移植展示层，不复制 Demo 数据层。

## 验证

- `npm run structure:check` 通过，无新增结构违反。
- `tsc -p tsconfig.app.json --noEmit` 通过。
- 登录注册状态与国际化定向测试（`onboardingPreview.test.ts`、`onboardingI18n.test.ts`）15 项通过。
- Vite 前端生产打包通过（native 配置加载）；仅有既有包体积提示。
- `npm run build` 未通过：`tsconfig.node.json` 下的服务端测试和测试工作台存在既有类型问题。认证源组件不在报错列表。未运行全量测试或双重审查。
- 实际默认登录、注册页已核对，中英文、深浅主题可切换；390px 注册页无横向溢出（scrollWidth 390），找回密码页无轮盘。
- 试版阶段已定位并修复悬停暂停：修复前鼠标停留的 120 帧均不推进，修复后 120 帧全部推进；本次移植保留 `pauseOnHover={false}`，不包含临时采样代码。
- 主分支 `globalUiMessages.json` 原有一行孤立的 `<<<<<<< HEAD` 阻止 JSON 解析；本批独立修复提交只删除该标记，不改变任何文案。

## 源码与效果

- [轮盘组件](../../../src/features/auth/components/TaskDoorWheel.tsx)
- [局部布局样式](../../../src/features/auth/styles/taskdoor-wheel.css)
- [共享壳接入](../../../src/features/auth/components/OnboardingShell.tsx)
- [登录注册启用范围](../../../src/features/auth/components/AuthExperience.tsx)
- [登录](login.jpg) · [注册](signup.jpg) · [手机注册](signup-mobile.jpg)

正式项目代码合并、sand 发布与正式上线不在本次授权范围。
