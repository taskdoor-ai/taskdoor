import assert from 'node:assert/strict';
import test from 'node:test';
import {taskProgressComparisonExamples} from '../src/data/taskProgressComparisonExamples.ts';
import {getTaskProgressComparison,getTaskProgressChart} from '../src/lib/taskProgressComparison.ts';
import {getTaskProgressDisplay} from '../src/lib/taskProgressDisplay.ts';
import {layoutBurnUpDateAxis} from '../src/components/TaskBurnUpTiming.tsx';
const series=taskProgressComparisonExamples.find(s=>s.id==='behind')!;
test('measured chart canvas holds SVG typography below 13 physical pixels at 700px without narrowing the chart',()=>{
 const display=getTaskProgressDisplay({series}),model=getTaskProgressComparison(series)!;
 for(const width of [700,280,1000]){
  const chart=getTaskProgressChart(model,undefined,{width});
  const axis=layoutBurnUpDateAxis({model:display,...chart,asOf:model.latest.at,fontSize:13});
  const left=Math.min(0,axis.labelStartX),viewWidth=Math.max(chart.width,axis.labelEndX)-left;
  const physicalFont=axis.fontSize*width/viewWidth;
  assert.ok(physicalFont<=13,`${width}px container produces ${physicalFont}px text`);
  if(width>=700)assert.ok(physicalFont>=12);
  assert.equal(chart.width,width);
  assert.equal(axis.labels.find(l=>l.date===display.finishOn)?.labelX,chart.finishX);
  for(const label of axis.labels){assert.equal(label.anchor,'middle');assert.ok(label.left>=left&&label.right<=left+viewWidth);}
 }
});


test('container observer follows resize and ignores zero hidden widths, then disconnects',async()=>{
 const {observeBurnUpWidth}=await import('../src/lib/useBurnUpWidth.ts');
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 let notify=()=>{},disconnected=false,observed:unknown,width=700;
 Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:class {constructor(callback:()=>void){notify=callback;}observe(element:unknown){observed=element;}disconnect(){disconnected=true;}}});
 try{
  const element={getBoundingClientRect:()=>({width})} as HTMLElement;
  const measured:number[]=[];
  const stop=observeBurnUpWidth(element,value=>measured.push(value));
  assert.equal(observed,element);
  width=280;notify();width=0;notify();width=700;notify();
  assert.deepEqual(measured,[700,280,700]);stop();assert.ok(disconnected);
 }finally{if(descriptor)Object.defineProperty(globalThis,'ResizeObserver',descriptor);else delete (globalThis as {ResizeObserver?:unknown}).ResizeObserver;}
});

test('recorded history canvas uses the same physical type scale and centered date bounds',async()=>{
 const {getTaskBurnUpModel}=await import('../src/lib/taskBurnUp.ts');
 const display=getTaskProgressDisplay({series});
 const recorded={source:'recorded' as const,points:[{at:'2026-09-07',scopeHours:8,completedHours:2,estimatedLeafCount:1,totalLeafCount:1},{at:'2026-09-14',scopeHours:8,completedHours:4,estimatedLeafCount:1,totalLeafCount:1}]};
 const chart=getTaskBurnUpModel(recorded,{width:700,height:52,includeDates:['2026-09-21']});
 const x=(day:string)=>4+(Date.parse(day)-Date.parse('2026-09-07'))/(14*86400000)*(chart.width-8);
 const axis=layoutBurnUpDateAxis({model:display,start:'2026-09-07',end:'2026-09-21',asOf:'2026-09-14',startX:4,endX:chart.width-4,asOfX:x('2026-09-14'),dueX:x(display.dueOn!),finishX:x(display.finishOn!),fontSize:13});
 const left=Math.min(0,axis.labelStartX),viewWidth=Math.max(chart.width,axis.labelEndX)-left;
 assert.ok(axis.fontSize*700/viewWidth>=11.5&&axis.fontSize*700/viewWidth<=13);
 assert.equal(axis.labels.find(l=>l.date===display.finishOn)?.x,chart.width-4);
 for(const label of axis.labels)assert.ok(label.left>=left&&label.right<=left+viewWidth);
});
