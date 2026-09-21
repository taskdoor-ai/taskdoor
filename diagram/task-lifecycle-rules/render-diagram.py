from pathlib import Path
from html import escape

OUT = Path(__file__).parent
W, H = 2240, 1260
parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="diagram-title diagram-description">
<title id="diagram-title">TaskDoor 任务生命周期与对应规则</title>
<desc id="diagram-description">上方七个节点从左到右为明确需求与查重、拆分任务、匹配人员、估算投入、确认创建、任务状态分析、验收与完成。下方七列与各节点一一对应。第六步包含任务状态、下一步建议和进度。底部区分任务维度的 AI 诊断和燃起图、个人维度的任务优先级。</desc>
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#21304a" stroke-width="0.65" opacity="0.42"/></pattern>
  <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#101e34"/><stop offset="1" stop-color="#0c1425"/></linearGradient>
  <linearGradient id="create-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#143648"/><stop offset="1" stop-color="#112538"/></linearGradient>
  <linearGradient id="manage-fill" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#143a35"/><stop offset="1" stop-color="#122b2d"/></linearGradient>
  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1L6 4L1 7" fill="none" stroke="#8ca1bc" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker>
</defs>
<style>
  text {{ font-family: 'PingFang SC','Noto Sans SC','Heiti SC','Microsoft YaHei',sans-serif; font-weight:400; fill:#d5e1f1; }}
  .title {{font-size:46px;font-weight:600;fill:#f4f8ff;letter-spacing:1px}}
  .eyebrow {{font-size:18px;font-weight:500;letter-spacing:2px;fill:#77dcea}}
  .subtitle {{font-size:23px;fill:#9eafc8}}
  .phase {{font-size:20px;font-weight:500}}
  .step-number {{font-size:18px;font-weight:600;letter-spacing:2px}}
  .step-name {{font-size:27px;font-weight:600;fill:#f4f8ff}}
  .rule-title {{font-size:22px;font-weight:600;fill:#eef5ff}}
  .rule-body {{font-size:20px;fill:#c3d0e3}}
  .rule-key {{font-size:20px;font-weight:500;fill:#edf4fc}}
  .rule-foot {{font-size:17px;fill:#93a8c4}}
  .band-title {{font-size:26px;font-weight:600;fill:#eef5ff}}
  .support-title {{font-size:24px;font-weight:600;fill:#eef5ff}}
  .support-body {{font-size:22px;fill:#c9d7ea}}
  .support-trigger {{font-size:19px;fill:#9aafc8}}
</style>
<rect width="2240" height="1260" fill="url(#background)"/>
<rect width="2240" height="1260" fill="url(#grid)"/>
''']

def text(x, y, value, cls='rule-body', fill=None, anchor=None):
    extra = (f' style="fill:{fill}"' if fill else '') + (f' text-anchor="{anchor}"' if anchor else '')
    parts.append(f'<text x="{x}" y="{y}" class="{cls}"{extra}>{escape(value)}</text>')

def rect(x,y,w,h,fill,stroke=None,rx=12):
    attr=f' stroke="{stroke}" stroke-width="1.3"' if stroke else ''
    parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"{attr}/>')

def line(x1,y1,x2,y2,color='#30445e',width=1.5,dashed=False,arrow=False):
    attr=(' stroke-dasharray="4 6"' if dashed else '')+(' marker-end="url(#arrow)"' if arrow else '')
    parts.append(f'<path d="M{x1} {y1}L{x2} {y2}" fill="none" stroke="{color}" stroke-width="{width}"{attr}/>')

text(74,59,'TaskDoor  /  产品规则总图','eyebrow')
text(74,123,'一条任务主线，每一步都有对应规则','title')
text(74,169,'上方看流程，下方看规则；创建步骤与持续管理分开表达。','subtitle')
text(2144,61,'依据当前 PRD · 规则设计稿','rule-foot',anchor='end')

text(74,220,'创建任务 Skill · 01—04','phase','#6cd6e7')
line(74,239,1244,239,'#295463',2)
text(1274,220,'用户确认 · 05','phase','#f1c66e')
line(1274,239,1544,239,'#685636',2)
text(1574,220,'任务管理 · 06—07','phase','#78d8b6')
line(1574,239,2144,239,'#2d594e',2)

steps = [
  ('明确需求与查重','范围与重复',[
    ('key','目标、交付物、数量'),('body','先写清完成标准'),('body','缺关键信息才补问'),
    ('gap',''),('key','比较对象、交付、周期'),('body','再看结果范围是否重合'),('accent','已覆盖 → 建议复用')
  ],'保存：需求与结果范围'),
  ('拆分任务','拆分与依赖',[
    ('key','能独立交付、独立验收'),('body','且需要分工、交接'),('body','或并行推进 → 才拆'),
    ('gap',''),('key','普通步骤留在任务内'),('body','只拆可核对的结果'),('accent','父子归属 ≠ 前置依赖')
  ],'保存：结果、标准与关系'),
  ('匹配人员','责任与经验',[
    ('key','资格 → 责任 → 经验'),('body','再看明确的协作窗口'),('body','每项判断保留来源'),
    ('gap',''),('key','只贡献一环 → 参与者'),('body','依据不足 → 待核对'),('accent','无人匹配 → 可未分配')
  ],'保存：人选、理由与依据'),
  ('估算投入','工作量计算',[
    ('key','选择适用的分钟参数'),('body','分项＝数量 × 单价'),('body','× 人数 × 轮次'),
    ('gap',''),('key','人天＝总分钟 ÷ 480'),('body','只加最末级任务的投入'),('accent','缺规则或数量 → 待估')
  ],'分钟参数为初始产品设定'),
  ('确认创建','校验与保存',[
    ('key','用户核对并确认方案'),('body','校验人员、范围与依赖'),('body','确认适用的估算假设'),
    ('gap',''),('key','任务与估算一起保存'),('body','同一提交只创建一次'),('accent','他人接受后责任才成立')
  ],'保存：确认内容与版本'),
  ('任务状态分析','状态、建议与进度',[
    ('key','状态：当前做到哪里'),('body','依据任务、交付和讨论'),
    ('key','建议：下一步做什么'),('body','结合完成标准与诊断'),
    ('gap',''),('key','进度：复用统一计算'),('body','AI 候选与正式值分开'),('accent','证据不足 → 待核对')
  ],'状态、建议与进度同源'),
  ('验收与完成','验收与正式进度',[
    ('key','由有权限的人正式验收'),('body','核对适用范围和版本'),('body','保留验收及撤销记录'),
    ('gap',''),('key','正式＝已验收末级投入'),('key','÷ 全部末级任务投入'),('accent','父任务不自动关闭')
  ],'缺有效读取条件 → 未知'),
]

# Draw connectors first, then masks, boxes and labels.
for i in range(6):
    line(74+i*300+277,316,74+(i+1)*300-8,316,'#8ca1bc',2.2,arrow=True)
for i in range(7):
    cx=74+i*300+135
    line(cx,369,cx,414,'#49617e',1.5,dashed=True)
    parts.append(f'<circle cx="{cx}" cy="413" r="3" fill="#7891b1"/>')

for i,(name,rule,body,foot) in enumerate(steps):
    x=74+i*300
    col='#77dcea' if i<4 else '#f1c66e' if i==4 else '#78d8b6'
    fill='url(#create-fill)' if i<4 else '#302c29' if i==4 else 'url(#manage-fill)'
    stroke='#346273' if i<4 else '#706043' if i==4 else '#3c7162'
    rect(x,270,270,92,'#0f172a',rx=12)
    rect(x,270,270,92,fill,stroke,12)
    text(x+20,300,f'{i+1:02d}','step-number',col)
    text(x+20,340,name,'step-name')
    rect(x,424,270,392,'#121f33','#273950',12)
    rect(x+20,446,4,24,col,rx=2)
    text(x+35,465,rule,'rule-title')
    line(x+20,487,x+250,487,'#293d57',1)
    y=522
    for kind,value in body:
        if kind=='gap':
            y+=20
            continue
        cls='rule-key' if kind=='key' else 'rule-body'
        text(x+20,y,value,cls,col if kind=='accent' else None)
        y+=32
    line(x+20,769,x+250,769,'#293d57',1)
    text(x+20,797,foot,'rule-foot')

text(74,885,'任务管理期间持续运行','band-title')
text(399,885,'随任务变化更新，以下不是额外的创建步骤','subtitle')
line(74,907,2144,907,'#30465f',1.5)

support=[
 ('任务维度 · AI 诊断','读取：当前任务、后代、依赖与有效要求',
  ['执行所需前置未满足，或正式要求互相矛盾，','给出受影响任务、成立依据和处理建议。'],
  '更新：相关事实、文件版本或权限变化'),
 ('个人维度 · 任务优先级','读取：本人正式负责且未结束的任务',
  ['按期限、阻塞、冲突和待审核等固定规则排序，','在“我的工作”展示任务顺位与优先原因。'],
  '更新：相关任务事实变化，或实际跨日'),
 ('任务维度 · 燃起图','两条线：范围人天 / 已验收人天',
  ['记录事件发生时的范围与有效验收工作量，','保留当时数值，不用今天的估算重写历史。'],
  '更新：范围、已采用估算或正式验收变化'),
]
for i,(name,source,body,trigger) in enumerate(support):
    x=74+i*700
    rect(x,931,670,208,'#122333','#2c455a',12)
    parts.append(f'<circle cx="{x+25}" cy="963" r="4" fill="#78d8b6"/>')
    text(x+41,972,name,'support-title')
    text(x+23,1008,source,'support-trigger')
    for j,value in enumerate(body):text(x+23,1046+j*32,value,'support-body')
    text(x+23,1115,trigger,'support-trigger','#8bd6c0')

text(74,1193,'更新原则','rule-key','#77dcea')
text(199,1193,'范围或工作假设变化 → 重估投入   ｜   任务与交付变化 → 更新状态分析   ｜   正式验收 → 更新进度与趋势','rule-body')
text(74,1230,'状态变化、发言次数和等待时间不能直接推算人工投入；初始分钟参数尚未经实际工时验证。','rule-foot')
parts.append('</svg>')
OUT.mkdir(parents=True,exist_ok=True)
path=OUT/'agentdoor-task-lifecycle.svg'
path.write_text('\n'.join(parts),encoding='utf-8')
print(path)
