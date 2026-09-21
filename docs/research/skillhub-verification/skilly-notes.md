# Skilly 固定版本验证结果

版本：v1.151.0，提交 `225eeeb6f076c8f726a2e47f2c7b389b9e49b400`。公开源码下载到本目录；未改动主报告或用户项目依赖。测试执行于临时目录，使用合成用户和令牌、127.0.0.1 HTTP 服务，没有公司真实账号，也没有运行全量测试。

## 可直接用于报告的判断

| 项目 | 已得到的结论 | 验证层级 |
| --- | --- | --- |
| 完整技能资源包 | PNG、WOFF2、SVG、CSS、参考 Markdown、Python 脚本能完整保留并安装；ZIP/TGZ 经 Web 与 Worker 实际提取后各 7 文件，SHA-256 全部一致。 | 实际运行源码与安装客户端 |
| 版本安装和回退 | 可固定 1.0.0、安装 latest（1.1.0）、重新指定 1.0.0 回退；三轮内容及素材哈希通过。重复发布 1.0.0 被不可变标签校验拒绝。这里是重新执行安装命令实现更新/回退，并非声称存在独立 rollback 命令。 | 实际运行源码、真实 Git 与 skills@1.5.10 |
| 客户端安装目录 | skills@1.5.10 实际将 Claude Code 安装到项目 `.claude/skills/brand-proof`，将 Codex 和 Cursor 安装到项目 `.agents/skills/brand-proof`。 | 真实安装；未启动 AI 客户端做模型任务 |
| 免 VPN 的产品条件 | 员工从 Skilly 自己提供的认证 Git 服务或网页下载包，安装无需访问原始 Git 仓库。产品没有固有 VPN 依赖。部署域名、SSO 与运行时外部依赖能否在公司日常网络访问属于部署条件，不能用本地测试宣称公司网络已经验收。 | 源码与本地认证 HTTP 安装通过 |
| 员工免注册 | 现成流程由 SCIM/Entra Graph 同步用户；Entra 登录回调仅更新已有账户，不负责创建新用户。未知用户在业务接口被拒绝。因此原文“首次登录自动建号未证实”应改成明确事实“采用 SCIM 预置，明道云需接入用户同步或补首次登录建号”。 | 登录/权限/SCIM 源码确认 |
| CLI 自动授权 | Skilly 不提供自己的 CLI。网页登录后，服务端自动创建安装令牌并生成完整安装命令，用户复制整条命令即可，不必单独拼令牌；这不是 CLI 发起浏览器 SSO 并接收回调。另有 MCP 的 OAuth/PKCE，不应混算为 `skills add` 的登录能力。 | 官方 README 与命令生成/鉴权源码确认 |
| 内容隔离 | 未认证 Git 请求实测返回 HTTP 401。原仓库 `authorize.test.ts` 22 项全通过，包含错误技能令牌、无部门权限、停用用户、禁止推送。 | 真实 HTTP 与原仓库定向测试 |

## 已发现的具体限制

- 常规图片/字体允许。默认拒绝 `exe/dll/so/dylib/bin/o/a/class/jar/msi/apk/dmg/deb/rpm` 等扩展，不能泛称接受任何二进制工具。
- ZIP 里有外层 `brand-proof/` 包裹目录时，`brand-proof/scripts/render.py` 在剥离目录前判断可执行性，产生 `100644`；相同内容 TGZ 保留原来的 `100755`。文件内容和相对路径完整；直接执行脚本时须选 TGZ、使用 `python3 scripts/render.py`，或修正该权限判断。`.sh/.bash` 因按扩展判断不受此案例影响。此为实际发现，不是泛泛“需验证”。
- 固定测试的源码函数是真实实现，数据库/真实 OIDC/S3 并未搭建；用于 Git 鉴权的用户查询依赖由合成记录提供。不要称为整套 Skilly 生产环境端到端验收。
- 没有运行公司实际 design/brand Skill，也没有让真实 Claude Code/Codex/Cursor 模型执行任务；完成的是归档分发、认证安装和版本切换。脚本内容执行及外部模型/服务网络依赖属于业务运行验收。

## 一手源码依据

- [资源类型校验及大小边界，validate.ts L36–83](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/shared/src/validate.ts#L36)
- [上传原字节保存，uploadPipeline.ts L51–65](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/uploadPipeline.ts#L51)
- [从平台存储读取并返回原始归档，download.ts L31–109](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/download.ts#L31)
- [ZIP 可执行权限判断及前缀剥离次序，bundle.ts L74–96](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/git/bundle.ts#L74)
- [平台合成 Git 仓库及不可变标签，synth.ts L140–189](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/git/synth.ts#L140)
- [外部仓库在服务端镜像为归档，mirror.ts L247–274](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/git/mirror.ts#L247)
- [官方明确无自有 CLI、复制安装命令，README L77–89](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/README.md#L77)
- [版本引用和安装命令，external-tool.ts L23–79](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/shared/src/external-tool.ts#L23)
- [Entra 回调仅更新已有记录，auth.ts L30–95](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/auth.ts#L30)
- [仅查询已存在且 active 的用户，access.ts L25–38](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/access.ts#L25)
- [SCIM 创建用户路径，router.ts L55–64](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/scim/router.ts#L55)
- [Git 访问授权，authorize.ts L175–205](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/worker/src/git/authorize.ts#L175)
- [浏览器 MCP OAuth 独立入口](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/app/oauth/authorize/page.tsx)
- [固定外部安装客户端 skills@1.5.10](https://www.npmjs.com/package/skills/v/1.5.10)

## 实际运行记录

命令：

```text
node /private/tmp/skillhub-verification/skilly/verification-runtime/build.cjs
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node /private/tmp/skillhub-verification/skilly/verification-runtime/verify.mjs
/Users/yxzuji/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test /private/tmp/skillhub-verification/skilly/verification-runtime/authorize.test.mjs
```

`verify.mjs` 成功退出 0：4 组归档检查全部通过；3 轮版本安装全部通过；素材哈希一致；匿名请求 401；标签不可变检查通过。授权定向测试 22 通过 / 0 失败。后续脚本模式检查已记录 ZIP=100644、TGZ=100755。

结果 JSON：`/private/tmp/skillhub-verification/skilly/verification-runtime/result.json`

脚本：`verification-runtime/verify.ts`；实际源码通过 esbuild 编译，不修改 Skilly 产品函数。只安装归档运行库 `tar@7.5.22`、`adm-zip@0.6.0` 和 `skills@1.5.10` 到临时 `verification-runtime/node_modules`。安装客户端遥测关闭、状态目录单独放在临时 `XDG_STATE_HOME`，未写用户 Skills 目录。
