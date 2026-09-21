# Agent Registry 开源版验证记录

核验版本：v0.4.0，固定提交 `aef65635f1dd71ecb279218a04b948801a801f84`。核验日期：2026-09-14。未改动主报告，未访问公司身份系统，未部署外部服务。

## 可直接落入报告的结论

Agent Registry 开源版不推荐用于当前内部 SkillHub：认证及权限默认为开放，且技能下载仍在员工电脑直接克隆源 Git 仓库，不能解决现有源仓库的 VPN 依赖。已通过原始 Go 函数实测，普通文件的二进制内容、相对目录及脚本权限可以保留；原地回退会遗留新版文件，不能视作完整回退。

| 报告需求 | 建议判定与明确说明 |
| --- | --- |
| 明道云 SSO | 不满足现成能力。开源版没有内置身份 Provider，仅提供认证、授权扩展接口；需自行接入。 |
| 员工免注册 | 不满足现成能力。默认没有员工身份认证流程；匿名访问不等于员工身份免注册。 |
| 免 VPN 下载安装使用 | 不满足现有受限仓库场景。`arctl pull skill`直接 `git clone` 原仓库；原仓库需 VPN 时仍需 VPN。 |
| 内部内容隔离 | 不满足默认配置。认证为空，授权允许所有动作且将访问视为管理员；需新增身份和权限策略。 |
| 完整技能包分发 | 普通文件复制已实测通过。九类/项普通文件逐字节一致，目录及脚本权限保留；符号链接明确跳过，且内容来自源 Git。若表格必须单一状态，可列“部分满足”，解释普通文件已验证、符号链接不复制。不要再写资源完整性待验证。 |
| 版本与发布管理 | 部分满足。支持 registry `--tag`、Git branch/commit/subfolder；固定 commit 实测可取回旧内容，但原地覆盖会遗留新版文件；OSS 写入直接进入生产 Store，不含现成审批。 |
| 客户端兼容 | 部分满足。可显式指定输出目录，复制到临时 `.claude/skills/design`和`.codex/skills/design`成功；默认输出当前目录下 `NAME`，未自动选择客户端。`arctl configure` 配的是 MCP 连接，不能作为 Skill 加载兼容证据。客户端实际发现/执行仍由目标客户端及具体技能决定。 |
| CLI 自动完成授权 | 不满足 OSS 现成能力。原生 CLI 提供 bearer token 参数/环境变量和 AuthProvider 扩展接口，默认 Noop；企业版设备授权不能计入 OSS。 |
| 部门级权限与自动同步 | 不满足现成能力。默认匿名和放行，没有可直接复用的员工部门策略；需新增。 |

## 运行验证

在 `function-check` 隔离目录原样复制固定提交的 `gitutil.go` 和原有 `gitutil_test.go`，新增两个针对此次调研问题的功能测试；不依赖第三方 Go 模块，不运行项目全量测试。使用隔离 Go 1.26.4 工具链、关闭 Go 网络下载。

命令：

```sh
GOENV=off GOPROXY=off GOSUMDB=off GOTOOLCHAIN=local \
GOCACHE=/private/tmp/skillhub-verification/agent-registry/gocache \
/private/tmp/skillhub-verification/agent-registry/go/bin/go test -v \
  -run 'TestVerification|TestCopyRepoContents|TestCopyFile|TestCopyDir|TestParseGitURL' .
```

结果：退出码 0，六个顶层测试全部通过，执行测试部分用时 1.548s。原始日志：`test-results.txt`；验证代码：`function-check/verification_test.go`。`gitutil.go` 未修改。

### 资源复制

- 实测对象：SKILL.md、PNG 二进制载荷、JPEG 二进制载荷、WOFF2 二进制载荷、SVG、CSS、Python 脚本、Markdown 引用、隐藏配置文件；二进制载荷用于验证传输字节，不声称通过图像或字体解码器。
- 对所有九项文件读取后比对原始字节并输出 SHA-256，全部一致。
- CSS 到字体、SKILL.md 到素材/脚本的相对目录保持原样；可执行权限 0755 保留。
- `.git` 与资源目录中的符号链接按实现明确跳过。

### 固定版本与回退

- 本地创建真实 Git 仓库两次提交 v1、v2。使用仅影响子进程的 Git URL rewrite，把函数要求的 GitHub URL 转到本地 fixture；原始函数依旧运行真实 `git clone`、`git fetch`、`git checkout`，没有伪造 git 程序。
- 在同一临时 `.claude/skills/design` 目录先拉取 v2，再固定 commit 拉取 v1。SKILL.md 回到 v1；v2 新增的 `assets/new-only.txt` 仍残留。
- 在全新临时 `.codex/skills/design` 目录拉取 v1，内容正确且没有残留文件。
- 结论：固定 commit 拉取能力已证实；原地重复拉取是覆盖合并，不是干净、原子的版本回退。这里验证的是客户端常用样式目录的文件落盘，不等于已经在真实 AI 客户端执行技能。

## 固定源码依据

1. [SkillSource 仅 Git 仓库，未来制品渠道未实现](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/skill.go#L22-L27)。
2. [正确命令 `arctl pull skill`、DIRECTORY 默认 NAME、--tag](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/declarative/pull.go#L17-L46)。旧报告如写 `arctl skill pull`应更正。
3. [从 registry 读 Spec.Source.Repository，并把 URL/Branch/Commit/Subfolder 交给 clone](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/declarative/pull.go#L86-L109)。该路径使用 `Spec`，没有读取 `Status.ResolvedSource.Commit`；只打 registry 标签而未固定 source commit，不保证 branch 内容不可变。
4. [真实执行 git clone、fetch、checkout](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/common/gitutil/gitutil.go#L154-L189)。原仓库认证和网络条件仍适用。
5. [普通文件递归复制、跳过 .git 和 symlink](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/common/gitutil/gitutil.go#L333-L389)。
6. [CopyFile 使用 io.Copy，不检查后缀或 MIME，保留源文件权限](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/common/gitutil/gitutil.go#L438-L465)。
7. [Repository 支持 Branch/Commit/Subfolder，未指定时用默认 branch](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/api/v1alpha1/common.go#L3-L14)。
8. [服务启动默认 AuthnProvider 未设置，AuthzProvider 默认为 Public](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/registry/registry_app.go#L62-L72)。
9. [PublicAuthzProvider.Check 总是 nil，IsRegistryAdmin 总是 true](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/auth/authz.go#L50-L66)。
10. [官方安全自评明确默认禁用认证、无内置 IdP](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/docs/governance/cncf/security-self-assessment.md#L107-L113)。
11. [OSS 默认 ProductionAdmission 直接写生产 Store](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/resource/core.go#L130-L176)。保留扩展点不等于自带审批队列。
12. [CLI bearer token 参数和根命令集合](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/cli/root.go#L38-L93)；[默认 NoopAuthProvider](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/cli/runtime/config.go#L42-L54)。
13. [arctl configure 实际写 MCP URL 和认证配置](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/internal/cli/configure/configure.go#L48-L82)，不能据此宣称安装 Skill 到各 AI 客户端。

## Enterprise 边界

最新官方商业产品文档明确列出 OIDC、访问策略、CLI device authorization、Web PKCE 和审批模式。此处只能确认商业版文档承诺，未部署企业版，不计入本次开源比较。

- [Solo Enterprise access control](https://docs.solo.io/agentregistry/latest/security/overview/)
- [Solo Enterprise artifact approval](https://docs.solo.io/agentregistry/latest/security/approval/)
- [Solo Enterprise CLI](https://docs.solo.io/agentregistry/latest/reference/cli/)

## 哪些不能冒充已完成

未访问明道云组织配置、身份测试账号、公司公网入口、真实品牌技能包及指定客户端。上述本地实测可以关闭“资源字节是否保留”“固定 commit 能否拉取”等技术问题，不能声称已完成公司 SSO 登录或公司网络免 VPN 验收。对于 Agent Registry，源 Git 依赖和 OSS 身份缺口已有确定证据，不必等待公司环境就可作出不推荐结论。
