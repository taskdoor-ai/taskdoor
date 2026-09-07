import { LogOut, Settings2 } from "lucide-react";
import { GlobalNotifications } from "./GlobalNotifications";
import { PersonAvatar } from "./PersonAvatar";
import type { PersonalCenterModule } from "./PersonalInfoDialog";
import { TeamSwitcher, type SwitchableTeam } from "./TeamSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import "../styles/workspace-shell.css";

type WorkspaceTopbarProps = {
  activeTeamId: string;
  onOpenPersonalCenter: (module: PersonalCenterModule) => void;
  onOpenTaskInsight: (taskId: string) => void;
  onTeamChange: (teamId: string) => void;
  teams: SwitchableTeam[];
  theme: "light" | "dark";
  toggleTheme: () => void;
  userId: string;
  userProfile: { name: string };
};

export function WorkspaceTopbar({ activeTeamId, onOpenPersonalCenter, onOpenTaskInsight, onTeamChange, teams, theme, toggleTheme, userId, userProfile }: WorkspaceTopbarProps) {
  return <header aria-label="工作区工具栏" className="workspace-topbar">
    <div className="workspace-topbar-inner">
      <div className="workspace-topbar-team">
        <TeamSwitcher activeTeamId={activeTeamId} onTeamChange={onTeamChange} teams={teams} variant="topbar" />
      </div>
      <div className="workspace-topbar-actions">
        <GlobalNotifications onOpenTaskInsight={onOpenTaskInsight} placement="topbar" />
        <DropdownMenu>
          <DropdownMenuTrigger aria-label="打开账户菜单" className="workspace-account-trigger" id="workspace-account-trigger" title={`${userProfile.name} · 账户菜单`}>
            <PersonAvatar name={userProfile.name} personId={userId} profilePreviewFocusable={false} showProfilePreview={false} size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="账户菜单" className="workspace-account-menu" sideOffset={8}>
            <ThemeToggle onToggle={toggleTheme} theme={theme} />
            <DropdownMenuItem onClick={() => onOpenPersonalCenter("profile")}><Settings2 aria-hidden="true" /><span>设置</span></DropdownMenuItem>
            <DropdownMenuItem variant="destructive"><LogOut aria-hidden="true" /><span>退出登录</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>;
}
