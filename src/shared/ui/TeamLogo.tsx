import { Blocks, Building2, Factory, Headphones, type LucideIcon } from "lucide-react";
import { taskIconToneOptions, taskIconOptions } from "@/shared/model/appearance-options";
import type { TeamAppearance, TeamIconName } from "@/shared/model/team-appearance";

type TeamLogoProps = {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  teamId: string;
  appearance?: TeamAppearance;
};

export const teamIconOptions: Array<{ icon: LucideIcon; label: string; value: TeamIconName }> = [
  { icon: Building2, label: "团队组织", value: "building" },
  { icon: Blocks, label: "平台协作", value: "blocks" },
  { icon: Factory, label: "生产运营", value: "factory" },
  { icon: Headphones, label: "客户服务", value: "headphones" },
  ...taskIconOptions,
];

export function defaultTeamAppearance(teamId: string): TeamAppearance {
  // A seeded colour gives each team a varied background that stays stable on reload.
  const tones = taskIconToneOptions.filter(option => option.value !== "neutral");
  const seed = Array.from(teamId).reduce((hash, char) => ((hash * 31) + char.codePointAt(0)!) >>> 0, 0);
  return { iconTone: tones[seed % tones.length].value };
}

export function TeamLogo({ name, size = "lg", teamId, appearance }: TeamLogoProps) {
  const fallback = defaultTeamAppearance(teamId);
  const { iconName, iconTone, avatarDataUrl } = appearance ?? fallback;
  const Icon = teamIconOptions.find(option => option.value === iconName)?.icon ?? Building2;
  return <span aria-label={`${name} logo`} className={`team-logo team-logo-${iconTone} team-logo-${size}`} role="img">{avatarDataUrl ? <img alt="" src={avatarDataUrl} /> : iconName ? <Icon aria-hidden="true" /> : <span aria-hidden="true">{Array.from(name.trim())[0]?.toLocaleUpperCase() ?? "?"}</span>}</span>;
}
