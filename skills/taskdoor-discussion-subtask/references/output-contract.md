# 字段契约

应用提供只读快照。旧请求带 `source` 且省略 `mode` 时按讨论处理。

- `locale` 为说明语言，`currentDate` 为团队日期（`YYYY-MM-DD`）。
- 父任务是 `{id,title,goal,completionCriteria}`，讨论用 `task`，列表用 `parentTask`。完成标准是文本数组，可为空。
- `members` 为有效成员 `[{id,name,responsibility}]`，`labels` 为可用标签名称。

## 讨论 `discussion`

`source` 是选中消息 `{taskId,messageId,author,body}`。`messages` 是同段可读消息 `[{id,author,body,replyToId,attachments}]`，包含选中消息，附件只提供名称。`contextComplete` 表示引用链是否完整可读。

可选的 `referencedTasks` 仅包含同串消息实际引用且当前可读的任务 `[{id,title,goal?,completionCriteria?}]`。通过 ID 对应 `#taskdoor-task=id` 链接，使用目录中的真实名称及适用定义，不把数字标签或隐藏链接当成工作内容；目录缺失不推测无权访问任务的信息。

```json
{"draft":{"title":"动作与对象","goal":"本项工作有依据的用途或期望状态","completionCriteria":["可核对的本项交付要求"],"ownerId":"","endDate":"","labels":[]},"message":""}
```

讨论模式的成功结果始终包含一个可编辑的非空 `draft`，`message` 固定为空。新生成结果带 `completionCriteria` 文本数组；有限具体事项至少一条，纯记录没有可核对要求时可为 `[]`。应用兼容旧响应缺少此字段，但不把父任务标准自动填入。只有任务引用、数字、寒暄或零散文字时，按选中讨论、真实引用任务、同串正文及当前任务的已有定义整理。可以复用适用的已有目标，不能机械套用宽泛父目标；不能返回 `draft:null` 或在名称、目标里填写占位说明。已完成、撤回或暂缓事项可整理现有记录，不能伪造重新开始或新的业务事实。

范围有限且能合理排期的讨论事项未给日期时，`endDate` 为可修改、可清除的 AI 预计完成日，另在 `draft` 附可选字符串 `endDateSuggestion`（至多500字符）说明关键假设。明确日期、空日期和明确不设日期时不输出此字段；不将说明塞进目标、完成标准或 `message`。应用显示估计来源与依据，人工修改或清除日期后隐藏原估计说明。此说明不作为真实任务字段保存，确认后的日期才成为本次计划截止。

## 子任务列表 `prompt`

`prompt` 是本轮需求，`timeZone` 是团队时区。`participantIds` 用有效成员 ID，去重并排除负责人。

```json
{"draft":{"title":"动作与对象","goal":"","completionCriteria":["可核对的本项交付要求"],"ownerId":"","participantIds":[],"endDate":"","labels":[]},"message":""}
```

列表模式无法确定一项待办时可返回 `{"draft":null,"message":"简述缺口"}`。

负责人填成员 ID，日期用 `YYYY-MM-DD`。不确定的负责人和标签保持空值；日期按所选模式及[排期规则](task-planning.md)判断，不编业务数值或外部承诺。只输出所选模式的字段。应用负责真实来源、权限、防重及保存；讨论先由用户审阅确认，列表沿本轮提交授权。网络、权限、取消及来源失效仍由应用按真实错误处理，不以成功草稿掩盖。
