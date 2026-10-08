import type {LabState} from '../../src/test-lab/types.ts';
import {consolidateTestTeam} from './five-member-roster.ts';

export function updateContentTeamRoster(state:LabState){
 let changed=false;
 // The roster size is fixture data, not a product restriction.
 for(const team of state.teams)if(team.testMemberLimit!==undefined){delete team.testMemberLimit;changed=true;}
 const team=state.teams.find(t=>t.id==='lab-content');
 if(!team||team.testRosterVersion===1)return changed;
 const leader=team.members.find(m=>m.id==='zhou'),writer=team.members.find(m=>m.id==='lin'),reviewer=team.members.find(m=>m.id==='xu');
 if(!leader||!writer||!reviewer)return changed;
 const mapping=new Map(team.members.filter(m=>!['zhou','lin','xu'].includes(m.id)).map(m=>[m.id,m.id==='chen'?writer:reviewer]));
 consolidateTestTeam(state,team.id,mapping);
 team.members=[leader,reviewer,writer];
 leader.name='卜佳菲';leader.role='产品与项目统筹';leader.responsibilities=['明确品牌需求、交付范围和完成标准','协调预算、分工、截止日期与跨岗位交付','确认产品资料与授权边界，不代替专业审核'];leader.version++;
 writer.name='林洁';writer.role='内容与视觉制作';writer.responsibilities=['策划并交付宣传脚本、产品卖点文案和渠道适配文案','制作发布海报与视觉素材，核对画幅、版式和素材版本','根据已确认资料制作内容，不自行新增产品承诺'];writer.version++;
 reviewer.name='tiger huang';reviewer.role='审核与发布运营';reviewer.responsibilities=['核查文字、产品表述、素材引用与完成标准','准备活动执行、渠道发布与客服协作安排','整理核对记录与发布交接资料，未经批准不执行发布'];reviewer.version++;
 team.testRosterVersion=1;return true;
}
