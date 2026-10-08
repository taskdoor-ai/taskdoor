import { useI18n } from "../i18n/I18nProvider";
import { ListTodo, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PersonAvatar } from "./PersonAvatar";
import { TeamSwitcher, type SwitchableTeam } from "./TeamSwitcher";
import type { PersonalCenterModule } from "./PersonalInfoDialog";
import { GlobalNotifications } from "./GlobalNotifications";

export type PrimarySection = "conversation" | "home" | "tasks" | "ai" | "settings";

type WorkspaceSidebarProps = {
  activeSection: PrimarySection;
  mobileOpen: boolean;
  onOpenPersonalCenter: (module: PersonalCenterModule) => void;
  onSectionChange: (section: PrimarySection) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  userId: string;
  userProfile: { name: string; title: string };
  activeTeamId: string;
  onTeamChange: (teamId: string) => void;
  teams: SwitchableTeam[];
};

const primaryItems = [
  { id: "tasks" as const, icon: <ListTodo size={18} />, label: "nav.tasks" as const },
];

export function WorkspaceSidebar({ activeSection, activeTeamId, mobileOpen, onOpenPersonalCenter, onSectionChange, onTeamChange, teams, theme, toggleTheme, userId, userProfile }: WorkspaceSidebarProps) {
  const { t } = useI18n();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const userMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => { if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false); };
    const closeWithKeyboard = (event: KeyboardEvent) => { if (event.key === "Escape") { setUserMenuOpen(false); userMenuTriggerRef.current?.focus(); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithKeyboard);
    firstMenuItemRef.current?.focus();
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", closeWithKeyboard); };
  }, [userMenuOpen]);

  return <div className={`workspace-nav ${mobileOpen ? "open" : ""} rail-only`}>
    <aside aria-label={t('nav.primary')} className="primary-rail">
      <TeamSwitcher activeTeamId={activeTeamId} compact onTeamChange={onTeamChange} teams={teams} />
      <nav>{primaryItems.map((item) => <button aria-label={t(item.label)} className={`rail-item ${activeSection === item.id || activeSection === "conversation" ? "active" : ""}`} data-tooltip={t(item.label)} key={item.id} onClick={() => onSectionChange(item.id)} type="button">{item.icon}</button>)}</nav>
      <div className="rail-bottom"><GlobalNotifications /><button aria-label={t('theme.toggle')} className="rail-item" data-tooltip={t('theme.toggle')} onClick={toggleTheme} type="button">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><div className="rail-user-dropdown" ref={userMenuRef}><button aria-controls="rail-user-menu" aria-expanded={userMenuOpen} aria-label={t('account.open')} className="rail-user-trigger" onClick={() => setUserMenuOpen((value) => !value)} ref={userMenuTriggerRef} type="button"><PersonAvatar name={userProfile.name} personId={userId} profilePreviewFocusable={false} showProfilePreview={false} size="sm" /></button>{userMenuOpen && <div aria-label={t('account.menu')} className="rail-user-menu" id="rail-user-menu"><div className="rail-user-menu-actions"><button onClick={() => { onOpenPersonalCenter("profile"); setUserMenuOpen(false); }} ref={firstMenuItemRef} type="button">{t('account.settings')}</button><button className="danger" type="button">{t('account.signOut')}</button></div></div>}</div></div>
    </aside>
  </div>;
}
