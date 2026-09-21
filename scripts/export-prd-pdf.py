"""Typeset the complete HTML PRD (including closed rules) into a readable PDF.

Run with the Codex bundled Python, which supplies lxml and reportlab.
This script reads documentation only; it never reads or changes application data.
"""
from pathlib import Path
from html import escape
import re

from lxml import html as lh
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, CondPageBreak,
)
from reportlab.platypus.tableofcontents import TableOfContents

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / 'public/agentdoor-prd.html'
OUTPUT = ROOT / 'output/pdf/AgentDoor-PRD-v1.1.pdf'
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
PAGE_W, PAGE_H = A4
MARGIN = 40
WIDTH = PAGE_W - MARGIN * 2
INK = colors.HexColor('#20252B')
MUTED = colors.HexColor('#626C79')
BLUE = colors.HexColor('#1268D6')
PALE = colors.HexColor('#EEF5FE')
LINE = colors.HexColor('#DEE4EC')

pdfmetrics.registerFont(TTFont('CJK', '/System/Library/Fonts/STHeiti Light.ttc', subfontIndex=0))
pdfmetrics.registerFont(TTFont('CJK-Bold', '/System/Library/Fonts/STHeiti Medium.ttc', subfontIndex=0))
pdfmetrics.registerFontFamily('CJK', normal='CJK', bold='CJK-Bold', italic='CJK', boldItalic='CJK-Bold')

def style(name, **kw):
    opts = dict(fontName='CJK', fontSize=10, leading=16, textColor=INK,
                wordWrap='CJK', spaceAfter=7, allowWidows=0, allowOrphans=0)
    opts.update(kw)
    return ParagraphStyle(name, **opts)

BODY = style('body')
SMALL = style('small', fontSize=9, leading=14, textColor=MUTED)
H1 = style('h1', fontName='CJK-Bold', fontSize=23, leading=32, spaceAfter=18, keepWithNext=True)
H2 = style('h2', fontName='CJK-Bold', fontSize=15, leading=22, spaceBefore=17, spaceAfter=10)
H3 = style('h3', fontName='CJK-Bold', fontSize=11.5, leading=18, spaceBefore=10, spaceAfter=8)
CELL = style('cell', fontSize=9, leading=14, spaceAfter=0)
CELL_HEAD = style('cellhead', fontName='CJK-Bold', fontSize=9, leading=14, spaceAfter=0, textColor=BLUE)
CODE = style('code', fontSize=8.8, leading=14, textColor=colors.HexColor('#164779'),
             backColor=PALE, borderPadding=10, spaceBefore=10, spaceAfter=16)

def clean(text):
    return text.replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-')

def text_of(node):
    return re.sub(r'\s+', ' ', ''.join(node.itertext())).strip()

def inline(node):
    result = escape(clean(node.text or ''))
    for child in node:
        tag = child.tag if isinstance(child.tag, str) else ''
        value = inline(child)
        if tag in ('svg', 'button', 'script', 'style'):
            value = ''
        elif tag in ('b', 'strong'):
            value = '<b>' + value + '</b>'
        elif tag == 'br':
            value = '<br/>'
        elif tag == 'code':
            value = '<font color="#164779">' + value + '</font>'
        elif tag == 'a' and child.get('href', '').startswith(('http://', 'https://')):
            value = '<link href="' + escape(child.get('href'), quote=True) + '" color="#1268D6">' + value + '</link>'
        result += value + escape(clean(child.tail or ''))
    return result.strip()

def paragraph(node, paragraph_style=BODY):
    return Paragraph(inline(node), paragraph_style)

SKIP = {'copy-link', 'technical-nav', 'section-number', 'eyebrow', 'hero-meta'}
ATOMIC = {'decision-node', 'analysis-item', 'scenario-name', 'scenario-result',
          'skill-head', 'guardrail', 'demo-fields', 'priority-row', 'index-task',
          'index-group', 'index-tools', 'tab-strip', 'formula'}

class Document(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if hasattr(flowable, 'toc_info'):
            level, title, key = flowable.toc_info
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(title, key, level=level, closed=False)
            self.notify('TOCEntry', (level, title, self.page, key))

def page_chrome(canvas, doc):
    if doc.page == 1:
        return
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN, PAGE_H - 35, PAGE_W - MARGIN, PAGE_H - 35)
    canvas.setFont('CJK', 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN, PAGE_H - 25, 'TaskDoor / 产品 PRD')
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 25, 'v1.1 · 2026.09.03')
    canvas.line(MARGIN, 33, PAGE_W - MARGIN, 33)
    canvas.drawString(MARGIN, 20, '产品流程 · Skill 判断 · MCP 工具与参数')
    canvas.drawRightString(PAGE_W - MARGIN, 20, f'{doc.page:02d}')
    canvas.restoreState()

doc = Document(str(OUTPUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
               topMargin=49, bottomMargin=45, title='TaskDoor 产品 PRD v1.1',
               author='TaskDoor', subject='产品流程、六类 Skill 与 MCP 参数设计')
frame = Frame(MARGIN, 45, WIDTH, PAGE_H - 94, id='body', leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)
doc.addPageTemplates(PageTemplate(id='main', frames=[frame], onPage=page_chrome))
story = []

# A concise cover with scope and implementation status, not product-background filler.
story += [Spacer(1, 48), Paragraph('TaskDoor', style('brand', fontName='CJK-Bold', fontSize=13, textColor=BLUE)),
          Spacer(1, 22), Paragraph('产品 PRD', style('cover-title', fontName='CJK-Bold', fontSize=36, leading=46)),
          Paragraph('从任务创建到持续协作', style('cover-subtitle', fontSize=20, leading=30, textColor=MUTED)),
          Spacer(1, 18), HRFlowable(width=WIDTH, thickness=2, color=BLUE), Spacer(1, 25),
          Paragraph('v1.1 / 2026-09-03', SMALL), Spacer(1, 15)]
cover_rows = [
    ['产品流程', '团队与责任、创建任务、左侧列表、我的工作、任务详情。'],
    ['六类 Skill', '人员责任分析与更新、创建与匹配、状态分析、任务诊断、我的工作推荐、工时与进度评估。'],
    ['MCP 契约', '38 个候选工具：具体参数、返回结果、版本、幂等和授权边界。'],
    ['实施状态', '已实现原型、现有 Skill 和待接入契约分别标注；本文件不代表后端能力已上线。'],
]
cover = Table([[Paragraph(a, H3), Paragraph(b, BODY)] for a, b in cover_rows], colWidths=[95, WIDTH-95])
cover.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('LEFTPADDING',(0,0),(-1,-1),0),
                          ('BOTTOMPADDING',(0,0),(-1,-1),14), ('LINEBELOW',(0,0),(-1,-2),.4,LINE)]))
story += [cover, Spacer(1, 24), Paragraph('阅读方式：先看模块流程；研发可直接从目录跳到 Skill 判断或 MCP 参数。所有规则与参数均在文内，暂不附页面截图。', SMALL), PageBreak()]
story.append(Paragraph('目录', H1))
toc = TableOfContents()
toc.levelStyles = [style('toc0', fontSize=11, leading=22, spaceBefore=6, leftIndent=0),
                   style('toc1', fontSize=9, leading=17, textColor=MUTED, leftIndent=17)]
story += [toc, PageBreak()]

def table(node):
    rows = node.xpath('./thead/tr|./tbody/tr|./tr')
    if not rows:
        return
    count = max(len(row) for row in rows)
    proportions = {2: [.37,.63], 3: [.24,.31,.45], 4: [.27,.28,.22,.23]}.get(count, [1/count]*count)
    if count == 4 and 'skill-overview-table' in node.getparent().get('class', ''):
        proportions = [.21,.16,.45,.18]
    data = []
    for row in rows:
        data.append([paragraph(cell, CELL_HEAD if cell.tag == 'th' else CELL) for cell in row])
    element = Table(data, colWidths=[WIDTH*p for p in proportions], repeatRows=1, hAlign='LEFT')
    element.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'), ('BACKGROUND',(0,0),(-1,0),PALE),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white, colors.HexColor('#FAFBFD')]),
        ('LINEBELOW',(0,0),(-1,0),.65,LINE), ('LINEBELOW',(0,1),(-1,-1),.3,LINE),
        ('LEFTPADDING',(0,0),(-1,-1),9), ('RIGHTPADDING',(0,0),(-1,-1),9),
        ('TOPPADDING',(0,0),(-1,-1),8), ('BOTTOMPADDING',(0,0),(-1,-1),8),
    ]))
    story.extend([element, Spacer(1, 11)])

toc_subsections = {'7.3','7.4','7.5','7.6','7.7','7.9','8.3','8.4','8.5','8.6','8.7','8.10'}

def walk(node):
    tag = node.tag if isinstance(node.tag, str) else ''
    classes = set(node.get('class', '').split())
    if tag in ('svg','button','script','style','nav') or classes & SKIP:
        return
    if tag == 'table':
        table(node)
    elif tag in ('h1','h2'):
        # Section headings are generated once by the outer loop.
        return
    elif tag in ('h3','h4','summary'):
        # Reserve room for the heading and initial content, not the whole table.
        story.append(CondPageBreak(130 if tag == 'h3' else 100))
        heading = paragraph(node, H2 if tag == 'h3' else H3)
        text = text_of(node)
        number = text.split(' ', 1)[0]
        if number in toc_subsections:
            heading.toc_info = (1, text, 'part-' + number)
        story.append(heading)
    elif tag == 'pre':
        code = clean(''.join(node.itertext())).strip('\n')
        code = '<br/>'.join(escape(line).replace(' ', '&#160;') for line in code.splitlines())
        story.append(Paragraph(code, CODE))
    elif tag in ('p','blockquote'):
        if text_of(node):
            story.append(paragraph(node, SMALL if 'section-summary' in classes else BODY))
    elif tag in ('ul','ol'):
        for i, li in enumerate(node.findall('li'), 1):
            prefix = f'{i}. ' if tag == 'ol' else '• '
            story.append(Paragraph(prefix + inline(li), style('list', leftIndent=9, firstLineIndent=-9)))
        story.append(Spacer(1, 4))
    elif tag == 'hr':
        story.append(HRFlowable(width=WIDTH, thickness=.5, color=LINE, spaceBefore=10, spaceAfter=10))
    elif 'flow-rail' in classes:
        labels = [text_of(item) for item in node.xpath('.//strong')]
        story.append(Paragraph(' → '.join(labels), CODE))
    elif classes & ATOMIC:
        bits = [text_of(child) for child in node if text_of(child)]
        text = (' / '.join(bits) if bits else text_of(node))
        if (node.text or '').strip():
            text = node.text.strip() + (' / ' + text if bits else '')
        if text:
            story.append(Paragraph(escape(clean(text)), BODY))
    elif len(node) == 0:
        if text_of(node):
            story.append(paragraph(node))
    else:
        if (node.text or '').strip():
            story.append(Paragraph(escape(clean(node.text.strip())), BODY))
        for child in node:
            walk(child)
            if (child.tail or '').strip():
                story.append(Paragraph(escape(clean(child.tail.strip())), BODY))

tree = lh.fromstring(HTML.read_text())
sections = tree.xpath('//section[contains(concat(" ", normalize-space(@class), " "), " prd-section ")]')
for i, section in enumerate(sections, 1):
    if i > 1:
        story.append(PageBreak())
    title = section.get('data-title') or '产品流程'
    heading = Paragraph(f'{i:02d} / {escape(title)}', H1)
    heading.toc_info = (0, f'{i:02d}  {title}', section.get('id'))
    story.append(heading)
    for child in section:
        walk(child)

doc.multiBuild(story)
print(f'Created {OUTPUT}')
