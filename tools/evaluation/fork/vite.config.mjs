import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../../..');
export default defineConfig({
 plugins:[{name:'browser-shared-modules',enforce:'pre',resolveId(source,importer){if(!importer)return;for(const name of ['logger','createHash'])if(new RegExp('(?:^|/)'+name+'(?:\\.ts)?$').test(source))return path.resolve(here,name==='logger'?'../logger.browser.ts':'../util/createHash.browser.ts');}},react()],
 resolve:{alias:{'@app':path.resolve(here,'src'),'@promptfoo':path.resolve(here,'..'),'@taskdoor':path.resolve(root,'src/test-lab')},dedupe:['react','react-dom']},
 server:{host:'127.0.0.1',port:15501,strictPort:true,fs:{allow:[root]},proxy:{'/api/test-lab':{target:'http://127.0.0.1:5173',changeOrigin:true,configure(proxy){proxy.on('proxyReq',(request)=>{request.setHeader('origin','http://127.0.0.1:5173');});}},'/api':{target:'http://127.0.0.1:15500',changeOrigin:true},'/socket.io':{target:'http://127.0.0.1:15500',ws:true,changeOrigin:true}}},
 css:{postcss:{plugins:[tailwind()]}},
 define:{'import.meta.env.VITE_TASKDOOR_UNIFIED':'true','import.meta.env.VITE_PUBLIC_PROMPTFOO_REMOTE_API_BASE_URL':JSON.stringify(''),'import.meta.env.VITE_PROMPTFOO_DISABLE_TELEMETRY':JSON.stringify('true'),'import.meta.env.VITE_POSTHOG_KEY':JSON.stringify(''),'import.meta.env.VITE_PUBLIC_BASENAME':JSON.stringify(''),'import.meta.env.VITE_PROMPTFOO_VERSION':JSON.stringify('TaskDoor / 0.123.1')},
 build:{outDir:path.resolve(root,'tools/evaluation/ui-dist'),emptyOutDir:true},
});
