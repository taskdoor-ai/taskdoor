import { mockPersonName } from '@/ai/mock/i18n/mockContent';
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { LogOut, Plus, Settings2, Sparkles } from "lucide-react";
import { GlobalNotifications } from "@/features/notifications/components/GlobalNotifications";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import type { PersonalCenterModule } from "@/app/workspace/components/PersonalInfoDialog";
import { TeamSwitcher, type SwitchableTeam } from "@/app/workspace/components/TeamSwitcher";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { Button } from "@/shared/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/ui/dropdown-menu";
import "@/app/workspace/styles/workspace-shell.css";

type WorkspaceTopbarProps = {
  activeTeamId: string;
  onConnectAi: () => void;
  onCreateTask: () => void;
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

export function WorkspaceTopbar({ activeTeamId, onConnectAi, onCreateTask, onOpenPersonalCenter, onTeamChange, onSignOut, onOpenNotificationTask, showDemoNotifications = true, teams, theme, toggleTheme, userId, userProfile }: WorkspaceTopbarProps) {
  const { t, locale } = useI18n();
  return <header aria-label={t('workspace.toolbar')} className="workspace-topbar">
    <div className="workspace-topbar-inner">
      <div className="workspace-topbar-team">
        <TeamSwitcher activeTeamId={activeTeamId} onTeamChange={onTeamChange} teams={teams} variant="topbar" />
      </div>
      <div className="workspace-topbar-actions">
        <div className="workspace-topbar-primary-actions">
          <Button aria-label={t('list.new')} className="workspace-topbar-action workspace-new-task-trigger" onClick={onCreateTask} title={t('list.new')} type="button" variant="outline">
            <Plus aria-hidden="true" strokeWidth={1.8} /><span className="workspace-topbar-action-label">{t('list.new')}</span>
          </Button>
          <Button aria-label={t('ai.connect')} aria-haspopup="dialog" className="workspace-topbar-action workspace-ai-trigger" id="workspace-ai-trigger" onClick={onConnectAi} title={t('ai.guide')} type="button" variant="outline">
            <Sparkles aria-hidden="true" strokeWidth={1.8} /><span className="workspace-topbar-action-label">{t('ai.connect')}</span><span aria-hidden="true" className="workspace-topbar-ai-compact-label">AI</span>
          </Button>
        </div>
        <div className="workspace-topbar-utility-actions">
          <GlobalNotifications teamId={activeTeamId} userId={userId} key={activeTeamId} onOpenTask={onOpenNotificationTask} placement="topbar" showDemoNotifications={showDemoNotifications && activeTeamId === "creator-commerce"} />
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
    </div>
  </header>;
}
