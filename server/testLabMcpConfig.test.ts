import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createMcpTokenConfig} from './test-lab/mcp-config.ts';
test('Token 默认使用环境配置；自定义持久化；空值保留；可恢复默认',()=>{
 const path=join(mkdtempSync(join(tmpdir(),'mcp-token-')),'config.json');const defaults={url:'https://example.com/mcp',token:'original-test-token',workspaceId:'w'};const config=createMcpTokenConfig(path,defaults);
 assert.equal(config.current().token,defaults.token);assert.equal(config.source(),'default');
 config.save('custom-test-token');assert.equal(config.source(),'custom');assert.equal(statSync(path).mode&0o777,0o600);
 const loaded=createMcpTokenConfig(path,defaults);assert.equal(loaded.current().token,'custom-test-token');loaded.save('  ');assert.equal(loaded.current().token,'custom-test-token');
 loaded.save(undefined,true);assert.equal(createMcpTokenConfig(path,defaults).current().token,defaults.token);assert.equal(loaded.source(),'default');
});
test('无效 Token 不覆盖已有值',()=>{
 const config=createMcpTokenConfig(join(mkdtempSync(join(tmpdir(),'mcp-token-')),'config.json'),{url:'https://example.com/mcp',token:'original',workspaceId:'w'});
 assert.throws(()=>config.save('bad\ntoken'),/格式无效/);assert.equal(config.current().token,'original');
});
