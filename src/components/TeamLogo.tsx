import { Blocks, Building2, Factory, Headphones, Store } from "lucide-react";

type TeamLogoProps = {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  teamId: string;
};

const teamLogoIcons = {
  "customer-success": Headphones,
  platform: Blocks,
  retail: Store,
  "supply-operations": Factory,
} as const;

const teamLogoTones = {
  "customer-success": "green",
  platform: "purple",
  retail: "green",
  "supply-operations": "amber",
} as const;

export function TeamLogo({ name, size = "lg", teamId }: TeamLogoProps) {
  const Icon = teamLogoIcons[teamId as keyof typeof teamLogoIcons] ?? Building2;
  const tone = teamLogoTones[teamId as keyof typeof teamLogoTones] ?? "blue";

  return <span aria-label={`${name}标志`} className={`team-logo team-logo-${tone} team-logo-${size}`} role="img"><Icon aria-hidden="true" /></span>;
}
