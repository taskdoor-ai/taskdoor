import { Home, ListTodo, Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PersonAvatar } from "./PersonAvatar";
import { TeamSwitcher, type SwitchableTeam } from "./TeamSwitcher";
import type { PersonalCenterModule } from "./PersonalInfoDialog";
import { GlobalNotifications } from "./GlobalNotifications";

export type PrimarySection = "home" | "tasks" | "ai" | "settings";

type WorkspaceSidebarProps = {
  activeSection: PrimarySection;
  mobileOpen: boolean;
  onOpenPersonalCenter: (module: PersonalCenterModule) => void;
  onOpenTaskInsight: (taskId: string) => void;
  onSectionChange: (section: PrimarySection) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  userProfile: { name: string; title: string };
  activeTeamId: string;
  onTeamChange: (teamId: string) => void;
  teams: SwitchableTeam[];
};

const primaryItems = [
  { id: "home" as const, icon: <Home size={18} />, label: "首页" },
  { id: "tasks" as const, icon: <ListTodo size={18} />, label: "任务" },
  { id: "ai" as const, icon: <Sparkles size={19} />, label: "连接 AI" },
];

export function WorkspaceSidebar({ activeSection, activeTeamId, mobileOpen, onOpenPersonalCenter, onOpenTaskInsight, onSectionChange, onTeamChange, teams, theme, toggleTheme, userProfile }: WorkspaceSidebarProps) {
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
    <aside aria-label="一级导航" className="primary-rail">
      <TeamSwitcher activeTeamId={activeTeamId} compact onTeamChange={onTeamChange} teams={teams} />
      <nav>{primaryItems.map((item) => <button aria-label={item.label} className={`rail-item ${item.id === "ai" ? "rail-connect-ai" : ""} ${activeSection === item.id ? "active" : ""}`} key={item.id} onClick={() => onSectionChange(item.id)} title={item.label} type="button">{item.icon}</button>)}</nav>
      <div className="rail-bottom"><GlobalNotifications onOpenTaskInsight={onOpenTaskInsight} /><button aria-label="切换主题" className="rail-item" onClick={toggleTheme} type="button">{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button><div className="rail-user-dropdown" ref={userMenuRef}><button aria-controls="rail-user-menu" aria-expanded={userMenuOpen} aria-label="打开设置菜单" className="rail-user-trigger" onClick={() => setUserMenuOpen((value) => !value)} ref={userMenuTriggerRef} type="button"><PersonAvatar name={userProfile.name} size="sm" /></button>{userMenuOpen && <div aria-label="设置菜单" className="rail-user-menu" id="rail-user-menu"><div className="rail-user-menu-actions"><button onClick={() => { onOpenPersonalCenter("profile"); setUserMenuOpen(false); }} ref={firstMenuItemRef} type="button">设置</button><button className="danger" type="button">退出登录</button></div></div>}</div></div>
    </aside>
  </div>;
}
