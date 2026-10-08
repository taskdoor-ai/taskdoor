import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import {loadSkill} from './test-lab/skills.ts';

const schema=JSON.parse(readFileSync(new URL('../skills/agentdoor-task-planner/references/planning-v0.2.schema.json',import.meta.url),'utf8'));
const check=new Ajv2020({strict:false,validateFormats:false}).compile({$defs:schema.$defs,...schema.$defs.fields.properties.schedule});
test('Planning schedule accepts only a deadline, including an unknown deadline',()=>{
 for(const dueOn of [null,'2026-10-10']){
  const schedule={dueOn,basis:dueOn?'explicit':'unknown',assumptions:[],evidenceRefs:['req']};
  assert.equal(check(schedule),true,JSON.stringify(check.errors));
  assert.equal(check({...schedule,startOn:null}),false);
  assert.equal(check({...schedule,startOn:'2026-10-01'}),false);
 }
});
test('Current planning instructions enforce deadline-only output even with an older saved skill',()=>{
 for(const snapshot of [undefined,'Historical contract: schedule requires startOn and dueOn']){
  const skill=loadSkill('agentdoor-task-planner',snapshot);
  assert.match(skill.instructions,/schedule 只返回 dueOn、basis、assumptions、evidenceRefs/);
  if(snapshot)assert.equal(skill.snapshot,snapshot);
 }
});
