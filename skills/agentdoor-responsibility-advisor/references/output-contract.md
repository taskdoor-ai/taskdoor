# 人员责任分析：输出契约

使用共享包络，`schemaVersion=agentdoor.responsibility-advice.v0.1`。以下定义 `result`；示例中的 ID 仅演示字段关系，实际运行必须使用本次输入。

## result 字段

| 字段 | 类型与规则 |
| --- | --- |
| mode | `analyze`、`prepare_update`、`apply_confirmed` |
| responsibilityVersion | 当前责任集合的输入版本；字符串或数字，缺失为 null |
| proposals | 建议数组；没有建议用空数组，不填占位建议 |
| update | 未请求或未实际执行更新时为 null；实际更新过程包含 proposalId、confirmedOperation、expectedVersion、receipt |

每项 proposal 必须给出：

| 字段 | 类型与规则 |
| --- | --- |
| proposalId | 受信调用方提供或实际持久化后生成的 ID；未提供为 null |
| operation | `add`、`update`、`deprecate`、`no_change` |
| responsibilityId / baseVersion | 原责任 ID 及输入基准版本；新增的责任 ID 为 null |
| beforeText / proposedText | 原文与建议文本；新增无原文，废弃无新文本；不调整保留原文 |
| reason | 简短的改变或保留原因 |
| scope | 对象，包含 teamId、memberId、description |
| effectivePeriod | 对象，包含 from、to；未知日期为 null，不编造起止时间 |
| contributionRefs / evidenceRefs / feedbackRefs | 实际读取的来源 ID 数组；不创造贡献或反馈记录 |
| unknowns | 待核对说明的字符串数组 |
| state | `suggested`、`awaiting_confirmation`、`stale`、`applied` |

责任列表没有逐条 ID 时，不把数组下标伪装为正式责任 ID。分析可保留 beforeText 和集合版本，responsibilityId=null 并说明；修改／废弃写回前由业务服务解析原对象并绑定确认。

## 确认与回执

确认必须绑定 proposalId、操作、原责任、最终文本、基准版本、确认用户和团队。`prepare_update` 只是待确认候选，update 仍为 null。`apply_confirmed` 只有实际能力和可信确认都存在时才进入业务服务；服务成功回执才能令包络 status 与候选 state 为 applied。

测试工作台没有业务写回能力，因此 update 和 writeReceipt 均为 null，不能输出 applied。权限不足、版本冲突、回执未知分别说明，保留原责任。没有新增候选且仍有证据缺口时使用 partial，不用 no_change 掩盖缺口。

## result 示例

输入条件：本人当前责任版本 3，原责任“内容制作”没有逐条 ID；两项独立脚本贡献可归属本人，责任更新能力未接入。

```json
{
  "mode": "analyze",
  "responsibilityVersion": 3,
  "proposals": [{
    "proposalId": null,
    "operation": "update",
    "responsibilityId": null,
    "baseVersion": 3,
    "beforeText": "内容制作",
    "proposedText": "负责达人短视频脚本策划与交付",
    "reason": "两项独立交付均证实本人负责脚本，可将责任范围写得更具体。",
    "scope": {"teamId": "team-content", "memberId": "member-writer", "description": "当前团队的短视频脚本工作"},
    "effectivePeriod": {"from": null, "to": null},
    "contributionRefs": ["delivery-one", "delivery-two"],
    "evidenceRefs": ["member-writer", "delivery-one", "delivery-two"],
    "feedbackRefs": [],
    "unknowns": ["写回前需绑定原责任对象及最终确认。"],
    "state": "suggested"
  }],
  "update": null
}
```
