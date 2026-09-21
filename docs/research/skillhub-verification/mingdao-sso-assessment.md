# 明道云 SSO 接入能力判定

核查日期：2026-09-14。对应[选型报告](../2026-09-14-internal-skillhub-selection-report.html)。

## 本次选型口径

本项评价“接入明道云员工身份”，不能将“支持通用 SSO”直接等同于“明道云已可用”。所需功能已存在、仅使用配置即可完成时标为“满足”；已有接入基础，但仍需编写身份适配代码时标为“二开可满足”。首次建号、内部内容权限、部门与停用同步分别在对应需求中评价。

因此 iFlytek、kms9、Skilly 的明道云 SSO 项统一判为“二开可满足”，明确记录各自适配内容。Agent Registry 开源版缺少现成身份登录流程，判为“不满足”。本次调整纠正了此前将“通用 SSO 能力”与“明道云接入可用”混合的口径，不表示完成了适配或公司环境联调，也不代表三个产品的适配工作量相同。

## 明道云官方文档核查

- [单点登录文档](https://docs-pd.mingdao.com/faq/sso/)列出 OAuth 2.0、CAS、OIDC、Ticket、SAML2 的自主集成方式。[OIDC 接入说明](https://docs-pd.mingdao.com/faq/sso/oidc/)提供身份源地址、客户端信息、回调地址和用户字段映射配置。其方向是 **HAP 接入外部身份源**，可作为 HAP 与 SkillHub 共用公司身份源的依据；不能单凭此文档认定 HAP 自身就是 OIDC 身份提供方。
- [明道开放平台新手指南](https://open.mingdao.com/DevGuid)明确介绍第三方应用发起 OAuth 授权、获取令牌、查询当前账户并绑定应用自身用户的步骤。这是“使用明道账号登录第三方应用”的官方接入依据。该指南采用早期开放平台接口，不能直接将接口地址和参数套用于所有当前 HAP 租户。
- [HAP OAuth 应用说明](https://help.mingdao.com/org/thirdapp/)确认当前 HAP 可向第三方应用签发代表用户身份的访问令牌，并支持组织控制和个人授权。文档重点是 API 访问授权，不是通用 OIDC 身份提供方说明，也未证明任意自建应用都可直接使用早期开放平台接口。

综合官方文档与候选产品源码，存在通过标准身份源或明道用户授权接入的技术路径。具体租户可用的应用登记方式、接口和用户字段仍需匹配。若公司已使用通用 OIDC 身份源，iFlytek 有复用该身份源的配置路径；但本次未确认公司具有该条件，不能据此把“直接接入明道云”标为满足。主报告统一按仍需身份适配的路径评价，不承诺零代码直连。

## 候选产品对应实现

| 产品 | 已核实的接入基础 | 明道云接入涉及的工作 |
| --- | --- | --- |
| iFlytek | 已有 OAuth2/OIDC 登录、身份绑定和自动建号；通用 OIDC 正式服务测试已通过 | 配置所选身份源；如直接对接明道 OAuth，需要实现对应字段映射及必要的协议参数适配 |
| kms9 | IdentityProvider 接口覆盖授权跳转、授权码兑换和获取外部身份；已有多个 OAuth Provider | 增加明道 Provider 并接入现有身份登录流程 |
| Skilly | Auth.js OIDC 登录已接 Entra，已有登录回调及会话处理 | 增加适用的 Provider，调整 Entra 特定身份字段和登录回调；用户预置或自动建号另行评价 |
| Agent Registry 开源版 | 默认认证为空、授权放行，没有现成 SSO 登录流程 | 需要新增身份登录体系，不能将商业版能力计入开源版 |

固定版本依据：

- iFlytek：[认证扩展说明](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/11-auth-extensibility-and-private-sso.md)、[OAuth 登录处理与 Provider 映射](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/oauth/OAuthLoginFlowService.java)、[原有 OIDC 实测记录](iflytek-oidc-results.json)。
- kms9：[IdentityProvider 接口](https://github.com/kms9/skillhub/blob/228c46e1d3eeee3b7464d0f1d77b4f019a602f14/backend/internal/service/auth_provider.go)。
- Skilly：[OIDC 配置、身份映射与回调](https://github.com/scalefocus/skilly/blob/225eeeb6f076c8f726a2e47f2c7b389b9e49b400/packages/web/src/lib/auth.ts)。
- Agent Registry：[开源默认授权实现](https://github.com/agentregistry-dev/agentregistry/blob/aef65635f1dd71ecb279218a04b948801a801f84/pkg/registry/auth/authz.go)。

本轮工作为官方文档检索及固定源码复核，没有使用公司账号、没有新建真实 OAuth 应用，也没有变更任何线上身份配置。
