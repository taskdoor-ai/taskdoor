import { useState } from "react";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { mockTeamName } from "../i18n/mockContent";
import { useI18n } from "../i18n/I18nProvider";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
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
  const { t, locale } = useI18n();
  const [createOpen, setCreateOpen] = useState(false);
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? teams[0];
  if (!activeTeam) return null;

  return <><DropdownMenu>
    <DropdownMenuTrigger
      aria-label={t('team.switchLabel', { name: mockTeamName(locale, activeTeam.id, activeTeam.name) })}
      className={`team-switcher-trigger ${compact ? "compact" : ""} ${variant === "topbar" ? "team-switcher-trigger-topbar" : ""}`}
      title={compact || variant === "topbar" ? mockTeamName(locale, activeTeam.id, activeTeam.name) : undefined}
    >
      <TeamLogo name={mockTeamName(locale, activeTeam.id, activeTeam.name)} size={variant === "topbar" ? "md" : "lg"} teamId={activeTeam.id} />
      {!compact && <span className="team-switcher-trigger-copy"><strong>{mockTeamName(locale, activeTeam.id, activeTeam.name)}</strong>{variant !== "topbar" && <small>{t('team.current')}</small>}</span>}
      {variant === "topbar" && <ChevronDown aria-hidden="true" className="team-switcher-chevron" />}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" className="team-switcher-menu" side={compact ? "right" : "bottom"} sideOffset={8}>
      <div className="team-switcher-current">
        <TeamLogo name={mockTeamName(locale, activeTeam.id, activeTeam.name)} teamId={activeTeam.id} />
        <strong>{mockTeamName(locale, activeTeam.id, activeTeam.name)}</strong>
      </div>
      <DropdownMenuRadioGroup className="team-switcher-list" onValueChange={(value) => onTeamChange(String(value))} value={activeTeam.id}>
        <DropdownMenuLabel className="team-switcher-label">{t('team.switch')}</DropdownMenuLabel>
        {teams.map((team) => <DropdownMenuRadioItem className="team-switcher-option" key={team.id} value={team.id}>
          <TeamLogo name={mockTeamName(locale, team.id, team.name)} size="md" teamId={team.id} />
          <strong className="team-switcher-option-name">{mockTeamName(locale, team.id, team.name)}</strong>
          {team.id === activeTeam.id && <Check aria-hidden="true" className="team-switcher-option-check" />}
        </DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
      <DropdownMenuItem className="team-switcher-create" onClick={() => setCreateOpen(true)}><Plus size={18} />{locale === "en" ? "Create team" : "创建团队"}</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>{createOpen && <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />}</>;
}
