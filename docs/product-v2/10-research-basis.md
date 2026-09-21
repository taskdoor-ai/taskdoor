# 协作设计研究依据

> 本文记录产品判断的外部依据。研究只能帮助形成设计假设，不能直接证明某个界面、权重或阈值一定正确。候选人数、排序权重和提醒频率仍需真实用户验证。

## 一、证据如何进入产品

| 研究主题 | 相对稳定的结论 | TaskDoor 设计假设 | 必须验证的部分 |
| --- | --- | --- | --- |
| 自主与动机 | 控制感、自主、胜任和关系感影响工作动机 | 默认自己拥有；AI 建议而不强制分配 | 哪种措辞和展开时机最好 |
| 求助行为 | 求助存在能力、依赖和地位风险 | 把缺口归因于任务；提供最小协作方式 | 私聊、引荐、广播的使用偏好 |
| 心理安全 | 人会评估提问、犯错和求助的人际后果 | 安全拒绝、私密响应、不公开羞辱 | 团队文化差异如何进入配置 |
| 专家发现 | 团队需要知道“谁知道什么”，且容易被地位线索误导 | 使用相似任务、文件和决定证据，职位只是一类信号 | 不同证据在各行业的可靠度 |
| 公平 | 程序、解释、互动和结果公平会影响接受 | 展示推荐依据、备选和纠正入口 | 是否需要展示未推荐原因 |
| 责任扩散 | 群体规模和模糊角色会削弱个人责任感 | 明确主责、参与和授权边界；“每 Task 一位 Owner”来自 D-03 产品决策，不由该研究单独证明 | 多人探索任务的最佳责任表达 |
| 工作要求与资源 | 持续高要求、资源不足与耗竭相关 | 提示承诺与协作负载，避免专家税 | 哪些负载数据足够可信且不过度监控 |
| 可纠正算法 | 保留修改权通常能提高建议接受度 | 用户可改变候选和优先维度 | 需要多大修改自由度才有价值 |
| 企业社交可见性 | 可见沟通可改善“谁知道什么”的元知识，也会带来噪音 | 有范围的团队动态与结构化广播 | 推荐范围、摘要和提醒频率 |
| 闭环沟通与责任交接 | 发送信息不等于对方理解并接管；双向复述与明确生效点可降低歧义 | Handoff Revision、接收者复述、accepted / activated 分离 | 哪些风险等级必须复述、多少字段才是最小充分 |
| 知识转移阻力 | 接续失败不仅源于意愿，也与接收者吸收能力、因果含糊和关系困难相关 | 按接收者熟悉度调节深度；传递问题、假设、意图和第一步 | 知识工作各场景需要的重叠支持时长 |
| 心理所有权与归属 | 原负责人可能保护成果或领地，接收者也担心替历史问题背锅 | 保留历史贡献；明确交接前事实、交接后责任和支持窗口 | 不同文化下公开程度与归属表达偏好 |
| 算法管理风险 | 透明、公平、自治、隐私和人工复核很关键 | AI 不做隐性绩效分，提供解释和申诉 | 不同组织治理策略 |

## 二、主要研究

### 自主、胜任与关系

- Ryan, R. M. & Deci, E. L. (2000), [Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being](https://www.selfdeterminationtheory.org/SDT/documents/2000_RyanDeci_SDT.pdf)。
- Gagné, M. & Deci, E. L. (2005), [Self-determination theory and work motivation](https://selfdeterminationtheory.org/SDT/documents/2005_GagneDeci_JOB_SDTtheory.pdf)。
- APA, [Self-determination theory: A quarter century of human motivation research](https://www.apa.org/research-practice/conduct-research/self-determination-theory)。

产品影响：让用户和受邀者拥有真实选择权；AI 保持建议性，避免控制性语言。

### 心理安全与求助

- Edmondson, A. (1999), [Psychological Safety and Learning Behavior in Work Teams](https://doi.org/10.2307/2666999)。
- Lee, F. (1997), [When the Going Gets Tough, Do the Tough Ask for Help? Help Seeking and Power Motivation in Organizations](https://doi.org/10.1006/obhd.1997.2746)。
- Liu et al. (2022), [Asking how to fish vs. asking for fish](https://doi.org/10.1111/peps.12479)。

产品影响：不要把求助描述成用户能力不足；区分线索、咨询、复核、共同执行和完全接管。

### 知道谁知道什么

- Borgatti, S. P. & Cross, R. (2003), [A Relational View of Information Seeking and Learning in Social Networks](https://pubsonline.informs.org/doi/abs/10.1287/mnsc.49.4.432.14428)。
- Lewis, K. (2003), [Measuring transactive memory systems in the field](https://pubmed.ncbi.nlm.nih.gov/12940401/)。
- Brandon, D. P. & Hollingshead, A. B. (2004), [Transactive Memory Systems in Organizations](https://doi.org/10.1287/orsc.1040.0069)。
- Bunderson, J. S. (2003), [Recognizing and Utilizing Expertise in Work Groups](https://journals.sagepub.com/doi/10.2307/3556637)。

产品影响：人员推荐要使用任务相关专业证据、上下文和授权，不只使用职位或技能标签。

### 公平、责任与角色清晰

- Colquitt et al. (2001), [Justice at the millennium: A meta-analytic review](https://pubmed.ncbi.nlm.nih.gov/11419803/)。
- Miles, J. A. & Klein, H. J. (1998), [The Fairness of Assigning Group Members to Tasks](https://doi.org/10.1177/1059601198231005)。
- Forsyth et al. (2002), [Responsibility Diffusion in Cooperative Collectives](https://doi.org/10.1177/0146167202281005)。
- Tubre, T. C. & Collins, J. M. (2000), [Jackson and Schuler role conflict and ambiguity meta-analysis](https://doi.org/10.1177/014920630002600104)。

产品影响：研究支持角色清晰、程序公平与责任边界；唯一 Owner 是已确认的 TaskDoor 产品选择，仍需在不同任务类型中验证体验与副作用。

### 工作负载与协作成本

- Demerouti et al. (2001), [The Job Demands–Resources Model of Burnout](https://www.wilmarschaufeli.nl/publications/Schaufeli/160.pdf)。
- OECD (2025), [Algorithmic Management in the Workplace](https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/02/algorithmic-management-in-the-workplace_3c84ed6d/287c13c4-en.pdf)。
- Parent-Rocheleau & Parker (2022), [Algorithms as work designers](https://doi.org/10.1016/j.hrmr.2021.100838)。

产品影响：负载提示用于协作而非绩效；避免伪精确容量、下班响应奖励和隐性监控。

### 广播、旁观者效应与环境感知

- Markey, P. M. (2000), [Bystander intervention in computer-mediated communication](https://www.sciencedirect.com/science/article/pii/S0747563299000564)。
- Leonardi, P. M. (2015), [Ambient Awareness and Knowledge Acquisition](https://aisel.aisnet.org/misq/vol39/iss4/3/)。
- Leonardi, P. M. & Meyer, S. R. (2015), [Social Media as Social Lubricant](https://doi.org/10.1177/0002764214540509)。

产品影响：广播使用明确范围、结构化需求和认领机制；可见沟通帮助团队发现专家，但必须控制噪音和透明压力。

### 可纠正建议与选择复杂度

- Dietvorst, B. J., Simmons, J. P. & Massey, C. (2018), [Overcoming Algorithm Aversion](https://faculty.wharton.upenn.edu/wp-content/uploads/2016/08/Dietvorst-Simmons-Massey-2018.pdf)。
- Chernev, A., Böckenholt, U. & Goodman, J. (2015), [Choice overload: A conceptual review and meta-analysis](https://www.sciencedirect.com/science/article/pii/S1057740814000916)。

产品影响：提供差异化短名单与可调整维度；“默认三位候选”只是需要测试的交互假设。

### 闭环沟通、责任与知识接续

- AHRQ TeamSTEPPS, [Communication Overview / Handoff](https://www.ahrq.gov/teamstepps-program/curriculum/communication/overview/index.html) 与 [Closed-Loop Communication](https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/loop.html)。
- Starmer et al. (2014), [Changes in Medical Errors after Implementation of a Handoff Program](https://www.nejm.org/doi/full/10.1056/NEJMsa1405556)。
- FAA, [Transfer of Position Responsibility](https://www.faa.gov/air_traffic/publications/atpubs/atc_html/appendix_a.html)。
- UK HSE, [Shift handover](https://www.hse.gov.uk/humanfactors/topics/shift-handover.htm)。
- NASA Ames, [Operational Shift Handover Study](https://human-factors.arc.nasa.gov/publications/Parke_MER_SurfaceOps_Handovers_05.pdf)。
- Szulanski, G. (1996), [Exploring Internal Stickiness: Impediments to the Transfer of Best Practice Within the Firm](https://doi.org/10.1002/smj.4250171105)。
- DeChurch, L. A. & Mesmer-Magnus, J. R. (2010), [The cognitive underpinnings of effective teamwork](https://doi.org/10.1037/a0017455)。
- Chen et al. (2023), [Psychological ownership and knowledge exchange](https://pubmed.ncbi.nlm.nih.gov/36006739/)。

产品影响：把 Handoff 设计为双边工作协议，而不是“文件已发送”。发出者提供目标、现状、问题、假设、版本和下一步，接收者以自己的话复述并指出缺口；责任只在双方同意同一版本、权限与当前状态检查通过后生效。高风险场景建议更直接的双向沟通（同步或结构化异步）、明确生效时刻和必要重叠支持，具体强度仍需验证；低风险上下文分享保持轻量。

### 权限、隐私与治理

- NIST, [Role-Based Access Control](https://csrc.nist.gov/Projects/Role-Based-Access-Control)。
- ICO, [Data protection and monitoring workers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/monitoring-workers/data-protection-and-monitoring-workers/)。
- OECD (2025), [Algorithmic Management in the Workplace](https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/02/algorithmic-management-in-the-workplace_3c84ed6d/287c13c4-en.pdf)。

产品影响：权限与责任画像分开；数据收集遵循必要、比例、透明和可申诉原则。

## 三、明确的证据边界

- 研究支持“自主和公平重要”，不支持某个固定推荐权重。
- 研究支持“求助有社会成本”，不代表所有团队都偏好私下求助。
- 研究支持“可见沟通改善元知识”，不代表全公司公开广播更好。
- 研究支持“明确责任能降低扩散”，不代表复杂任务只能由一个人参与。
- 研究支持“算法建议需要透明和人工影响”，不代表展示全部原始数据更公平。
- 医疗、航空和航天的研究支持闭环、双向、风险分级和明确责任时刻，不证明其表单字段可以原样迁移到知识工作。
- I-PASS 的结果来自包含培训、观察、反馈与文化改变的完整干预，不能把研究效果归因于一张交接卡片。
- 知识转移和心理所有权研究支持关注接收能力、关系与贡献归属，不支持给个人生成“交接能力分”。
- 中高风险是否强制复述、采用同步还是结构化异步、摘要多长、需要多少字段和多长重叠支持，都是可证伪的产品假设；不能从高可靠行业直接推出固定交互。
- “界面提供拒绝按钮”不证明组织中的拒绝是安全的；上下级、考核关系、被迫接受感和报复顾虑必须在真实用户研究中单独验证。
- `90 天 / 10 人 / 20 事件` 是当前为了阻止小团队反推而提出的保守产品下限，不是研究推导出的匿名保证；互补抑制、差分查询防护和正式隐私评审仍不可省略。
- “本人公开的协作窗口”是为了在找人价值与反监控之间建立可撤回边界，不证明所有成员都能在权力关系中自由决定公开；必须验证默认关闭、撤回是否真实有效以及不公开是否会受到不利对待。

所有具体交互仍需通过五行业 Demo、可用性测试与真实团队试点验证。
