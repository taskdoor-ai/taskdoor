import type {LabCase} from './types';
export const suggestedCaseTags=['重点：任务拆解','重点：成员匹配','重点：任务分配','重点：责任边界','重点：验收标准','重点：任务依赖','重点：人天估算','场景：资料缺失','场景：多轮调整','场景：范围变更','复杂度：基础','复杂度：中等','复杂度：高'];
// Initial suggestions use the case's purpose, not generic acceptance boilerplate.
export function initialCaseTags(c:LabCase){
 const text=c.name+' '+c.category;const tags:string[]=[];
 if(/拆解|拆分/.test(text)||c.origin==='decomposition/2026-09')tags.push('重点：任务拆解');
 if(/匹配成员|人员匹配|成员匹配/.test(text))tags.push('重点：成员匹配');
 if(/分配|负责人|明确责任/.test(c.name))tags.push('重点：任务分配');
 if(/责任|边界/.test(c.name))tags.push('重点：责任边界');
 if(/验收|完成标准/.test(c.name))tags.push('重点：验收标准');
 if(/依赖/.test(c.name))tags.push('重点：任务依赖');
 if(c.workload)tags.push('重点：成员匹配','重点：任务分配','场景：忙闲变化');
 if(/未知|缺失|缺口|不足/.test(c.name))tags.push('场景：资料缺失');
 if(c.steps.length>1)tags.push('场景：多轮调整');
 if(/范围|排除|缩减/.test(c.name))tags.push('场景：范围变更');
 if(/三层任务树/.test(c.name)||c.steps.length>1)tags.push('复杂度：高');
 if(!tags.length&&c.category&&c.category!=='自定义')tags.push('分类：'+c.category.slice(0,35));
 return [...new Set(tags)];
}
