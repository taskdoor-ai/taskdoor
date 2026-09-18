import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const prdRoot = path.join(projectRoot, "docs/prd");
const outputRoot = path.join(projectRoot, "public/prd");
const requiredMetadata = [
  "module_id",
  "title",
  "version",
  "status",
  "last_change",
  "summary",
];
const expectedHeadings = [
  "1. 目的",
  "2. 范围和边界",
  "3. 详细功能设计",
  "4. 验收标准",
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
    (match) => match[1],
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
    (match) => match[1],
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
  return html.replaceAll("<table>", '<div class="table-wrap"><table>').replaceAll("</table>", "</table></div>");
}

function sectionIndex(module) {
  return expectedHeadings.map((title, index) => ({
    id: `${module.metadata.module_id}-${sectionSuffixes[index]}`,
    title,
  }));
}

function renderShell({ title, version, modules, changelogHtml, generatedAt }) {
  const navigation = modules
    .map(
      (module, index) =>
        `<a class="nav-link${index === 0 ? " is-active" : ""}" href="#${module.metadata.module_id}" data-module-link="${module.metadata.module_id}"><span>${String(index + 1).padStart(2, "0")}</span>${escapeHtml(module.metadata.title)}</a>`,
    )
    .join("");
  const articles = modules
    .map(
      (module) => `<article id="${module.metadata.module_id}" data-module-id="${module.metadata.module_id}" data-search-text="${escapeHtml(`${module.metadata.title} ${module.metadata.summary} ${plainText(module.body)}`.toLowerCase())}">
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
  <meta name="description" content="AgentDoor 产品需求文档">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{color-scheme:light;--ink:#222838;--muted:#687286;--line:#e3e6ed;--soft:#f5f6f9;--accent:#5b5ee6;--accent-soft:#eeeeff;--paper:#fff;--sidebar:290px}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,"PingFang SC","Microsoft YaHei",system-ui,sans-serif;line-height:1.72}.sidebar{position:fixed;inset:0 auto 0 0;width:var(--sidebar);padding:32px 24px;background:#fafafd;border-right:1px solid var(--line);overflow:auto;z-index:10}.brand{display:flex;align-items:center;gap:10px;margin-bottom:22px;font-size:17px;font-weight:760}.brand-mark{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--ink);color:#fff}.search-wrap{position:relative}.search-wrap span{position:absolute;left:12px;top:9px;color:var(--muted)}#prd-search{width:100%;height:42px;padding:0 12px 0 36px;border:1px solid var(--line);border-radius:11px;background:#fff;color:var(--ink);font:inherit;outline:none}#prd-search:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.search-count{min-height:24px;margin:7px 2px 18px;color:var(--muted);font-size:13px}.nav-label{margin:18px 8px 8px;color:#9aa1af;font-size:11px;font-weight:750;letter-spacing:.12em}.nav-link{display:flex;gap:10px;align-items:center;margin:3px 0;padding:9px 10px;border-radius:9px;color:#4b5568;text-decoration:none}.nav-link span{color:#a1a8b5;font-size:12px}.nav-link:hover,.nav-link.is-active{background:var(--accent-soft);color:#4245bd}.sidebar-actions{display:grid;gap:8px;margin-top:22px;padding-top:18px;border-top:1px solid var(--line)}button,.sidebar-actions a{border:0;background:none;color:inherit;font:inherit;cursor:pointer}.sidebar-actions a,.sidebar-actions button{padding:8px 10px;border-radius:8px;text-align:left;text-decoration:none}.sidebar-actions a:hover,.sidebar-actions button:hover{background:var(--soft)}.page{margin-left:var(--sidebar)}.document-header{padding:74px clamp(28px,7vw,100px) 56px;border-bottom:1px solid var(--line);background:linear-gradient(140deg,#fbfbff 0%,#fff 60%)}.document-header h1{max-width:760px;margin:10px 0 12px;font-size:clamp(38px,6vw,66px);line-height:1.08;letter-spacing:-.045em}.document-header p{max-width:650px;margin:0;color:var(--muted);font-size:18px}.meta{color:var(--accent);font-size:13px;font-weight:720;letter-spacing:.08em;text-transform:uppercase}.content{width:min(900px,calc(100% - 56px));margin:0 auto;padding:18px 0 100px}article{padding:72px 0 40px;border-bottom:1px solid var(--line);scroll-margin-top:22px}article[hidden]{display:none}.module-header{display:flex;justify-content:space-between;gap:28px;align-items:flex-start;margin-bottom:44px}.module-header h1{margin:5px 0 5px;font-size:38px;line-height:1.2}.eyebrow{margin:0;color:var(--accent);font-size:12px;font-weight:750;letter-spacing:.09em;text-transform:uppercase}.summary{margin:0;color:var(--muted);font-size:18px}.copy-link{flex:none;margin-top:25px;padding:8px 12px;border:1px solid var(--line);border-radius:9px;color:var(--muted)}.copy-link:hover{border-color:#bfc4d0;color:var(--ink)}h2{margin:54px 0 16px;font-size:27px;line-height:1.3;scroll-margin-top:24px}h3{margin:36px 0 12px;font-size:21px;scroll-margin-top:24px}p{margin:12px 0}strong{font-weight:720}ul,ol{padding-left:24px}li+li{margin-top:7px}figure{margin:32px 0;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--soft)}figure img{display:block;width:100%;height:auto;border-radius:10px}figcaption{padding:11px 5px 3px;color:var(--muted);font-size:14px}.table-wrap{margin:22px 0;overflow-x:auto;border:1px solid var(--line);border-radius:12px}table{width:100%;min-width:720px;border-collapse:collapse;font-size:14px}th,td{padding:13px 15px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:var(--soft);font-weight:720}tr:last-child td{border-bottom:0}.changelog{padding:70px 0}.changelog>h1{font-size:34px}.empty{display:none;padding:70px 0;text-align:center;color:var(--muted)}.empty.is-visible{display:block}.mobile-bar{display:none}.toast{position:fixed;right:22px;bottom:22px;padding:10px 15px;border-radius:9px;background:var(--ink);color:#fff;opacity:0;transform:translateY(8px);transition:.2s;pointer-events:none}.toast.is-visible{opacity:1;transform:none}
    @media (max-width:760px){.mobile-bar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:12px 18px;background:rgba(255,255,255,.94);border-bottom:1px solid var(--line);backdrop-filter:blur(12px);z-index:20}.mobile-bar button{padding:7px 10px;border:1px solid var(--line);border-radius:8px}.sidebar{transform:translateX(-100%);transition:transform .22s;box-shadow:12px 0 35px rgba(32,39,55,.12)}body.nav-open .sidebar{transform:none}.page{margin-left:0}.document-header{padding:48px 24px 38px}.content{width:min(100% - 36px,900px)}article{padding-top:50px}.module-header{display:block}.copy-link{margin-top:16px}body.nav-open:after{content:"";position:fixed;inset:0;background:rgba(22,27,38,.22);z-index:5}.document-header h1{font-size:40px}}
    @media print{.sidebar,.mobile-bar,.copy-link,.toast{display:none!important}.page{margin:0}.document-header{padding:20px 0 28px}.content{width:100%;padding:0}article,article[hidden]{display:block!important;break-before:page;border:0;padding:28px 0}article:first-child{break-before:auto}figure{break-inside:avoid}.changelog{break-before:page}.table-wrap{overflow:visible}a{color:inherit;text-decoration:none}}
  </style>
</head>
<body>
  <aside class="sidebar" aria-label="文档导航">
    <div class="brand"><span class="brand-mark">A</span>AgentDoor PRD</div>
    <label class="search-wrap"><span>⌕</span><input id="prd-search" type="search" placeholder="搜索模块或需求" autocomplete="off"></label>
    <div id="search-count" class="search-count">${modules.length} 个模块</div>
    <div class="nav-label">模块</div>
    <nav>${navigation}</nav>
    <div class="sidebar-actions"><a href="#changelog">需求变更日志</a><button id="print-prd" type="button">打印 / 导出 PDF</button></div>
  </aside>
  <div class="mobile-bar"><strong>AgentDoor PRD</strong><button id="toggle-nav" type="button" aria-expanded="false">目录</button></div>
  <main class="page">
    <header class="document-header"><div class="meta">Version ${escapeHtml(version)} · ${escapeHtml(generatedAt.slice(0,10))}</div><h1>${escapeHtml(title)}</h1><p>以模块化 Markdown 为唯一内容源，连续呈现目标、边界、详细设计与验收标准。</p></header>
    <div class="content"><div id="empty-state" class="empty">没有找到匹配的模块，请更换关键词。</div>${articles}<section id="changelog" class="changelog">${changelogHtml}</section></div>
  </main>
  <div id="toast" class="toast" role="status" aria-live="polite">链接已复制</div>
  <script>
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
    module.html = wrapTables(await marked.parse(prepared, { gfm: true }));
    modules.push(module);
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
  const changelogHtml = wrapTables(await marked.parse(changelogSource, { gfm: true }));
  const generatedAt = new Date().toISOString();
  const title = index.metadata.title || "AgentDoor 产品需求文档";
  const version = index.metadata.version || "0.1";
  const html = renderShell({ title, version, modules, changelogHtml, generatedAt });
  const moduleIndex = {
    version: "1.0",
    generatedAt,
    modules: modules.map((module) => ({
      moduleId: module.metadata.module_id,
      title: module.metadata.title,
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
  console.log(`Built ${modules.length} PRD module(s) in public/prd/`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
