import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export async function buildPrdProgressPreview() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = await build({
    root, configFile: false, publicDir: false, logLevel: 'warn',
    plugins: [react(), tailwindcss()],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false, minify: true,
      lib: { entry: fileURLToPath(new URL('../src/prd/TaskProgressPreview.tsx', import.meta.url)), name: 'AgentDoorProgressPreview', formats: ['iife'] },
    },
  });
  const output = (Array.isArray(result) ? result : [result]).flatMap(item => item.output);
  const js = output.filter(item => item.type === 'chunk').map(item => item.code).join('\n');
  const css = output.filter(item => item.type === 'asset' && item.fileName.endsWith('.css')).map(item => item.source).join('\n');
  if (!js || !css) throw new Error('PRD progress preview bundle is incomplete');
  // Inline the compiled shared component and styles so the PRD remains portable.
  const html = `<!doctype html>\n<!-- Generated from src/prd/TaskProgressPreview.tsx; run node scripts/sync-prd-technical.mjs. -->
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>任务完成进度 · PRD 组件预览</title><style>${css.replace(/<\/style/gi, '<\\/style')}</style></head><body><div id="root"></div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  await writeFile(new URL('../public/agentdoor-progress-preview.html', import.meta.url), html);
  console.log('Updated PRD progress preview from the shared React component');
}
