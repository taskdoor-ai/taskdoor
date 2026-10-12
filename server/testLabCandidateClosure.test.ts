import test from 'node:test';
import assert from 'node:assert/strict';
import {posix} from 'node:path';
import {loadSkill} from './test-lab/skills.ts';
import {splitSkillDocuments} from '../src/test-lab/markdown-files.ts';

test('four skill frozen packages contain every local markdown reference, including production chart contract',()=>{
 for(const id of ['agentdoor-task-planner','agentdoor-task-status-analyzer','agentdoor-responsibility-advisor','agentdoor-member-matcher'] as const){
  const docs=splitSkillDocuments(loadSkill(id).snapshot);const paths=new Set(docs.map(d=>d.path));
  for(const d of docs.filter(d=>d.path.endsWith('.md')))for(const match of d.content.matchAll(/\]\(([^)]+)\)/g)){
   const link=match[1].split('#')[0];if(!link||/^[a-z]+:|^#/.test(link))continue;
   assert.ok(paths.has(posix.normalize(posix.join(posix.dirname(d.path),link))),`${d.path} missing ${link}`);
  }
  if(id==='agentdoor-task-status-analyzer')assert.ok(paths.has('skills/'+id+'/references/production-progress-contract.md'));
 }
});
