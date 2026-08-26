# AgentDoor 人与 Agent 协作演示：知识图谱 Mock 数据

> 用途：为 Vokal 演示构建“人—Agent—任务—成果—Handoff—决策”的知识关系。以下每个二级标题应创建为一篇独立的 Knowledge Base 文章。

## 演示项目：AgentDoor 人与 Agent 协作产品定义

项目目标是定义 AgentDoor 如何支持真实团队中的人与 Agent 协作。人类发起人 bubu 是项目 Owner 和最终决策者。项目使用频道 `#agentdoor-product-definition` 作为协作空间，以《AgentDoor Product Definition - Human and Agent Collaboration》作为共享基线。

项目流程为：bubu 委派竞品研究给竞品分析师；竞品分析师把竞品证据包正式 Handoff 给商业咨询师；商业咨询师把商业判断正式 Handoff 给业务架构师；业务架构师把业务架构方案正式 Handoff 给产品经理；产品经理提交产品决策简报给 bubu 审批。任何 Agent 都不能代替 bubu 做最终产品决策。

## 人类角色：bubu（产品发起人和最终决策者）

bubu 是“AgentDoor 人与 Agent 协作产品定义”项目的 Owner。bubu 负责确定研究目标、批准共享上下文、处理权限例外、审查产品决策简报，并决定是否进入下一阶段。

bubu 可以停止或重新启动 Agent 工作，可以要求补充证据，也可以拒绝某次 Handoff。竞品分析师、商业咨询师、业务架构师和产品经理都向 bubu 保持可观察状态，但只有产品经理负责把最终方案提交给 bubu。

## 第一棒：竞品分析师与竞品证据包

竞品分析师执行“人与 Agent 协作场景”的竞品研究。输入包括《AgentDoor Product Definition - Human and Agent Collaboration》、Vokal 实测记录和竞品官方资料。

竞品分析师的产物是“竞品证据包”。证据包包含已验证事实、产品推断、待验证问题、来源位置、协作机制对比和 AgentDoor 产品启示。完成后，竞品分析师通过正式 Handoff 把竞品证据包交给商业咨询师。普通 @mention 不能替代正式 Handoff。

## 第二棒：商业咨询师与商业判断

商业咨询师接收竞品分析师的正式 Handoff，并读取竞品证据包。商业咨询师不重复全部竞品研究，而是分析目标客户、使用者、决策者、付费者、购买动机、替代方案、价值主张、商业模式和市场进入假设。

商业咨询师的产物是“商业判断”。商业判断必须区分事实、假设、风险和未知项。完成后，商业咨询师通过正式 Handoff 把商业判断交给业务架构师；业务架构师应自动启动并继承必要的交接上下文。

## 第三棒：业务架构师与业务架构方案

业务架构师接收商业咨询师的正式 Handoff，并把商业判断转化为角色、责任、核心业务对象、状态、能力边界、信息流和端到端协作流程。

业务架构方案应描述 Human、Agent、Task、Document、Channel、Knowledge Article、Handoff 和 Human Approval 之间的关系，并标记权限边界、失败恢复和必须由人类批准的节点。完成后，业务架构师通过正式 Handoff 把业务架构方案交给产品经理。

## 第四棒：产品经理与产品决策简报

产品经理接收业务架构师的正式 Handoff，同时引用竞品证据包、商业判断、业务架构方案和产品定义基线。产品经理负责收敛目标用户、核心问题、价值主张、MVP 范围、非目标、关键流程、成功指标、风险和需要人类决定的问题。

产品经理的产物是“产品决策简报”。产品经理不能自行批准开发或上线，而是把产品决策简报提交给 bubu 进行 Human Approval。bubu 批准后，演示流程才算闭环。

## 共享上下文与权限边界

所有 Agent 可以读取频道 `#agentdoor-product-definition` 中明确共享的 Knowledge Article、任务消息和上游 Handoff 包。能够读取某项内容不代表可以把它传播到其他频道或外部系统。

本地源码、API Key、Token、个人 Connector 凭据和未明确共享的本地文件不进入知识库，也不能随 Handoff 传播。Connector 由每个使用者独立授权；Agent 不继承其他成员的个人凭据。高风险写入、对外发布、权限扩大和最终产品决策必须由 bubu 批准。

## 异常演示：交接失败与人工恢复

如果上游 Agent 只发送普通 @mention，下一位 Agent 可能不会自动开始，这应标记为“交接未成立”。如果 Handoff 缺少证据位置、关键假设、风险或下一步问题，接收 Agent应请求补齐，而不是自行猜测。

如果 Agent 因工具不可用、权限不足或环境差异停止，bubu 可以查看 Activity 和 Health，补充共享上下文，重新授权必要 Connector，或重新触发任务。恢复后应保留失败原因和人工干预记录。
