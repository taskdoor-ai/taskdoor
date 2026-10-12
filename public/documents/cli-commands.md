# TaskDoor 常用命令 / Command reference

工作空间参数只指定操作目标，不改变登录授权。服务地址使用当前 TaskDoor 部署地址。

| 操作 / Action | 命令 / Command |
| --- | --- |
| 登录状态 / Login status | `taskdoor login status` |
| 当前账号 / Current account | `taskdoor whoami` |
| 工作空间列表 / List workspaces | `taskdoor workspace list` |
| 切换工作空间 / Use workspace | `taskdoor workspace use <workspace-id>` |
| 任务列表 / List tasks | `taskdoor task list --workspace <workspace-id>` |
| 任务详情 / Task details | `taskdoor task get <task-id> --workspace <workspace-id>` |
| 无浏览器设备登录 / Device login | `taskdoor login --server <server-origin> --device-auth` |
| 退出登录 / Logout | `taskdoor logout` |

安装和配置步骤见 [CLI 安装帮助](cli-setup.md)。
