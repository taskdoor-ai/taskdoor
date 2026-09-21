# 开源社区与维护基础

核查时间：2026-09-14 18:25:20 CST。数据来自 GitHub 官方 REST API，原始选取字段见[查询快照](community-snapshot.json)。这次仅补充社区与维护情况，功能判断仍绑定主报告列明的固定版本。

| 指标 | iFlytek SkillHub | Skilly |
| --- | --- | --- |
| Star | 5,094 | 6 |
| Fork | 834 | 0 |
| API 返回的非机器人贡献账号 | 36 | 3 |
| 仓库创建日期（UTC） | 2026-03-11 | 2026-07-09 |
| 最新推送日期（UTC） | 2026-09-14 | 2026-09-11 |
| 最近发布版本 | v0.2.20，2026-09-13 | v1.151.0，2026-09-10 |

## 选型判断

iFlytek 的仓库创建更早，Star、Fork 和贡献账号覆盖范围更大，近期仍有版本发布。结合报告已有的功能与运行依据，可将“开源社区与维护基础相对更成熟”作为优先选择 iFlytek 的补充理由。

Skilly 的社区关注度较低，但近期持续发布版本，不能因此称其停止维护或功能不完整。已有技能分发、权限及组织同步能力的判断保持不变。

Star 反映关注度，Fork 反映仓库派生数量，不等于企业用户数、实际部署量或有效外部贡献。贡献数量按 GitHub 接口返回的账号统计，并排除 type 为 Bot 的条目；账号数不等于独立自然人数。两仓库单页结果均少于 100 条，此处采用接口返回的可见贡献记录，不代表全部历史参与者。

仓库创建时间不等于产品研发起点。此次检查的每仓库最近五条发布记录可确认近期仍有维护，不能据此推导实际故障率、维护承诺或生产 SLA。“相对更成熟”限定于开源社区与可观察的维护基础，未改变公司环境尚未联调的事实。

## 官方来源

- iFlytek：[仓库数据](https://api.github.com/repos/iflytek/skillhub)、[贡献账号](https://api.github.com/repos/iflytek/skillhub/contributors?per_page=100)、[发布记录](https://github.com/iflytek/skillhub/releases)。
- Skilly：[仓库数据](https://api.github.com/repos/scalefocus/skilly)、[贡献账号](https://api.github.com/repos/scalefocus/skilly/contributors?per_page=100)、[发布记录](https://github.com/scalefocus/skilly/releases)。
