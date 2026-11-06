# 输入与输出

应用提供只读快照并明确指定 `mode`。历史讨论调用省略 `mode` 时，带 `source` 的既有讨论请求按 `discussion` 处理。

## 共同输入

- `locale` 为说明语言，`currentDate` 为团队当前日期，格式 `YYYY-MM-DD`。
- 父任务对象为 `{id,title,goal,completionCriteria}`。讨论模式字段名为 `task`，列表模式为 `parentTask`。`completionCriteria` 是已保存的任务完成标准文本数组，允许为空。
- `members` 为有效成员数组 `[{id,name,responsibility}]`，`labels` 为可用标签名称数组。

## 从讨论生成（`discussion`）

- `source` 为选中消息 `{taskId,messageId,author,body}`，`taskId` 对应 `task.id`。
- `messages` 为同段可读讨论 `[{id,author,body,replyToId,attachments}]`，包含选中消息。`attachments` 仅含附件名称。`contextComplete` 为布尔值，表示引用链是否可完整读取。

```json
{"draft":{"title":"动作与对象","goal":"本项用途或空字符串","ownerId":"有效成员 ID 或空字符串","endDate":"YYYY-MM-DD 或空字符串","labels":[]},"message":"必要说明或空字符串"}
```

## 从子任务列表生成（`prompt`）

- `prompt` 为用户本轮提交的需求，`timeZone` 为团队时区。
- `completionCriteria` 至少有一条针对本项工作的非空标准。`participantIds` 只用有效成员 ID，去重并排除负责人。创建者默认参与由应用处理。

```json
{"draft":{"title":"动作与对象","goal":"本项用途或空字符串","completionCriteria":["可核对的本项交付要求"],"ownerId":"有效成员 ID 或空字符串","participantIds":[],"endDate":"YYYY-MM-DD 或空字符串","labels":[]},"message":"必要说明或空字符串"}
```

两种模式在无法确定一项具体工作时均返回 `{"draft":null,"message":"简述缺口"}`。`message` 使用 `locale`。只输出所选模式的字段，不附带子任务数组、子层级、来源改写、创建回执或工具调用。应用保留真实父任务与讨论来源，校验输出和权限后完成各入口的保存流程。
