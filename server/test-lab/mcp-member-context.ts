import type {LabCase,LabTeam} from '../../src/test-lab/types.ts';
import type {McpConfig} from './mcp-execution.ts';
export function mcpConfigForCase(config:McpConfig,team:LabTeam,item:LabCase):McpConfig{
 if(!item.requiresMemberContext)return config;
 if(team.mcpWorkspaceId!==config.workspaceId)throw Error('成员分配用例的真实工作区与当前MCP配置不一致');
 if(!team.members.length||team.members.some(m=>!m.mcpMemberId||!m.responsibilities.length))throw Error('成员分配用例需要真实成员绑定与已确认职责');
 if(new Set(team.members.map(m=>m.mcpMemberId)).size!==team.members.length)throw Error('真实成员绑定不能重复');
 return {...config,memberContext:{source:'评测配置中用户确认的职责；身份在执行前通过真实MCP核对，职责不是MCP返回的数据',members:team.members.map(m=>({id:m.mcpMemberId!,name:m.name,responsibilities:m.responsibilities}))}};
}
