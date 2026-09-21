# Observal：企业内部 Skill 需求核查

日期：2026-09-14。固定提交：[28fd855236405cc9ca83e7b357b1362b323c801a](https://github.com/Observal/Observal/tree/28fd855236405cc9ca83e7b357b1362b323c801a)。

范围：官方源码与文档核查，以及原版安装函数的独立运行检查；没有部署完整服务，也没有接入公司的明道云、Git 或网络。所有“满足”均指已有产品机制；需要开发的地方统一标“二开可满足”。

| 需求 | 判断 | 说明 |
| --- | --- | --- |
| 明道云 SSO | 二开可满足 | 已有通用 SSO、身份绑定和首次登录建号；直接使用明道云员工身份，仍需开发用户信息映射与登录适配。 |
| 员工免注册 | 满足 | 身份接入完成后，首次登录自动建立员工账户并赋予普通用户角色；员工无需手工注册，也不必预先同步账户才能登录。 |
| 免 VPN 下载安装使用 | 二开可满足 | 正文和辅助脚本可直接从平台获取；包含图片、字体等素材的多文件技能仍需访问源 Git。需扩展平台托管和下载，才能免去源仓库 VPN。 |
| 内部内容隔离 | 满足 | 可关闭公开访问，并将内部技能限制为指定团队或成员可见；浏览、详情和安装均有权限检查。采用 Git 分发时，源仓库也需配置对应访问权限。 |
| 完整技能包分发 | 满足 | 通过 Git 分发可完整获取文档、脚本、图片、字体和样式；平台直接分发目前仅支持正文与辅助脚本。完整包是否免 VPN，见“免 VPN 下载安装使用”一项。 |
| 版本与发布管理 | 二开可满足 | 已有提交审核、版本记录和指定版本安装；恢复旧版时会残留新版新增文件，需补文件清理，才能可靠地恢复原版本。 |
| CLI 自动完成授权 | 满足 | 已有 CLI 发起浏览器登录、员工确认授权、自动领取并保存个人凭据的完整流程；无需手工复制访问令牌。 |
| 部门级权限与自动同步 | 二开可满足 | 已有人员同步、账户停用和团队权限基础；需开发明道云部门及成员映射，将入职、调岗和离职变化同步到技能访问权限。 |

## 关键源码

- [SSO 回调与首次登录建号](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/auth.py#L737)。
- [私有目录入口与团队可见性](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/deps.py#L173)。
- [安装接口与指定版本](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/skill.py#L312)。
- [分发模式、Git 文件复制和正文脚本直接安装](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal_cli/cmd_skill.py#L560)。
- [版本提交与审批](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/component_versions.py#L1)。
- [CLI 发起、轮询、领取授权](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal_cli/cmd_auth.py#L973)。
- [CLI 持久保存个人凭据](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal_cli/cmd_auth.py#L138)。
- [服务端设备授权流程](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/device_auth.py#L1)。
- [SCIM 人员及停用同步](https://github.com/Observal/Observal/blob/28fd855236405cc9ca83e7b357b1362b323c801a/observal-server/api/routes/scim.py#L1)。

## 安装函数检查

执行固定版本中未经修改的实际函数，通过 AST 提取避免加载无关 CLI 依赖；使用隔离的临时 Git 仓库与显式目标目录，只屏蔽终端输出。检查脚本见 [check-observal-install.py](check-observal-install.py)，原始结果见 [observal-installer-results.json](observal-installer-results.json)。脚本的源码输入来自 `/private/tmp/observal-selection-review/` 下按固定提交下载的对应文件。

- Git 安装传递了 7 个测试文件的相同字节，包括文档、脚本及图片、字体、样式文件。图片与字体为二进制分发测试数据，本检查不宣称它们能被渲染或执行真实品牌任务。
- 升级再安装旧提交后，旧版正文恢复，但新版新增文件仍在；平台直接分发模式切回不含脚本的版本后，新增脚本同样残留。因此版本回退列为“二开可满足”。
- 完整文件通过 Git 传递，不能证明平台已托管这些素材，也不能证明可免源仓库 VPN；需要扩展现有 registry_direct 存储、接口及 CLI 写入机制。
- CLI 自动授权的判断来自已有客户端和服务端实现；本轮没有进行浏览器 SSO 集成实测。人员同步与团队权限有实现，但不能等同于已接好明道云组织同步。
