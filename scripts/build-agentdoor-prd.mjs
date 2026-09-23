import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const prdRoot = path.join(projectRoot, "docs/prd");
const outputRoot = path.join(projectRoot, "public/prd");
const requiredMetadata = [
  "module_id",
  "title",
  "group",
  "version",
  "status",
  "last_change",
  "summary",
];
const expectedHeadings = [
  "1. 目的",
  "2. 范围和边界",
  "3. 详细功能设计",
  "4. 功能验收标准",
];
const sectionSuffixes = ["purpose", "boundary", "detail", "acceptance"];

export function parseFrontmatter(source, filePath) {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) throw new Error(`${filePath}: missing frontmatter`);

  const metadata = Object.fromEntries(
    match[1]
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const splitAt = line.indexOf(":");
        if (splitAt < 1) throw new Error(`${filePath}: invalid frontmatter line`);
        return [
          line.slice(0, splitAt).trim(),
          line.slice(splitAt + 1).trim().replace(/^"|"$/g, ""),
        ];
      }),
  );

  return { metadata, body: normalized.slice(match[0].length) };
}

export function validateModule(module) {
  for (const key of requiredMetadata) {
    if (!module.metadata[key]) {
      throw new Error(`${module.filePath}: missing ${key}`);
    }
  }

  const headings = [...module.body.matchAll(/^## (.+)$/gm)].map(
    (match) => match[1] === "4. 验收标准" ? "4. 功能验收标准" : match[1],
  );
  if (JSON.stringify(headings) !== JSON.stringify(expectedHeadings)) {
    throw new Error(`${module.filePath}: invalid module headings`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(module.metadata.module_id)) {
    throw new Error(`${module.filePath}: invalid module_id`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(source) {
  return escapeHtml(source)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function isTableDivider(line) {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 1 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function tableCells(line, tag) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => `<${tag}>${renderInline(cell.trim())}</${tag}>`)
    .join("");
}

function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (/^<(?:h[1-6]|figure)\b/.test(line)) {
      html.push(line);
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.includes("|") && isTableDivider(lines[index + 1] ?? "")) {
      const firstHeader = line.trim().replace(/^\||\|$/g, "").split("|")[0]?.trim() ?? "";
      const tableClass = firstHeader.endsWith("步骤") ? ' class="step-table"' : "";
      const rows = [`<thead><tr>${tableCells(line, "th")}</tr></thead>`];
      index += 2;
      const bodyRows = [];
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        bodyRows.push(`<tr>${tableCells(lines[index], "td")}</tr>`);
        index += 1;
      }
      rows.push(`<tbody>${bodyRows.join("")}</tbody>`);
      html.push(`<table${tableClass}>${rows.join("")}</table>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^[-*]\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(`<li>${renderInline(lines[index].replace(/^\d+\.\s+/, ""))}</li>`);
        index += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(?:#{1,6}\s|<|[-*]\s+|\d+\.\s+)/.test(lines[index]) &&
      !(lines[index].includes("|") && isTableDivider(lines[index + 1] ?? ""))
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return html.join("\n");
}

function plainText(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function moduleLinks(indexBody) {
  return [...indexBody.matchAll(/\[[^\]]+\]\((modules\/[^)]+\.md)\)/g)].map(
    (match) => match[1] === "4. 验收标准" ? "4. 功能验收标准" : match[1],
  );
}

function withStableHeadings(body, moduleId) {
  let h2Index = 0;
  return body
    .replace(/^\s*# .+\n+/, "")
    .replace(/^## (.+)$/gm, (_, title) => {
      const suffix = sectionSuffixes[h2Index];
      if (!suffix) throw new Error(`${moduleId}: unexpected second-level heading`);
      h2Index += 1;
      return `<h2 id="${moduleId}-${suffix}">${escapeHtml(title)}</h2>`;
    })
    .replace(/^### (\d+)\.(\d+) (.+)$/gm, (_, major, minor, title) => {
      const id = `${moduleId}-section-${major}-${minor}`;
      return `<h3 id="${id}">${major}.${minor} ${escapeHtml(title)}</h3>`;
    });
}

async function inlineFigures(body, modulePath) {
  const pattern = /!\[([^\]]+)\]\(([^)]+)\)\n\n\*([^*]*?(FIG-[A-Z]+-\d{3})[^*]*)\*/g;
  const matches = [...body.matchAll(pattern)];
  let rendered = body;

  for (const match of matches) {
    const [, alt, imageReference, caption, figureCode] = match;
    if (/^(?:https?:|data:)/.test(imageReference)) {
      throw new Error(`${modulePath}: figures must use local assets`);
    }
    const assetPath = path.resolve(path.dirname(modulePath), imageReference);
    if (!assetPath.startsWith(`${prdRoot}${path.sep}`)) {
      throw new Error(`${modulePath}: figure is outside docs/prd`);
    }
    const extension = path.extname(assetPath).toLowerCase();
    const mimeTypes = {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
    };
    const mimeType = mimeTypes[extension];
    if (!mimeType) throw new Error(`${modulePath}: unsupported image ${extension}`);
    const image = await readFile(assetPath);
    const source = `data:${mimeType};base64,${image.toString("base64")}`;
    const figureId = figureCode.toLowerCase();
    const figure = `<figure id="${figureId}"><img src="${source}" alt="${escapeHtml(alt)}"><figcaption>${escapeHtml(caption.trim())}</figcaption></figure>`;
    rendered = rendered.replace(match[0], figure);
  }

  const remainingLocalImages = [...rendered.matchAll(/!\[[^\]]*\]\((?!https?:|data:)[^)]+\)/g)];
  if (remainingLocalImages.length) {
    throw new Error(`${modulePath}: image requires a FIG code and caption`);
  }
  return rendered;
}

function wrapTables(html) {
  return html
    .replace(/<table\b[^>]*>/g, (tableTag) => `<div class="table-wrap">${tableTag}`)
    .replaceAll("</table>", "</table></div>");
}

function sectionIndex(module) {
  if (module.metadata.presentation === "gallery") return [];
  return expectedHeadings.map((title, index) => ({
    id: `${module.metadata.module_id}-${sectionSuffixes[index]}`,
    title,
  }));
}

function renderShell({ title, version, modules, changelogHtml, generatedAt }) {
  const navigationGroups = [];
  modules.forEach((module, index) => {
    const name = module.metadata.group || "文档";
    const lastGroup = navigationGroups.at(-1);
    const group = lastGroup?.name === name
      ? lastGroup
      : (() => {
          const created = { name, links: [] };
          navigationGroups.push(created);
          return created;
        })();
    group.links.push(
      `<a class="nav-link${index === 0 ? " is-active" : ""}" href="#${module.metadata.module_id}" data-module-link="${module.metadata.module_id}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(module.metadata.title)}</a>`,
    );
  });
  const navigation = navigationGroups
    .map(({ name, links }) => `<section class="nav-group"><div class="nav-group-title">${escapeHtml(name)}</div>${links.join("")}</section>`)
    .join("");
  const articles = modules
    .map(
      (module) => module.metadata.presentation === "gallery"
        ? `<article class="preview-gallery" id="${module.metadata.module_id}" data-module-id="${module.metadata.module_id}" aria-label="${escapeHtml(module.metadata.title)}" data-search-text="${escapeHtml(`${module.metadata.title} ${module.metadata.summary}`.toLowerCase())}">${module.html}</article>`
        : `<article id="${module.metadata.module_id}" data-module-id="${module.metadata.module_id}" data-search-text="${escapeHtml(`${module.metadata.title} ${module.metadata.summary} ${plainText(module.body)}`.toLowerCase())}">
        <header class="module-header">
          <div><p class="eyebrow">${escapeHtml(module.metadata.module_id)} · v${escapeHtml(module.metadata.version)}</p><h1>${escapeHtml(module.metadata.title)}</h1><p class="summary">${escapeHtml(module.metadata.summary)}</p></div>
          <button class="copy-link" type="button" data-copy-link="${module.metadata.module_id}">复制链接</button>
        </header>
        ${module.html}
      </article>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="TaskDoor 产品需求文档">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{color-scheme:light;--ink:#222838;--muted:#687286;--line:#e3e6ed;--soft:#f5f6f9;--accent:#5b5ee6;--accent-soft:#eeeeff;--paper:#fff;--sidebar:290px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.72}.sidebar{position:fixed;inset:0 auto 0 0;width:var(--sidebar);padding:32px 24px;background:#fafafd;border-right:1px solid var(--line);overflow:auto;z-index:10}.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;font-size:17px;font-weight:760}.brand-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--ink);color:#fff}.search-wrap{position:relative;display:block}.search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:18px;height:18px;color:var(--muted);pointer-events:none}#prd-search{display:block;width:100%;height:42px;padding:0 12px 0 40px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font:inherit;outline:none}#prd-search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.search-count{min-height:24px;margin:7px 2px 14px;color:var(--muted);font-size:13px}.nav-group+.nav-group{margin-top:16px}.nav-group-title{margin:0 10px 6px;color:#9299a8;font-size:11px;font-weight:760;letter-spacing:.08em}.nav-link{display:flex;gap:10px;align-items:center;margin:3px 0;padding:8px 10px;border-radius:9px;color:#4b5568;text-decoration:none}.nav-link span{color:#a1a8b5;font-size:12px}.nav-link:hover,.nav-link.is-active{background:var(--accent-soft);color:#4245bd}.sidebar-actions{display:grid;gap:8px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}button,.sidebar-actions a{border:0;background:none;color:inherit;font:inherit;cursor:pointer}.sidebar-actions a,.sidebar-actions button{padding:8px 10px;border-radius:8px;text-align:left;text-decoration:none}.sidebar-actions a:hover,.sidebar-actions button:hover{background:var(--soft)}.page{margin-left:var(--sidebar)}.document-header{padding:74px clamp(28px,7vw,100px) 56px;border-bottom:1px solid var(--line);background:linear-gradient(140deg,#fbfbff 0%,#fff 60%)}.document-header h1{max-width:760px;margin:10px 0 12px;font-size:clamp(38px,6vw,66px);line-height:1.08;letter-spacing:-.045em}.document-header p{max-width:650px;margin:0;color:var(--muted);font-size:18px}.meta{color:var(--accent);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.content{width:min(900px,calc(100% - 56px));margin:0 auto;padding:18px 0 100px}article{padding:72px 0 40px;border-bottom:1px solid var(--line);scroll-margin-top:22px}article[hidden]{display:none}.module-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;margin-bottom:44px}.module-header h1{margin:5px 0 5px;font-size:38px;line-height:1.2}.eyebrow{margin:0;color:var(--accent);font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase}.summary{margin:0;color:var(--muted);font-size:18px}.copy-link{flex:none;margin-top:25px;padding:8px 12px;border:1px solid var(--line);border-radius:9px;color:var(--muted)}.copy-link:hover{border-color:#bfc4d0;color:var(--ink)}h2{margin:54px 0 16px;font-size:27px;line-height:1.3;scroll-margin-top:24px}h3{margin:36px 0 12px;font-size:21px;scroll-margin-top:24px}p{margin:12px 0}strong{font-weight:720}ul,ol{padding-left:24px}li+li{margin-top:7px}figure{margin:32px 0;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}figure img{display:block;width:100%;height:auto;border-radius:10px}figcaption{padding:11px 5px 3px;color:var(--muted);font-size:14px}.table-wrap{max-width:100%;margin:22px 0;overflow-x:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;min-width:720px;border-collapse:collapse;font-size:14px}th,td{padding:13px 15px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--soft);font-weight:720}tr:last-child td{border-bottom:0}.step-table{table-layout:fixed;min-width:680px}.step-table th,.step-table td{overflow-wrap:anywhere;word-break:break-word}.step-table th:first-child,.step-table td:first-child{width:160px}.changelog{padding:70px 0}.changelog>h1{font-size:34px}.empty{display:none;padding:70px 0;text-align:center;color:var(--muted)}.empty.is-visible{display:block}.mobile-bar{display:none}.toast{position:fixed;right:22px;bottom:22px;padding:10px 15px;border-radius:9px;background:var(--ink);color:#fff;opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none}.toast.is-visible{opacity:1;transform:none}
    .preview-gallery{padding-top:32px}.preview-gallery figure{padding:0;margin:0 0 28px;overflow:hidden;background:#fff;border-radius:12px}.preview-gallery figure img{border-radius:0}
    .gallery-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}.gallery-groups,.gallery-paging{display:flex;gap:6px;align-items:center}.gallery-controls button{padding:7px 12px;border-radius:8px;color:var(--muted)}.gallery-controls button[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent);font-weight:650}.gallery-controls button:disabled{opacity:.3;cursor:default}.gallery-counter{font-size:12px;color:var(--muted);min-width:45px;text-align:center}.gallery-thumbs{display:flex;gap:10px;overflow-x:auto;padding:5px 3px 12px;margin-top:14px}.gallery-thumb{flex:0 0 128px;padding:3px;border:2px solid transparent;border-radius:8px;opacity:.65;transition:opacity .15s,border-color .15s}.gallery-thumb img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain;border-radius:4px}.gallery-thumb[aria-pressed="true"]{border-color:var(--accent);opacity:1}.gallery-thumb:hover{opacity:1}.preview-gallery button:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.preview-gallery.is-interactive figure{margin:0}.preview-gallery figure[hidden],.gallery-thumb[hidden]{display:none}@media print{.gallery-controls,.gallery-thumbs{display:none!important}.preview-gallery figure[hidden]{display:block!important}.preview-gallery.is-interactive figure{margin-bottom:28px}}
    .preview-gallery .gallery-caption{padding:12px 16px;margin:0;min-height:48px;background:#fafbfe;border-top:1px solid var(--line);font-size:14px;line-height:1.6;color:#59647b}
    .gallery-stage{position:relative}.gallery-side{position:absolute;top:50%;transform:translateY(-50%);display:grid;place-items:center;width:44px;height:64px;padding:0;border:1px solid rgba(210,216,228,.85);border-radius:12px;background:rgba(255,255,255,.94);color:#414b65;font-size:36px;line-height:1;box-shadow:0 4px 18px rgba(35,44,70,.14);transition:background .15s,box-shadow .15s;z-index:1}.gallery-side-previous{left:12px}.gallery-side-next{right:12px}.gallery-side:hover:not(:disabled){background:#eeeeff;color:#5b5ee6;box-shadow:0 5px 20px rgba(35,44,70,.22)}.gallery-side:disabled{opacity:.28;cursor:default;box-shadow:none}@media(max-width:760px){.gallery-side{width:34px;height:48px;font-size:28px}.gallery-side-previous{left:6px}.gallery-side-next{right:6px}}@media print{.gallery-side{display:none!important}}
    @media (max-width:760px){.mobile-bar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:rgba(255,255,255,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px);z-index:20}.mobile-bar button{padding:7px 10px;border:1px solid var(--line);border-radius:8px}.sidebar{transform:translateX(-100%);transition:transform .22s;box-shadow:12px 0 35px rgba(32,39,55,.12)}body.nav-open .sidebar{transform:none}.page{margin-left:0}.document-header{padding:48px 24px 38px}.content{width:min(100% - 36px,900px)}article{padding-top:50px}.module-header{display:block}.copy-link{margin-top:16px}body.nav-open:after{content:"";position:fixed;inset:0;background:rgba(22,27,38,.22);z-index:5}.document-header h1{font-size:40px}}
    @media print{.sidebar,.mobile-bar,.copy-link,.toast{display:none!important}.page{margin:0}.document-header{padding:20px 0 28px}.content{width:100%;padding:0}article,article[hidden]{display:block!important;break-before:page;border:0;padding:28px 0}article:first-child{break-before:auto}figure{break-inside:avoid}.changelog{break-before:page}.table-wrap{overflow:visible}a{color:inherit;text-decoration:none}}
  </style>
</head>
<body>
  <aside class="sidebar" aria-label="文档导航">
    <div class="brand"><span class="brand-mark">T</span>TaskDoor PRD</div>
    <label class="search-wrap"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input id="prd-search" type="search" aria-label="搜索模块或需求" placeholder="搜索模块或需求" autocomplete="off"></label>
    <div id="search-count" class="search-count">${modules.length} 个模块</div>
    <nav>${navigation}</nav>
    <div class="sidebar-actions"><a href="#changelog">需求变更日志</a><button id="print-prd" type="button">打印 / 导出 PDF</button></div>
  </aside>
  <div class="mobile-bar"><strong>TaskDoor PRD</strong><button id="toggle-nav" type="button" aria-expanded="false">目录</button></div>
  <main class="page">
    <header class="document-header"><div class="meta">Version ${escapeHtml(version)} · ${escapeHtml(generatedAt.slice(0,10))}</div><h1>${escapeHtml(title)}</h1><p>供团队成员开发与验收使用：功能流程、页面示例与功能验收标准。</p></header>
    <div class="content"><div id="empty-state" class="empty">没有找到匹配的模块，请更换关键词。</div>${articles}<section id="changelog" class="changelog">${changelogHtml}</section></div>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite">链接已复制</div>
  <script>
    document.querySelectorAll('.preview-gallery').forEach(gallery=>{
      const figures=[...gallery.querySelectorAll('figure')];if(!figures.length)return;
      const groups=[...new Set(figures.map(f=>f.dataset.galleryGroup))];
      const controls=document.createElement('div');controls.className='gallery-controls';
      const categories=document.createElement('div');categories.className='gallery-groups';categories.setAttribute('aria-label','截图分类');
      const paging=document.createElement('div');paging.className='gallery-paging';
      const previous=document.createElement('button');previous.textContent='←';previous.setAttribute('aria-label','上一张截图');
      const next=document.createElement('button');next.textContent='→';next.setAttribute('aria-label','下一张截图');
      const counter=document.createElement('span');counter.className='gallery-counter';counter.setAttribute('role','status');
      paging.append(previous,counter,next);controls.append(categories,paging);gallery.prepend(controls);
      const stage=document.createElement('div');stage.className='gallery-stage';gallery.append(stage);figures.forEach(figure=>stage.append(figure));
      const sidePrevious=document.createElement('button');sidePrevious.className='gallery-side gallery-side-previous';sidePrevious.textContent='‹';sidePrevious.setAttribute('aria-label','上一张截图');sidePrevious.title='上一张截图';
      const sideNext=document.createElement('button');sideNext.className='gallery-side gallery-side-next';sideNext.textContent='›';sideNext.setAttribute('aria-label','下一张截图');sideNext.title='下一张截图';
      stage.append(sidePrevious,sideNext);sidePrevious.addEventListener('click',()=>step(-1));sideNext.addEventListener('click',()=>step(1));
      const strip=document.createElement('div');strip.className='gallery-thumbs';strip.setAttribute('aria-label','截图缩略图');gallery.append(strip);
      let selected=0;let activeGroup=groups[0];
      const categoryButtons=groups.map(group=>{const button=document.createElement('button');button.textContent=group;button.addEventListener('click',()=>{activeGroup=group;select(figures.findIndex(f=>f.dataset.galleryGroup===group))});categories.append(button);return button});
      const thumbs=figures.map((figure,index)=>{const button=document.createElement('button');button.className='gallery-thumb';const img=figure.querySelector('img').cloneNode();button.setAttribute('aria-label',img.alt+'，第 '+(index+1)+' 张');button.setAttribute('aria-controls',figure.id);img.alt='';button.append(img);button.addEventListener('click',()=>select(index));strip.append(button);return button});
      function visibleIndices(){return figures.map((f,i)=>f.dataset.galleryGroup===activeGroup?i:-1).filter(i=>i>=0)}
      function select(index){selected=index;const visible=visibleIndices();figures.forEach((f,i)=>f.hidden=i!==selected);thumbs.forEach((b,i)=>{b.hidden=!visible.includes(i);b.setAttribute('aria-pressed',String(i===selected))});categoryButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(groups[i]===activeGroup)));const pos=visible.indexOf(selected);counter.textContent=(pos+1)+' / '+visible.length;previous.disabled=sidePrevious.disabled=pos===0;next.disabled=sideNext.disabled=pos===visible.length-1;const thumb=thumbs[selected];strip.scrollLeft=thumb.offsetLeft-strip.offsetLeft-(strip.clientWidth-thumb.clientWidth)/2;}
      function step(delta){const visible=visibleIndices();const pos=visible.indexOf(selected)+delta;if(pos>=0&&pos<visible.length)select(visible[pos])}
      previous.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));gallery.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();step(event.key==='ArrowLeft'?-1:1)}});
      gallery.classList.add('is-interactive');select(0);
    });
    const search=document.querySelector('#prd-search');const articles=[...document.querySelectorAll('article[data-module-id]')];const count=document.querySelector('#search-count');const empty=document.querySelector('#empty-state');let searchSnapshot='';function applySearch(value){const query=value.trim().toLowerCase();let visible=0;for(const article of articles){const match=!query||article.dataset.searchText.includes(query);article.hidden=!match;if(match)visible+=1}count.textContent=query?visible+' 个匹配模块':articles.length+' 个模块';empty.classList.toggle('is-visible',visible===0)}search.addEventListener('input',event=>applySearch(event.target.value));
    const links=[...document.querySelectorAll('[data-module-link]')];const observer=new IntersectionObserver(entries=>{const current=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(!current)return;for(const link of links)link.classList.toggle('is-active',link.dataset.moduleLink===current.target.id)},{rootMargin:'-15% 0px -65% 0px',threshold:[0,.25,.5]});articles.forEach(article=>observer.observe(article));
    const toast=document.querySelector('#toast');document.querySelectorAll('[data-copy-link]').forEach(button=>button.addEventListener('click',async()=>{const url=new URL(location.href);url.hash=button.dataset.copyLink;await navigator.clipboard.writeText(url.href);toast.classList.add('is-visible');setTimeout(()=>toast.classList.remove('is-visible'),1600)}));
    const toggle=document.querySelector('#toggle-nav');toggle.addEventListener('click',()=>{const open=document.body.classList.toggle('nav-open');toggle.setAttribute('aria-expanded',String(open))});document.querySelectorAll('.sidebar a').forEach(link=>link.addEventListener('click',()=>document.body.classList.remove('nav-open')));document.querySelector('#print-prd').addEventListener('click',()=>window.print());
    addEventListener('beforeprint',()=>{searchSnapshot=search.value;applySearch('')});addEventListener('afterprint',()=>applySearch(searchSnapshot));
  </script>
</body>
</html>`;
}

export async function build() {
  const indexPath = path.join(prdRoot, "index.md");
  const indexSource = await readFile(indexPath, "utf8");
  const index = parseFrontmatter(indexSource, indexPath);
  const links = moduleLinks(index.body);
  if (!links.length) throw new Error(`${indexPath}: no module links found`);

  const modules = [];
  const moduleIds = new Set();
  for (const relativePath of links) {
    const filePath = path.join(prdRoot, relativePath);
    const source = await readFile(filePath, "utf8");
    const module = { ...parseFrontmatter(source, filePath), filePath, relativePath };
    validateModule(module);
    if (moduleIds.has(module.metadata.module_id)) {
      throw new Error(`${filePath}: duplicate module_id ${module.metadata.module_id}`);
    }
    moduleIds.add(module.metadata.module_id);
    const figuresInlined = await inlineFigures(module.body, filePath);
    const prepared = withStableHeadings(figuresInlined, module.metadata.module_id);
    if (module.metadata.presentation === "gallery") {
      let group = "预览";
      module.html = [...figuresInlined.matchAll(/^### (.+)$|<figure\b[^>]*>[\s\S]*?<\/figure>/gm)]
        .map(([content, heading]) => {
          if (heading) { group = heading; return ""; }
          return content.replace("<figure ", `<figure data-gallery-group="${escapeHtml(group)}" `)
            .replace(/<figcaption>FIG-[A-Z]+-\d{3}\s*·\s*/, '<figcaption class="gallery-caption">');
        }).join("\n");
    } else {
      module.html = wrapTables(renderMarkdown(prepared));
    }
    modules.push(module);
  }

  // Resolve source-relative links for the standalone generated reading page.
  const moduleTargets = new Map(modules.map((module) => [module.filePath, module.metadata.module_id]));
  const referenceOutputs = new Map();
  for (const module of modules) {
    const references = [...module.html.matchAll(/href="([^"#]+\.md)"/g)];
    for (const [, reference] of references) {
      const target = path.resolve(path.dirname(module.filePath), reference);
      const moduleId = moduleTargets.get(target);
      if (moduleId) {
        module.html = module.html.replaceAll(`href="${reference}"`, `href="#${moduleId}"`);
      } else if (target.startsWith(`${path.join(prdRoot, "references")}${path.sep}`)) {
        const filename = `${path.basename(target, ".md")}.html`;
        const source = await readFile(target, "utf8");
        const title = source.match(/^# (.+)$/m)?.[1] || path.basename(target, ".md");
        referenceOutputs.set(filename, { source, title });
        module.html = module.html.replaceAll(`href="${reference}"`, `href="./references/${filename}"`);
      }
    }
  }

  const changelogSource = await readFile(path.join(prdRoot, "CHANGELOG.md"), "utf8");
  for (const module of modules) {
    const changePattern = new RegExp(
      `\\|\\s*${module.metadata.last_change.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*\\|`,
    );
    if (!changePattern.test(changelogSource)) {
      throw new Error(
        `${module.filePath}: last_change ${module.metadata.last_change} is missing from CHANGELOG.md`,
      );
    }
  }
  const changelogHtml = wrapTables(renderMarkdown(changelogSource));
  const generatedAt = new Date().toISOString();
  const title = index.metadata.title || "TaskDoor 产品需求文档";
  const version = index.metadata.version || "0.1";
  const html = renderShell({ title, version, modules, changelogHtml, generatedAt });
  const moduleIndex = {
    version: "1.0",
    generatedAt,
    modules: modules.map((module) => ({
      moduleId: module.metadata.module_id,
      title: module.metadata.title,
      group: module.metadata.group,
      summary: module.metadata.summary,
      source: path.posix.join("docs/prd", module.relativePath),
      url: `./index.html#${module.metadata.module_id}`,
      sections: sectionIndex(module),
    })),
  };

  await mkdir(outputRoot, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputRoot, "index.html"), html),
    writeFile(
      path.join(outputRoot, "module-index.json"),
      `${JSON.stringify(moduleIndex, null, 2)}\n`,
    ),
  ]);
  if (referenceOutputs.size) {
    await mkdir(path.join(outputRoot, "references"), { recursive: true });
    for (const [filename, { source, title: referenceTitle }] of referenceOutputs) {
      const referenceModule = {
        metadata: { module_id: "reference", title: referenceTitle, version, summary: "功能校验参考" },
        body: source,
        html: '<p><a href="../index.html#account-identity">返回账号与个人资料模块</a></p>' + wrapTables(renderMarkdown(source)),
      };
      await writeFile(path.join(outputRoot, "references", filename), renderShell({
        title: referenceTitle, version, modules: [referenceModule], changelogHtml: "", generatedAt,
      }));
    }
  }
  console.log(`Built ${modules.length} PRD module(s) in public/prd/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
