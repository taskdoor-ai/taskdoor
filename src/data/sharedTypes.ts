/** Shared data contracts kept free of component/runtime imports. */
export type PersonOption = {
  membershipStatus?: "active" | "invited";
  avatarUrl?: string;
  availability?: string;
  currentWork?: string[];
  dynamicResponsibility?: string;
  email: string;
  id: string;
  name: string;
  phone?: string;
  recentActivity?: string;
  role: string;
  statusMessage?: string;
};

export type TagIconName = "tag" | "folder" | "flag" | "layers" | "package" | "shopping" | "users" | "building" | "coins" | "shield" | "wrench" | "sparkles";
export type TagColorName = "gray" | "blue" | "cyan" | "teal" | "green" | "amber" | "orange" | "red" | "purple" | "pink";
export type TagDefinition = { id: string; name: string; icon: TagIconName; color: TagColorName };
