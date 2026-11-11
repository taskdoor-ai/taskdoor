# Google 新用户首次同意页：最小 UI 参考

> 状态：原型视觉与交互参考，待审。对应 #91 §9 已选的严格前置同意方向，不代表正式 KC 合同、主题或账号创建已实现。
> 正式内部合同、KC first-broker 页面和发布由 Commander／Timi 负责；本稿不改变该批排期。

## 最小推荐

生产仅对 Google 身份验证已完成、尚未创建正式账号的新用户显示本页；位置在创建 KC 身份之前。现有账号登录、链接和回访继续原登录路径，不加勾选。

复用现有 auth 双栏布局、品牌、插画、语言入口及表单样式。卡片只包含：

1. 标题「确认创建账号」及简短说明，明确 Google 验证已完成、需要先同意政策。
2. 只读 Google 邮箱，不提供改邮箱、密码、团队设置或再次选账号。
3. 默认不勾选的「我已阅读并同意 隐私政策」；普通标签可切换勾选，政策链接独立打开、不切换勾选。沿用唯一已有链接 `https://sand.taskdoor.com/privacy.html`，未虚构新的服务条款地址。
4. 主操作「继续创建账号」。未同意时仅就地提示「请先勾选同意《隐私政策》后继续。」并聚焦复选框，不创建账号、不进入团队设置、不设置密码。勾选后需再次主动继续，不因勾选自动提交。
5. 次操作「不同意，返回登录」，退出本次创建；政策链接和拒绝操作始终可用。

英文使用同一结构：`Confirm account creation`、`Google email`、`I have read and agree to the Privacy Policy`、`Continue and create account`、`Decline and return to sign in`。错误沿用已有 `Please agree to the Privacy Policy to continue.`。

## Source 与预览边界

- [`GoogleFirstConsentPreview.tsx`](../../../src/features/auth/components/GoogleFirstConsentPreview.tsx)：`GoogleFirstConsent` 接收只读邮箱和继续／拒绝回调；正式页面可参考 UI，由 KC 按真实身份和合同提供动作。
- [`onboarding-messages.ts`](../../../src/features/auth/i18n/onboarding-messages.ts)：复用及补充中英文案。
- [`onboarding.css`](../../../src/features/auth/styles/onboarding.css)：复用 auth 布局及控件，仅补只读邮箱行与次操作样式。
- [`main.tsx`](../../../src/main.tsx)：仅 `/login?preview=1&google-consent=1` 加载隔离预览。普通登录、注册、链接／回访逻辑均未接入此页面。

本地启动后的入口：`http://127.0.0.1:5177/login?preview=1&google-consent=1`。`alex@example.com` 是固定示例，不表示真的完成 Google 验证。预览不发 OAuth 请求，不调用 `GoogleAuthPreview`，不创建或保存账号、登录会话或 onboarding 状态。继续仅显示本地「已确认同意。」回调结果，停留同一页；没有后续模拟建号页面。不能把本稿或既有 `GoogleAuthPreview` 替代生产 KC 的新用户判定、身份创建前阻断、绑定、返回和持久化。

## 审稿截图与最小验证

- [中文桌面](../../../artifacts/prototype-review/google-first-consent-2026-11-12/zh.png)
- [英文桌面](../../../artifacts/prototype-review/google-first-consent-2026-11-12/en.png)
- [390px 窄屏](../../../artifacts/prototype-review/google-first-consent-2026-11-12/mobile.png)
- [未勾选时的提示及焦点](../../../artifacts/prototype-review/google-first-consent-2026-11-12/unchecked-error.png)

Chrome 实测中英文及 390px 窄屏：邮箱只读、复选框默认未选、未同意提交不写账号／onboarding 状态、错误聚焦、政策链接独立打开且不勾选、键盘 Space 勾选后继续仅触发本地回调、没有密码或团队设置步骤、拒绝返回普通登录、无横向溢出及页面运行错误。政策链接 HTTP 200。

既有 Google onboarding 及文案 9 项定向测试通过；应用 TypeScript、结构门、Vite 打包通过。该 9 项用于确认原路径未受改动，新页面行为以上述浏览器验证为准。未运行全量测试或双重审查。未修改正式仓、PRD、远程 issue 或发布状态。
