# kms9/skillhub 固定版本核验补充

核验提交：228c46e1d3eeee3b7464d0f1d77b4f019a602f14。全部代码来自 GitHub 固定提交压缩包。没有修改用户项目、部署企业服务或使用真实身份/令牌。

## 明确结论

1. **无需访问原始 Git 仓库安装：支持。** CLI 可以指定 registry/site；下载从平台 /api/v1/download 获取 ZIP。服务端从自身存储获取文件打包，客户端不克隆原始 Git。公网可达的公司入口属于部署条件，项目自身无需 VPN。网页还支持配置 npm registry 与 Skill registry，CLI 初次安装也可走公司允许的 npm 源。
2. **指定版本安装、更新和回退：CLI 本地协议测试通过。** 实际 CLI 连接隔离 HTTP fixture registry，v1 安装→更新 v2→指定 v1 回退，通过。SKILL.md、引用文档、Python 脚本逐字节一致，版本 lock 一致。--dir 可写 .agents/skills 和 .claude/skills。这里证明的是分发与落盘，未启动真实 AI 客户端做模型执行，也未把模拟 registry 说成完整 Go/Postgres 后端。
3. **完整品牌设计包：不满足。** 实際 listTextFiles 上传选档函数会丢弃 PNG 和 WOFF2；虽然 CLI 收录 SVG/CSS，后端 processFiles 的 isTextFile 只接受 .md/.txt/.json/.yaml/.yml/.js/.ts/.py/.sh，SVG/CSS 会被拒绝。不是待验证，是明确缺口。
4. **CLI 浏览器自动授权：当前实现不满足，存在已复现缺陷。** Web 回调把 token/state/registry 写在 query，CLI 本地回调 HTML 只读 hash(fragment)。实际原始回调页以 query 执行报 Missing token in URL，不会发送令牌。fragment 正向对照能成功送达真实 loopback server。手动 token 登录有现成路径，但不能把自动授权标为满足。
5. **CLI 发布链路：存在已复现返回结构不兼容。** Go 后端成功返回 ok 字符串 "true"，CLI arktype schema 期待布尔 true。将后端实际结构输入 CLI 原始校验器会被拒绝。即使后端保存成功，CLI 仍可显示失败。网页发布的请求与该 Go handler 存在，但未运行完整 Web+数据库端到端，不能把 CLI 发布标成已通过。
6. **身份接入与免注册：有现成扩展基础，明道云连接器未实现。** IdentityProvider 接口与 Feishu/GitHub/GitLab 提供者存在。外部身份会自动创建 user；飞书初次登录直接 active，其他外部提供者初次状态 review_pending。明道云 provider、组织准入和默认激活策略属于明确要二开的内容，不必再写泛泛“待验证”。
7. **内部技能保护：不满足。** List/Search/版本/文件/下载是公开路由；登录校验只用于写操作等。是否在外部网关补登录不改变本版本平台内的缺口。
8. **员工停用后旧凭据失效：不满足。** 新登录会 EnsureLoginAllowed，但 JWT/API token 解析加载用户后直接返回，未检查 status。停用只修改用户 status/review 字段，不删除 API token。旧凭据仍可能通过 RequireAuth，需补停用校验和凭据失效。
9. **发布治理：部分满足。** 已有版本历史、负责人、指定版本下载；新发布直接 ModerationStatus=active，并更新 latest_version_id，没有必经发布审批。

## 实际执行与产物

- npm install --ignore-scripts --workspaces=false --no-audit --no-fund --cache /private/tmp/skillhub-verification/kms9/npm-cache（仅临时 CLI 子包，37 个依赖）
- 原始 tsc -p tsconfig.json 因仅装 CLI 子包而缺仓库级 vitest 和 @types/semver 声明，未作为项目缺陷；使用临时 tsconfig.verify.json 排除测试、noCheck=true，仅转译实际 CLI 源码，不声称全项目 typecheck 通过。
- ./node_modules/.bin/tsc -p tsconfig.verify.json：exit 0。
- node verify-cli.mjs：exit 0。见 packages/clawhub/verification-artifacts/results.json。
- node verify-browser-auth.mjs：exit 0。见 packages/clawhub/verification-artifacts/browser-auth-results.json。
- Node 运行时 v24.19.0。
- 仅监听 127.0.0.1 的临时服务器；完成后关闭。

## 一手源码依据
- [CLI registry/site/dir 参数](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/cliApp.ts#L65-L69)
- [自定义目录解析](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/cliApp.ts#L449-L455)
- [CLI 下载 ZIP 与固定版本](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/http.ts#L183-L204)
- [服务器从自身 storage 打包](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/zip_service.go#L25-L71)
- [网页可配置 npm 与 Skill registry](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/src/lib/install-command.ts#L18-L29)
- [CLI 上传筛选扩展名](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/skills.ts#L30-L51)
- [CLI 支持文本后缀集合](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/schema/textFiles.ts#L1-L40)
- [后端禁止文件与白名单](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/publish.go#L262-L312)
- [CLI 版本升级和回退逻辑](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/cli/commands/skills.ts#L259-L289)
- [Web 授权使用 query](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/src/routes/cli/auth.tsx#L54-L67)
- [CLI 回调仅读取 fragment](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/browserAuth.ts#L142-L158)
- [CLI 手动 token 登录](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/cli/commands/auth.ts#L12-L43)
- [Go 发布响应 string 类型](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/model/skill.go#L157-L160)
- [Go 发布响应赋值](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/publish.go#L183-L187)
- [CLI 发布响应要求布尔 true](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/packages/clawhub/src/schema/schemas.ts#L237-L241)
- [IdentityProvider 扩展接口](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/auth_provider.go#L44-L50)
- [外部身份自动建号](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/identity_service.go#L86-L103)
- [飞书初登 active 与其他初登 review_pending](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/auth_service.go#L319-L335)
- [读取/搜索/下载公开路由](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/routes.go#L51-L72)
- [JWT 与 API token 不检查用户停用](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/middleware/auth.go#L73-L104)
- [停用只更改用户审核状态](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/auth_service.go#L746-L773)
- [新发布直接 active](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/handler/publish.go#L94-L103)
- [Web 历史版本下载](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/src/components/SkillVersionsPanel.tsx#L55)

## 仍必须由公司环境决定的事项

只剩实际明道云租户的身份端点/应用注册资格、公司批准的公网域名和 HTTPS 入口、最终选用 AI 客户端及真实技能包行为。这些属于用户环境与业务数据，不是该项目源码里隐藏着的产品能力。当前未提供企业部署、真实 SSO 应用凭据和指定客户端用例；因此不能声称企业环境无 VPN/真实明道云 SSO 联调已经完成。以上确定缺陷已经足够排除 kms9 作为此次直接落地首选，无须把排除结论拖到企业联调以后。
