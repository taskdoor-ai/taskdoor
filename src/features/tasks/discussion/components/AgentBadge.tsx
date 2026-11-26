import { Bot } from "lucide-react";
import { agentIconUrls, monochromeAgentIcons } from "@/features/ai-connection/agent-icons";
import { knownAgentOf, type MessageVia } from "@/features/tasks/discussion/lib/agent-attribution";
import { useGlobalUi } from "@/shared/i18n/global-ui";
import "@/features/tasks/styles/agent-badge.css";

/** The reported tool and client, following the formal app's author attribution. */
export function AgentBadge({ via }: { via: MessageVia }) {
  const ui = useGlobalUi();
  const client = ui(via.client === "CLI" ? "通过 CLI" : via.client === "MCP" ? "通过 MCP" : "通过 API");
  const label = via.agent ? `${via.agent.name} · ${client}` : client;
  const known = via.agent ? knownAgentOf(via.agent.name) : null;
  return <span aria-label={label} className="discussion-agent-badge" role="img" title={label}>
    {known ? <img alt="" data-agent={known} data-agent-icon={known} data-agent-tone={monochromeAgentIcons.has(known) ? "mono" : undefined} src={agentIconUrls[known]} /> : <Bot aria-hidden="true" />}
  </span>;
}
