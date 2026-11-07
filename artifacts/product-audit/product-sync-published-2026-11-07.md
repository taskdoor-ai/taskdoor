# PM Demo 与正式 issue 同步交付 · 2026-11-07

- 正式 issue：[nocoly/taskdoor#77](https://github.com/nocoly/taskdoor/issues/77)，共16项，见[正文归档](product-sync-pending-issue-2026-11-05-02.md)。
- PM Demo：[PR #23](https://github.com/taskdoor-ai/taskdoor/pull/23)，目标分支 `main`，实现提交 [`19f1a135`](https://github.com/taskdoor-ai/taskdoor/commit/19f1a1355c0f39610ff6dc62ec18f70e24b8e3d5)。创建时基于最新 `origin/main`（`89b24633`），包含已交付的 @全体成员历史。
- 范围：统一列表单行新建及详情外层入口、通知与任务筛选、任务引用、人员与邀请角色、个人标签、回收站、菜单方向、编号／日期／留白、相关 Skill、讨论草稿预填及建议逐条处理。完整自动建议生成链路仍见[后续待办](task-generation-followup-2026-11-07.md)，不宣称接通。未打包此前暂缓的持久草稿恢复、文件标注及 AI 交接增量，未发布新 PRD 版本。
- 已将“用户授权提交正式 issue 时，同步提交并交付对应 PM Demo，再补齐本批固定提交／PR／源码链接”写入 `AGENTS.md`。仅本地实现或历史基线链接不算完成交付。

验证：

- `npm run structure:check`、`npm exec tsc -- -p tsconfig.app.json`、`npm exec vite -- build`、`git diff --check` 通过。
- 邮箱邀请、单行创建保存、标签排序、讨论预填、建议保存、直接子任务生成、通知来源、讨论呈现、人员校验及详情加载等12个相关测试文件共107项通过，未运行全量测试或双重审查。
- `npm run build` 的 `tsconfig.node` 检查仍报63个类型错误。在最新 `origin/main` 的干净临时工作目录执行同一编译核对后，63个错误按文件、错误码和首行信息逐条一致，新增0。产品类型检查及页面构建独立通过。临时日志保留于 `/tmp/taskdoor-demo-77-build-final.log` 与 `/tmp/taskdoor-demo-77-baseline-node-typecheck.log`，不将总构建写成通过。
- Git HTTPS 推送连接失败后，通过 GitHub Git Data 接口上传；远程文件树和提交 SHA 均与本地已验证提交完全一致。
