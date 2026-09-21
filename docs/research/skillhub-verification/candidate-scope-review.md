# 候选范围复核

本轮矩阵更新：Skilly、Observal 已列在 iFlytek 后方；Observal 八项需求采用同一判定口径，依据见 [Observal 核查](observal-assessment.md)。安装函数检查与整套服务运行核验分别记录；五款产品的最新 Star 见 [矩阵快照](matrix-community-snapshot.json)。

日期：2026-09-14。对应[选型报告](../2026-09-14-internal-skillhub-selection-report.html)。原始查询见[候选元数据与官方资料](candidate-scope-snapshot.json)，初步发现过程见[按 Star 排序的检索摘要](candidate-search-summary.json)。

## 本次业务范围

候选首先必须与企业内部 Skill 管理直接相关：由平台维护内部目录和技能内容，员工通过受控身份获取，维护者管理发布与版本。社区关注度只在业务定位匹配之后比较。iFlytek 与 Skilly 属于直接同类产品；Observal 属于含独立 Skill 管理功能的综合平台，需要评价其 Skill 部分对本需求的适用程度。

ClawHub 的公开注册中心定位，以及 Vercel Skills、OpenSkills 的安装工具定位，与完整内部管理平台不同。因此从主要备选中排除，保留检索记录用于解释为何不选。kms9 与 Agent Registry 的原有核验记录只说明其被排除的原因。

## 对原候选范围的修正

原报告围绕最初列出的 iFlytek、kms9、Skilly 和 Agent Registry 深入核验，未先完成更广范围的候选筛选。因此，原有四款之间的判断可以保留，但不能将“iFlytek 比几款小社区项目更成熟”推广成“市场上没有更成熟或同样合适的替代品”。候选覆盖不充分是原调研的限制。

本轮通过 GitHub 仓库搜索，按 Star 降序读取以下查询的前 15 项：`skillhub in:name fork:false`、`skills registry in:description fork:false`、`skills manager in:description fork:false`，再定向读取高关注项目和相近平台的官方 README。搜索结果用于发现，最终分类依据官方项目资料。关键词与每次返回上限会影响覆盖率，这不是全市场穷尽调查。

## 候选分类

| 项目 | 查询时 Star | 本次角色 | 依据与判断 |
| --- | --- | --- | --- |
| [ClawHub](https://github.com/openclaw/clawhub) | 9,419 | 排除：公共注册中心定位 | 有发布、版本、搜索、下载和 CLI；公共注册中心定位，正式身份实现为 GitHub，内部化需评估身份及内容准入 |
| [Observal](https://github.com/Observal/Observal) | 2,361 | 相关候选：含内部 Skill 管理的综合平台 | 自行部署的内部技能与组件目录；官方文档包含通用 OIDC、SAML 建号、SCIM 和 CLI 设备授权，不能因原报告聚焦 Skill 就忽略其技能管理部分 |
| [Vercel Skills](https://github.com/vercel-labs/skills) | 31,590 | 排除：单独的安装工具 | 安装、加载与更新工具；不是单独的企业身份、内容权限和发布审批后台 |
| [OpenSkills](https://github.com/numman-ali/openskills) | 10,753 | 排除：单独的安装工具 | 通用技能加载和安装工具，支持私有 Git 来源；不等同于完整内部管理平台 |
| [SkillKit](https://github.com/rohitg00/skillkit) | 1,499 | 工具路线参考 | 安装、格式转换、分享及可选 REST 服务；本轮资料不足以认定它具有本需求所需的完整企业治理后台 |
| [saker-ai/skillhub](https://github.com/saker-ai/skillhub) | 6 | 轻量平台参考 | 有单体服务、版本及角色能力，但社区规模同样较小，不能用它弥补原候选池的成熟度覆盖问题 |
| [Tencent/skillhub](https://github.com/Tencent/skillhub) | 27 | 托管服务与接口路线参考 | 仓库公开的是 API 文档、插件及技能；不能将其直接视作完整可自行部署的平台源码，也不能用该文档仓库 Star 代表托管产品规模 |
| [kms9/skillhub](https://github.com/kms9/skillhub) | 7 | 原有轻量方案参考 | 固定版本的功能缺口沿用原有记录，不作为成熟产品代表 |
| [Agent Registry](https://github.com/agentregistry-dev/agentregistry) | 488 | 原有分发架构参考 | 固定开源版的身份和源 Git 依赖沿用原有记录，不计入商业版能力 |

iFlytek 与 Skilly 的同日数据分别为 5,094 Star 和 6 Star，见[此前查询快照](community-snapshot.json)。Star 用于社区关注度筛选，不代替需求匹配或实际质量评价。高 Star 的技能内容集合不自动列为平台候选。

## 已读取的直接依据

- ClawHub：[官方 README](https://github.com/openclaw/clawhub/blob/8c2de6c506bb4efabe3f0c2ffb8370b9e23d4650/README.md)、[正式身份 Provider 实现](https://github.com/openclaw/clawhub/blob/8c2de6c506bb4efabe3f0c2ffb8370b9e23d4650/convex/auth.ts)。身份代码使用 GitHub Provider，另有仅限开发环境的凭据入口；不能将开发入口当企业 SSO。
- Observal：[认证说明](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/self-hosting/authentication.md)、[CLI SSO](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/self-hosting/cli-sso.md)、[SCIM 人员同步](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/self-hosting/scim-setup.md)。本轮读取了这些固定提交文档并确认源码树存在相应路由与服务，尚未执行其登录、同步、技能发布下载和回退测试。文档列出能力不能直接替代运行结果，通用 SSO 也不能自动视为已接入明道云。
- 安装工具：[Vercel Skills README](https://github.com/vercel-labs/skills)、[OpenSkills README](https://github.com/numman-ali/openskills)、[SkillKit README](https://github.com/rohitg00/skillkit)。
- 扩展路线：[saker-ai README](https://github.com/saker-ai/skillhub)、[Tencent 仓库公开范围](https://github.com/Tencent/skillhub)。

## Observal 是否管理内部 Skill

答案是具备相关管理功能，依据并不只来自项目简介：[独立 Skill 命令](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/cli/skill.md)列出提交、查看审核通过且可见的技能、安装、编辑、归档、恢复及所有者维护；[团队注册中心](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/use-cases/team-registry.md)描述集中部署、员工身份、审核与角色控制。可独立管理 Skill，不能将其仅视为技能安装器。

同时，[Skill 存储与分发说明](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/docs/registry-skill-helper.md)将 registry_direct 用于小型自包含技能，存储 SKILL.md 与可选脚本；多文件技能推荐 git_fetch。这会涉及品牌图片、字体及其他素材完整托管的问题，因此不能从“有内部 Skill 目录与 SSO”直接推导“已满足我们的完整技能包和免源仓库 VPN 分发”。本轮确认的是文档定义的功能范围，未执行其完整技能包分发测试，也不据此断言不存在其他可扩展的归档能力。

## 推荐边界

本轮按业务定位进一步筛选，保留 Observal 的内部 Skill 管理部分作为相关候选；ClawHub 与安装工具移出主要备选。主报告目前只能推荐“已完成详细核验的四款中优先选择 iFlytek”，不能得出其在新增候选中仍然必然最优的结论。没有为维持原推荐而将新增平台直接判为不满足，也没有把未运行的流程写为已验证通过。

本次只评估这些产品的 Skill 管理与身份分发相关部分，不扩大业务需求范围。
