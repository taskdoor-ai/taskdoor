import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { TeamLogo } from "./TeamLogo";

export type SwitchableTeam = {
  id: string;
  name: string;
  role: string;
};

type TeamSwitcherProps = {
  activeTeamId: string;
  compact?: boolean;
  onTeamChange: (teamId: string) => void;
  teams: SwitchableTeam[];
  variant?: "default" | "topbar";
};

export function TeamSwitcher({ activeTeamId, compact = false, onTeamChange, teams, variant = "default" }: TeamSwitcherProps) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  if (!activeTeam) return null;

  return <DropdownMenu>
    <DropdownMenuTrigger
      aria-label={`切换团队，当前为${activeTeam.name}`}
      className={`team-switcher-trigger ${compact ? "compact" : ""} ${variant === "topbar" ? "team-switcher-trigger-topbar" : ""}`}
      title={compact || variant === "topbar" ? activeTeam.name : undefined}
    >
      <TeamLogo name={activeTeam.name} size={variant === "topbar" ? "md" : "lg"} teamId={activeTeam.id} />
      {!compact && <span className="team-switcher-trigger-copy"><strong>{activeTeam.name}</strong>{variant !== "topbar" && <small>当前团队</small>}</span>}
      {variant === "topbar" && <ChevronDown aria-hidden="true" className="team-switcher-chevron" />}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="team-switcher-menu" side={compact ? "right" : "bottom"} sideOffset={8}>
      <div className="team-switcher-current">
        <TeamLogo name={activeTeam.name} teamId={activeTeam.id} />
        <span><strong>{activeTeam.name}</strong><small>{activeTeam.role}</small></span>
      </div>
      <DropdownMenuRadioGroup onValueChange={(value) => onTeamChange(String(value))} value={activeTeam.id}>
        <DropdownMenuLabel className="team-switcher-label">切换团队</DropdownMenuLabel>
        {teams.map((team) => <DropdownMenuRadioItem className="team-switcher-option" key={team.id} value={team.id}>
          <TeamLogo name={team.name} size="md" teamId={team.id} />
          <span className="team-switcher-option-copy"><strong>{team.name}</strong><small>{team.role}</small></span>
          {team.id === activeTeam.id && <Check aria-hidden="true" className="team-switcher-option-check" />}
        </DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}
