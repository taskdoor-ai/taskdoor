import { isDeepStrictEqual } from 'node:util';
import type { LabAssertion, AssertionResult } from '../../src/test-lab/types.ts';
export function readPath(value:unknown,path:string):unknown {
  if(!path||path==='$')return value;
  const parts=path.replace(/^\$\.?/,'').replace(/\[(\d+)\]/g,'.$1').split('.');
  for(const key of parts){if(['__proto__','constructor','prototype'].includes(key))return undefined;if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=(value as Record<string,unknown>)[key];}
  return value;
}
export function evaluateAssertions(output:unknown,assertions:LabAssertion[]):AssertionResult[]{
  return assertions.map(a=>{
    const actual=readPath(output,a.path);let pass=false;
    if(a.operator!=='exists'&&actual===undefined)return {...a,status:'unknown',actual:null,message:'路径不存在，无法判定'};
    switch(a.operator){
      case 'exists':pass=actual!==undefined;break;
      case 'equals':pass=isDeepStrictEqual(actual,a.expected);break;
      case 'contains':pass=typeof actual==='string'&&typeof a.expected==='string'?actual.includes(a.expected):Array.isArray(actual)&&actual.some(v=>isDeepStrictEqual(v,a.expected));break;
      case 'not_contains':pass=typeof actual==='string'&&typeof a.expected==='string'?!actual.includes(a.expected):Array.isArray(actual)&&!actual.some(v=>isDeepStrictEqual(v,a.expected));break;
      case 'length':pass=(typeof actual==='string'||Array.isArray(actual))&&actual.length===a.expected;break;
      case 'gte':pass=typeof actual==='number'&&typeof a.expected==='number'&&actual>=a.expected;break;
      case 'lte':pass=typeof actual==='number'&&typeof a.expected==='number'&&actual<=a.expected;break;
    }
    return {id:a.id,label:a.label,status:pass?'passed':'failed',actual:actual??null,expected:a.expected,message:pass?'满足断言':'实际值未满足断言'};
  });
}
