"""Focused document checks and PDF review contact sheets (not app tests)."""
from pathlib import Path
import re
import sys

from lxml import html as lh
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
pdf_path = ROOT / 'output/pdf/AgentDoor-PRD-v1.1.pdf'
reader = PdfReader(pdf_path)
text = '\n'.join(page.extract_text() for page in reader.pages)
compact = re.sub(r'\s+', '', text)
original = (ROOT / 'docs/product-v2/13-task-rest-api-and-mcp.md').read_text()
inventory = original.split('## 9. MCP Tool 清单与 REST 映射')[1].split('## 10.')[0]
names = set(re.findall(r'`(agentdoor_[a-z_]+)`', inventory))
assert len(names) == 38
assert all(name in compact for name in names), 'PDF is missing MCP tools'
for required in ['agentdoor-task-planner', 'agentdoor-task-status-analyzer',
                 'agentdoor-task-diagnostician', 'agentdoor-personal-priority',
                 'agentdoor-ewd-progress', 'agentdoor-responsibility-advisor',
                 'idempotency_key', 'expected_version', 'impact_digest', 'UploadTarget']:
    assert required in compact, f'PDF is missing {required}'
assert '**' not in text, 'Unrendered Markdown emphasis'
assert '研发底线' not in text and '核心输出' not in text
for required in ['六类Skill', '当前实现', '更新流程', '用户确认后才写入', '写入接口未接通或回执未知']:
    assert required in compact, f'PDF is missing current Skill design: {required}'
assert '\ufffd' not in text and '\x00' not in text, 'Invalid PDF text encoding'

tree = lh.fromstring((ROOT / 'public/agentdoor-prd.html').read_text())
ids = tree.xpath('//@id')
assert len(ids) == len(set(ids)), 'Duplicate HTML anchor IDs'
for href in tree.xpath('//a[starts-with(@href,"#")]/@href'):
    assert href[1:] in ids, f'Unresolved anchor {href}'
prd_source = (ROOT / 'docs/product-v2/PRD-AgentDoor-协作任务全流程.md').read_text()
assert len(tree.xpath('//section[contains(@class,"prd-section")]')) == len(re.findall(r'^## \d+\. ', prd_source, re.M))

if '--text-only' in sys.argv:
    print(f'PASS: {len(reader.pages)} PDF pages, all 38 MCP tools, 6 Skills, valid HTML anchors and text encoding; visual review remains separate')
    raise SystemExit(0)

pages = []
for index in range(1, len(reader.pages) + 1):
    path = ROOT / f'tmp/pdfs/prd-v1.1/final-{index:02d}.png'
    assert path.exists(), f'Missing rendered page {index}'
    pages.append(path)
for offset in range(0, len(pages), 12):
    selected = pages[offset:offset+12]
    sheet = Image.new('RGB', (1080, 4 * 535), '#e8ecf1')
    draw = ImageDraw.Draw(sheet)
    for index, path in enumerate(selected):
        page = Image.open(path).convert('RGB')
        page.thumbnail((340, 495))
        x, y = (index % 3) * 360 + 10, (index // 3) * 535 + 20
        sheet.paste(page, (x, y))
        draw.text((x, y-15), f'Page {offset+index+1:02d}', fill='#222222')
    sheet.save(ROOT / f'tmp/pdfs/prd-v1.1/contact-{offset//12+1}.png')
print(f'PASS: {len(reader.pages)} PDF pages, all 38 MCP tools, 6 Skills, valid HTML anchors and text encoding')
