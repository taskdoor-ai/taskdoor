import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {skillZip,importSkillDirectory} from '../src/test-lab/skill-files.ts';

test('Skill ZIP 按目录保留文件和 UTF-8 内容，标准解压器可读取',()=>{
 const zip=join(mkdtempSync(join(tmpdir(),'skill-zip-')),'skill.zip');
 writeFileSync(zip,skillZip([{path:'skills/test/SKILL.md',content:'# 中文入口\n'},{path:'skills/test/scripts/check.py',content:'print("ok")\n'}]));
 assert.match(execFileSync('unzip',['-t',zip],{encoding:'utf8'}),/No errors/);
 assert.equal(execFileSync('unzip',['-p',zip,'skills/test/SKILL.md'],{encoding:'utf8'}),'# 中文入口\n');
 assert.throws(()=>skillZip([{path:'../escape',content:''}]),/路径/);
});
test('目录导入验证入口与文本格式，不默默丢弃文件',async()=>{
 const file=(name:string,content:string)=>({name,webkitRelativePath:`pack/${name}`,size:content.length,arrayBuffer:async()=>new TextEncoder().encode(content).buffer}) as File;
 const snapshot=await importSkillDirectory([file('SKILL.md','# 入口'),file('scripts/run.py','print(1)')],'agentdoor-task-planner');
 const bundle=await importSkillDirectory([file('skills/agentdoor-task-planner/SKILL.md','# 入口'),file('skills/shared/rules.md','规则')],'agentdoor-task-planner');
 assert.match(bundle,/FILE: skills\/shared\/rules.md/);
 assert.match(snapshot,/skills\/agentdoor-task-planner\/scripts\/run.py/);
 await assert.rejects(()=>importSkillDirectory([file('readme.md','x')],'agentdoor-task-planner'),/SKILL.md/);
 await assert.rejects(()=>importSkillDirectory([file('SKILL.md','\0')],'agentdoor-task-planner'),/二进制/);
});
