# iFlytek v0.2.20 通用 OIDC / JIT 真实集成验证

结果：**通过**。使用正式 Docker 镜像 ghcr.io/iflytek/skillhub-server:v0.2.20、实际 PostgreSQL 和 Redis，以及标准 Node oidc-provider 9.8.1（临时签名和虚构测试用户）。经真实 discovery、授权码、token、签名 ID Token、userinfo 和回调建立平台会话。

首次登录之前，对 provider_code=verifyoidc、subject=skillhub-jit-fixture-20260914 的数据库查询为 0 行。登录后为 1 行：

- user ID：usr_6769b6a2-dc83-4eca-b27c-6b780d3c8254
- display_name：jit-fixture-one
- status：ACTIVE
- 已验证 email：jit-fixture@example.test
- identity_binding：verifyoidc + skillhub-jit-fixture-20260914
- 平台角色：USER
- global 命名空间角色：MEMBER
- 自动创建个人命名空间，角色 OWNER
- local_credential 数量：0，不要求本地注册/设置密码
- /api/v1/auth/me：HTTP 200，canChangePassword=false

清空客户端会话后，保持相同 sub，将虚构 IdP 的 preferred_username 从 jit-fixture-one 改成 jit-fixture-two 再次完整登录：

- 用户 ID 仍为 usr_6769b6a2-dc83-4eca-b27c-6b780d3c8254，数据库账号和绑定仍只有 1 行
- display_name 更新为 jit-fixture-two
- 仍 ACTIVE、USER、global MEMBER；个人命名空间未重复建
- local_credential 仍为 0
- /api/v1/auth/me 再次 HTTP 200
- identity_binding.login_name 保留初次值 jit-fixture-one，user_account.display_name 正常更新；此字段不应当作稳定身份键，真实身份键为 provider_code + subject。

## 执行

标准库安装在本临时目录，仅使用虚构测试用户：

```sh
npm install --prefix /private/tmp/skillhub-verification/iflytek-oidc --ignore-scripts --no-audit --no-fund oidc-provider@9.8.1
node /private/tmp/skillhub-verification/iflytek-oidc/provider.mjs
docker compose -p skillhub-verify-20260914 -f /private/tmp/skillhub-verification/compose.iflytek.yaml -f /private/tmp/skillhub-verification/iflytek-oidc/compose.oidc.override.yaml up -d --no-deps server
node /private/tmp/skillhub-verification/iflytek-oidc/verify-jit.mjs
```

最后命令 exit 0。运行用 Node 24.19.0。为兼容 Docker 内 host.docker.internal 与宿主机访问，验证 HTTP 客户端使用进程内 DNS 映射到 127.0.0.1，保留 issuer 域名与 Cookie 域；未改系统 DNS 或用户浏览器。最初一次测试脚本因直接重写 URL 导致 Cookie 域不一致失败，修正测试网络映射后两次流程均通过；此为验证脚本问题，并非 SkillHub 缺陷。

## 证据边界

可以将“标准 OIDC 是否真的可配置使用、首次建号及默认角色是否可用、重复登录是否重复建号”等由待验证改为“已实测通过”。本次未接入真实明道云应用或真实员工账号，不能称“明道云 SSO 联调已完成”。明道云身份协议/组织准入适配依旧属于明确二开内容。

## 源码依据（固定提交）

- [标准 claims 映射](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/oauth/CustomOidcUserService.java#L87-L115)
- [provider+sub 幂等绑定与首次建号](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-auth/src/main/java/com/iflytek/skillhub/auth/identity/IdentityBindingService.java#L81-L126)
- [global 默认 MEMBER](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/server/skillhub-domain/src/main/java/com/iflytek/skillhub/domain/namespace/GlobalNamespaceMembershipService.java#L23-L31)
- [官方 OIDC 部署配置](https://github.com/iflytek/skillhub/blob/36de54157bff59c18c5eff255d2c158df45a3e2a/docs/09-deployment.md#L289-L324)

完整 redacted HTTP 流程、会话响应与三次数据库快照见 jit-results.json（无 token、密码、Cookie 值）。
