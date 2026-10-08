import {Link,useLocation} from 'react-router-dom';
import {BarChart3,History,FolderCode,Users,Boxes,Plus} from 'lucide-react';
import {Button} from './ui/button';
import ThemeSelector from './ThemeSelector';
const items=[{href:'/evals',label:'评测结果',icon:BarChart3},{href:'/history',label:'执行记录',icon:History},{href:'/skills',label:'Skill 管理',icon:FolderCode},{href:'/mcp',label:'MCP 调试',icon:Boxes},{href:'/teams',label:'测试团队',icon:Users},{href:'/models',label:'模型管理',icon:Boxes}];
export default function Navigation(){const{pathname}=useLocation();return <aside className="eval-sidebar"><Link to="/evals" className="eval-brand"><span className="eval-brand-mark"><img src="/taskdo-mark.svg" alt="" width="26" height="32"/></span><span>TaskDo<small>自动化评测系统</small></span></Link><Button asChild className="eval-create"><Link to="/setup"><Plus size={16}/>新建评测</Link></Button><nav aria-label="评测平台主导航">{items.map(({href,label,icon:Icon})=><Link key={href} to={href} aria-current={pathname.startsWith(href)?'page':undefined}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="eval-sidebar-footer"><span>工作台外观</span><ThemeSelector/></div></aside>;}
