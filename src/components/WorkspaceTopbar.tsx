import { mockPersonName } from '../i18n/mockContent';
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../i18n/I18nProvider";
import { LogOut, Settings2, Sparkles } from "lucide-react";
import { GlobalNotifications } from "./GlobalNotifications";
import { PersonAvatar } from "./PersonAvatar";
import type { PersonalCenterModule } from "./PersonalInfoDialog";
import { TeamSwitcher, type SwitchableTeam } from "./TeamSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import "../styles/workspace-shell.css";

type WorkspaceTopbarProps = {
  activeTeamId: string;
  onConnectAi: () => void;
  onOpenPersonalCenter: (module: PersonalCenterModule) => void;
  onTeamChange: (teamId: string) => void;
  onSignOut?: () => void;
  showDemoNotifications?: boolean;
  onOpenNotificationTask?: (taskId: string) => void;
  teams: SwitchableTeam[];
  theme: "light" | "dark";
  toggleTheme: () => void;
  userId: string;
  userProfile: { name: string };
};

export function WorkspaceTopbar({ activeTeamId, onConnectAi, onOpenPersonalCenter, onTeamChange, onSignOut, onOpenNotificationTask, showDemoNotifications = true, teams, theme, toggleTheme, userId, userProfile }: WorkspaceTopbarProps) {
  const { t, locale } = useI18n();
  return <header aria-label={t('workspace.toolbar')} className="workspace-topbar">
    <div className="workspace-topbar-inner">
      <div className="workspace-topbar-team">
        <TeamSwitcher activeTeamId={activeTeamId} onTeamChange={onTeamChange} teams={teams} variant="topbar" />
      </div>
      <div className="workspace-topbar-actions">
        <GlobalNotifications key={activeTeamId} onOpenTask={onOpenNotificationTask} placement="topbar" showDemoNotifications={showDemoNotifications && activeTeamId === "creator-commerce"} />
        <button aria-haspopup="dialog" className="workspace-ai-trigger" id="workspace-ai-trigger" onClick={onConnectAi} title={t('ai.guide')} type="button">
          <span className="workspace-ai-trigger-label"><Sparkles aria-hidden="true" size={14} strokeWidth={1.8} /><span>{t('ai.connect')}</span></span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger aria-label={t('account.open')} className="workspace-account-trigger" id="workspace-account-trigger" title={`${mockPersonName(locale, userProfile.name, userProfile.name)} · ${t('account.menu')}`}>
            <PersonAvatar name={userProfile.name} personId={userId} profilePreviewFocusable={false} showProfilePreview={false} size="sm" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label={t('account.menu')} className="workspace-account-menu" sideOffset={8}>
            <ThemeToggle onToggle={toggleTheme} theme={theme} />
            <LanguageSwitcher menu />
            <DropdownMenuItem onClick={() => onOpenPersonalCenter("profile")}><Settings2 aria-hidden="true" /><span>{t('account.settings')}</span></DropdownMenuItem>
            <DropdownMenuItem onClick={onSignOut} variant="destructive"><LogOut aria-hidden="true" /><span>{t('account.signOut')}</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>;
}
