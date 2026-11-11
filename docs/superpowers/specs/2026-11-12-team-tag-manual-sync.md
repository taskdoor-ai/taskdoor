# 团队人工标签同步核对与筛选差量

> 核对基线：PM Demo `main@00aba10bb9925389997fab8a75a27bf23fa1f90d`。
> 对照：正式 [#94 最新两条评论](https://github.com/nocoly/taskdoor/issues/94)、[#96 §5](https://github.com/nocoly/taskdoor/issues/96)，及用户同步的正式 U1 `8ec77a95bfae1af6e25d51262befe3926af6f50e` 范围。本文件不作为正式接口、真实 ID、权限或部署证明。

## 已有实现，不重复开发

| 对照项 | 当前 Demo 对应实现提交 |
| --- | --- |
| 团队共享目录、成员创建／使用及按创建者维护的本地模拟 | `be7ac0a5a3991b6679f8c658bfc958bd8b95061a` |
| 团队标签删除及任务／可恢复任务关联清理 | `a6d368d70dd6b4d55d2eea3d2d592692a84f033a` |
| 设置 → 团队管理 → 团队标签；列表／详情直达和关闭回焦；固定右上角 plus；单行管理；删除 hover／focus 和确认危险色 | `80ca5d9af59a3744c76904b03439235e95699825` |

以上提交均在核对基线的祖先中。既有源文件：

- `src/app/workspace/components/PersonalInfoDialog.tsx`：团队管理分组中的团队标签入口，以当前团队有效成员资格显示。
- `src/app/App.tsx`：打开团队标签模块及发起控件回焦；向任务标签 picker 仅注入当前团队 `tagDefinitions`。
- `src/features/tasks/styles/task-detail-properties.css`：标签区 plus 绝对定位在右上角，菜单连续选择不关闭。
- `src/features/me/styles/tag-management.css`：单行列表及浅色 `#b91c1c`／深色 `#ff8178` 删除危险色。
- `src/features/tasks/lib/team-task-tags.ts`、`team-task-tag-usage.ts`：既有本地团队目录及任务贴移模拟。
- `src/features/tasks/lib/personal-tags.ts`：私人目录保留独立账号存储键；不会被当前任务 picker 读取。`PersonalTagsProvider` 的历史名称不代表注入私人目录，本基线实际传入的是当前团队目录。

## 本次唯一代码差量

列表筛选原来只保存名称；管理页改名后，任务与目录已更新，筛选仍可能停留在旧名称。本次给筛选增加独立的本地 `tagIds`，选择时绑定当前 Demo 目录身份，展示与匹配时解析最新名称。旧名称筛选继续兼容；身份缺失不得误匹配新建的同名项，删除时清理对应筛选。

修改仅涉及筛选类型／匹配、列表投影、筛选菜单／条件 chip 与删标后的筛选清理。未重做已有入口、样式、目录或贴移逻辑。任务记录仍沿用既有原型标签资料，不引入正式后端数据模型、真实 ID 或 API；本地目录 ID 不构成生产身份契约。

## 实际桌面、窄屏与键盘核对

截图取自本分支运行时，均为本地合成团队／任务资料：

| 场景 | 截图 |
| --- | --- |
| 连续选择两项，加号及菜单坐标均不变 | [01](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/01-fixed-picker-desktop.png) |
| 详情直达团队管理中的团队标签，列表单行 | [02](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/02-team-settings-desktop.png) |
| 键盘 Enter 保存改名 | [03](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/03-rename-keyboard.png) |
| 改名后同一筛选仍选中，原任务仍在结果中 | [04](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/04-renamed-filter-preserved.png) |
| 浅色键盘聚焦删除按钮 | [05](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/05-delete-keyboard-light.png) |
| 深色键盘聚焦删除按钮 | [06](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/06-delete-keyboard-dark.png) |
| 390px 标签 picker | [07](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/07-picker-mobile.png) |
| 390px 团队标签设置 | [08](../../../artifacts/prototype-review/team-tags-u1-2026-11-12/08-settings-mobile.png) |

Chrome 实测详情与列表两个管理入口关闭后均回焦发起控件；连续选择时 plus／菜单稳定；改名后目录本地 ID 保持，条件展示新名且原任务不丢；键盘危险色分别为上述精确值。向独立私人存储写入「仅私人目录审稿」标记后，已存任务 picker 不出现该项。全员入口按源码中的有效团队角色条件核对，不将本地成员夹具作为服务端授权证明。桌窄场景无横向溢出及页面运行错误。

## 验证与范围

- 31 项身份筛选、列表筛选、团队目录及贴移相关定向测试通过；新增两项先失败再通过，覆盖改名不断筛选、同名新身份及目录外身份不误匹配。
- 加上列表投影测试共 55 项，54 通过、1 项旧失败：`taskListProjection.test.ts` 的「状态选项保留所有实际状态并复用看板顺序」仍期待已移除的「待开始」。该同一用例在不含本次差量的 `d8428af5` 分支也失败；本片未修改该状态行为，不将整组报告为通过。
- 应用 TypeScript、结构门及 Vite 打包通过。未重跑全仓 `tsc -b`、全量测试或双重审查；既有全仓问题未修复，不声称整绿。
- 已有创建／AI 标签界面是原型演示；本片未修改或证明正式创建／AI 采纳 `teamTags`。正式 U1-B 仍为未来范围。
- 未涉及 #43 共享子任务建议、正式仓实现、远程 issue 变更或发布；本次同步不阻塞正式批次。
