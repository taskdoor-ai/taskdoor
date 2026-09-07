# 明日验证：任务创建与动态规划

这是一份可以交给 agent 执行的规划 Skill，输出候选 JSON；**没有接入页面中的真实模型、业务读取或任务提交服务**。企业、成员、任务和回执均为合成测试资料。不要拿合成角色替换真实团队数据，也不要用 Skill 的“可审阅”当成创建授权。

## 先看结果

打开 [只读回放页](review.html)，从左边选择行业、边缘或复杂案例，查看本轮建议、修改前后字段和来源。输入与完整 JSON 默认收起；点击来源可核对实际证据。它只回放已记录答案，不会调用模型，也没有真实创建按钮。

实际试跑结果、失败及修复范围见 [扩展测试报告](overnight-report.md)和[高拟真验证报告](realistic-report.md)。首次输出保留，不把修正后的答案覆盖回第一轮。语义复核来自独立 agent，不是行业用户验证。

## 先跑高拟真场景

完整语料包含 12 个行业团队、179 个四层任务、84 份文件、105 条讨论、68 条历史和 106 条依赖。先检查语料本身，再准备一个全新的盲测目录：

```sh
python3 skills/agentdoor-task-planner/scripts/validate_realistic_data.py \
  --fixtures skills/agentdoor-task-planner/evals/realistic-fixtures.json \
  --expectations skills/agentdoor-task-planner/evals/realistic-expectations.json
python3 skills/agentdoor-task-planner/scripts/evaluate.py prepare \
  --suite realistic \
  --directory /tmp/agentdoor-tomorrow-realistic
```

把每个 `inputs/<ID>.json` 分配给没看过期望和旧答案的执行 agent。生成全部 12 个首次输出后再检查：

```sh
python3 skills/agentdoor-task-planner/scripts/evaluate.py check \
  --directory /tmp/agentdoor-tomorrow-realistic
```

建议至少人工复核以下五案，它们能快速暴露最难的依赖判断：

- `REAL-B-NPI-01`：同一 DVT 同时消费 PCN 适用性和实际 COC 核对结果。
- `REAL-B-PROC-01`：权威登记册可直接读取，但最终门禁仍消费团队风险核对结果。
- `REAL-C-01`：页面／邮件／付费是直接消费者，上线核对通过既有链路传递消费。
- `REAL-C-02`：日记账审核依赖最近的外币重估产出，不能跳到原始银行异常。
- `REAL-C-04`：新增第三方证书时仍要保留业主直接核对的正式复测旧边。

当前最终全量回归是 7/12；因此这一步必须保留人工审阅，不要把 `ready_for_confirmation` 接成自动创建。可从 [最终全量归档](runs/2026-09-01-realistic-full-final/) 查看首次输出、交叉复核、裁决与同输出重评。

## 用一个新输入验证 Skill

在仓库根目录准备新的运行目录。下例先取四个边缘案例：重复提交、专业人选空缺、时间歧义、恶意资料干扰。

```sh
python3 skills/agentdoor-task-planner/scripts/evaluate.py prepare --suite edge --cases EDGE-09 EDGE-12 EDGE-13 EDGE-16 --directory /tmp/agentdoor-tomorrow-edge
```

把下面这段交给**没有读过评分和旧答案的 agent**，每次只替换案例 ID：

```text
读取 skills/agentdoor-task-planner/SKILL.md，以及它要求的 v0.2 契约、Schema、上下文重规划规则。
执行 /tmp/agentdoor-tomorrow-edge/inputs/EDGE-09.json 中本轮用户请求。
只读这些协议与这一个输入，不读 evals、expectations、旧答案或校验器。
把你的首次完整 v0.2 JSON 写到 /tmp/agentdoor-tomorrow-edge/outputs/EDGE-09.json。
不要创建、指派、发通知或访问生产服务；输出后不要覆盖或自测修改第一次答案。
```

四案生成后再执行：

```sh
python3 skills/agentdoor-task-planner/scripts/evaluate.py check --directory /tmp/agentdoor-tomorrow-edge
```

查看运行目录中的 `structural-report.json`。结构合法只是第一步；再由独立评审者读输入、答案与冻结评分，核对业务范围、责任、依赖和最少必要问题。**若只跑一案，prepare 时也只选这一案**；未生成的已选案例仍计入分母，不能在看到失败后删除。

复杂场景可单独准备 `--suite complex --cases COMPLEX-03 COMPLEX-05 COMPLEX-08`：分别观察新增包装说明如何影响三个已有消费者、分页未读完如何补读，以及同一天内的窗口冲突如何说明。不能仅看“最后有没有返回一个计划”，也要看本来能继续的旧工作有没有被错误阻塞。

真实团队验证时由受信读取侧提供脱敏且经过 ACL 过滤的成员、任务、子任务、讨论和历史，保持 v0.2 输入格式。检索未完成就标真实覆盖，不把未读取的数据填写为空且声称完整。不要把 API Key、私有记录全集或其他团队资料塞进测试提示。

## 连续提三轮需求

多轮脚本只把**上一轮实际答案**映射到下一份合成快照，不代替模型规划，不写数据库。

```sh
python3 skills/agentdoor-task-planner/scripts/multiturn.py --directory /tmp/agentdoor-tomorrow-multi --episode A --turn 1
```

将 `A/turn-1/inputs/MULTI-A1.json` 交给独立 agent，首次答案放在同层 `outputs/`。随后用同一条命令改为 `--turn 2`；脚本确认上一份答案合法、输入未被改动后，才生成下一轮输入。把第二轮输入交给**同一执行 agent**，保留会话；完成后再生成第三轮。这样才能检测它是否沿用实际草稿 ID 和最新确认，而非每轮从零开始。

| Episode | 连续验证的问题 |
| --- | --- |
| A | 新草稿 → 只改截止日 → 保持不变；不得重建或更改确认内容。 |
| B | 新字段待澄清 → 确认输入交接与日期 → 已完成结果直接复用，不重建培训。 |
| C | 首次候选 → 合成保存后响应丢失 → 不同 SKU 的新需求；区分重试与新实例。 |
| D | 旧回复迟到 → 人工编辑成为最新依据 → 权限撤回；停止旧上下文暴露与变更。 |

每个 `turn-N` 都是独立可检查运行，例如 `evaluate.py check --directory /tmp/agentdoor-tomorrow-multi/A/turn-2`。若前一轮答案失败，保留失败和后续未执行记录，另开新运行再测试；不要手改前轮答案假装会话连续通过。中途修改协议须重新开始整段会话。

## 本地自检与界限

当前环境具备 Python 3 和 `jsonschema`。可在仓库根运行：

```sh
python3 -m unittest discover -s skills/agentdoor-task-planner/scripts -p 'test_*.py'
python3 docs/task-design-kit/validate_kit.py
```

迁到新环境时先确认 `jsonschema` 可导入。这两条命令不调用模型；不能把单元测试数量当作模型场景数。详细评估方法见 [验证说明](evaluation-guide.md)。

回放页已做离线 HTML／JSON／JavaScript 检查；本次自动浏览器不允许访问本地文件，所以**未完成浏览器交互验收**。可在自己的浏览器手动打开。生产 ACL、检索召回、幂等事务、并发冲突、成员接受、真实数据回写和行业用户试用也尚未验证，不能由合成通过率替代。
