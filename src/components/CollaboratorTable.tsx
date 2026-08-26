import { CircleDashed, Clock5, ScanSearch } from "lucide-react";

type Collaborator = {
  basis: string;
  name: string;
  role: string;
  status: string;
  tone: "fact" | "route" | "inference";
};

const collaborators: Collaborator[] = [
  { basis: "组织责任 · POS 交易域", name: "周岚", role: "拥有者", status: "待接受", tone: "route" },
  { basis: "代码变更 · 19 天前", name: "陈默", role: "执行", status: "建议加入", tone: "fact" },
  { basis: "门店灰度发布权限", name: "林洁", role: "授权", status: "需要确认", tone: "inference" },
];
const collaboratorStatusIcon = { fact: CircleDashed, inference: ScanSearch, route: Clock5 };

// Adapted from 21st.dev Team Members Table #22189 by cnippet.dev.
export function CollaboratorTable() {
  return (
    <section className="collaborator-section">
      <div className="collaborator-heading">
        <div><p>能力路由</p><h2>建议参与者</h2></div>
        <span>责任、能力与授权分开判断</span>
      </div>
      <div className="collaborator-table-frame">
        <table className="collaborator-table">
          <thead><tr><th>参与者</th><th>推荐依据</th><th>角色</th><th>状态</th></tr></thead>
          <tbody>
            {collaborators.map((person) => (
              <tr key={person.name}>
                <td><span className="table-person"><PersonAvatar name={person.name} size="sm" status={person.name === "周岚" ? "online" : undefined} /><strong>{person.name}</strong></span></td>
                <td>{person.basis}</td>
                <td><span className="table-role">{person.role}</span></td>
                <td>{(() => { const StatusIcon = collaboratorStatusIcon[person.tone]; return <span className={`table-status ${person.tone}`}><StatusIcon strokeWidth={3} />{person.status}</span>; })()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
import { PersonAvatar } from "./PersonAvatar";
