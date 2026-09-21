# 客户端 Skill 目录核对

核对时间：2026-09-14。先读取本地 Codex CLI 0.145.0 的 README、帮助及内置技能说明，再读取官方网页。未启动模型任务、未使用用户登录凭据。

| 客户端 | 当前官方明确列出的主要目录 | 对 iFlytek / Skilly 的意义 |
| --- | --- | --- |
| Claude Code | 项目 `.claude/skills/<name>/SKILL.md`；个人 `~/.claude/skills/<name>/SKILL.md`；另支持子项目、额外目录、插件和管理目录 | 两种安装方式只要使用 `.claude/skills`，目录选择符合当前官方文档。不能将 `.agents/skills` 单独视为 Claude Code 的已确认加载目录。 |
| Codex | 当前 Build skills 文档列项目 `.agents/skills`（从当前目录至 Git 根目录逐层扫描）、个人 `~/.agents/skills`、管理员 `/etc/codex/skills`、系统内置 | Skilly + skills@1.5.10 实测的 `.agents/skills` 符合当前官方主文档。项目安装建议显式选择 `.agents/skills`，不用把“旧默认目录肯定有效”当依据。 |
| Cursor | 项目 `.agents/skills`、`.cursor/skills`；个人 `~/.agents/skills`、`~/.cursor/skills`；并兼容 `.claude/skills`、`.codex/skills` 及其个人目录 | Skilly 安装到 `.agents/skills` 和 iFlytek 的 `.cursor/skills` 都符合官方文档；`.codex/skills` 对 Cursor 也明确是兼容路径。 |

## Codex 的 `.codex/skills` 不能一概判为失效

当前官方资料存在新主目录与保留旧目录的并存：

- 当前 [Build skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)（工具读取 L916–932）列 `.agents/skills`，没有列项目 `.codex/skills`。
- 同站 [Save workflows as skills](https://learn.chatgpt.com/use-cases/reusable-codex-skills#how-to-use)（L879–882）明确说个人 `~/.codex/skills` 中的技能在任意仓库可用。
- [App Server](https://learn.chatgpt.com/docs/app-server#skills) 的示例依然使用 `/Users/me/.codex/skills/skill-creator/SKILL.md`。
- 本地 Codex CLI 0.145.0 二进制内置的 skill-creator/skill-installer 说明也仍写：默认 `$CODEX_HOME/skills`，未配置时为 `~/.codex/skills`，可自动发现。读取的是公开安装包内置文本，不是账号数据。

据此可以确认：个人 `~/.codex/skills` 有当前官方支持证据，不应判成“不兼容”。但不能将个人目录支持直接外推成“任意项目 `.codex/skills` 在当前 Codex 所有端均已验证”。为报告提供确定的配置建议：**Codex 项目安装统一指定 `.agents/skills`；个人目录保留兼容 `~/.codex/skills`，新统一分发优先使用 `~/.agents/skills`。** 若 iFlytek 支持用户选择安装目录，这是安装配置调整，不应夸大成平台必须二开。

## 官方来源

1. [Claude Code — Choose where skills load](https://code.claude.com/docs/en/skills#choose-where-skills-load)：项目、个人、嵌套、额外目录、插件位置。
2. [OpenAI — Where Codex loads local skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)：`.agents/skills` 主目录与管理员位置。
3. [OpenAI — Save workflows as skills](https://learn.chatgpt.com/use-cases/reusable-codex-skills#how-to-use)：个人 `~/.codex/skills` 跨仓库可用。
4. [Cursor — How do I create a skill?](https://cursor.com/help/customization/skills#how-do-i-create-a-skill)：`.agents/.cursor` 主要目录、`.claude/.codex` 兼容目录。该页也明确 `~/.agents/skills` 不会自动同步到 Cloud Agents，因此本地安装通过不等于云端已分发。

## 实际运行与报告措辞

Skilly 已实际完成的是 `skills@1.5.10` 在 Claude Code/Codex/Cursor 对应**官方支持目录中的安装与版本切换**。可以写“官方目录安装与资源完整性已验证”；不应写“已运行三种 AI 客户端完成业务任务”。

另尝试本地 `codex debug prompt-input`，为项目 `.codex/skills`、`.agents/skills` 各建立一个无害夹具；使用 `cli_auth_credentials_store="ephemeral"`、关闭遥测、关闭历史、临时日志和数据库路径。该命令在现有沙箱下返回 `Operation not permitted`，未产生有效发现结果，**不得据此判目录不支持**。未为测试放宽沙箱以触及用户 Codex 工作目录，也未启动模型或登录。
