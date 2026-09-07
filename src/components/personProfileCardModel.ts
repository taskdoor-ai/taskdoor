import type { PersonOption } from "../data/sharedTypes";

export type PersonProfileContact = {
  kind: "email" | "phone";
  value: string;
};

export function createPersonProfileCardModel(profile: PersonOption) {
  const contacts: PersonProfileContact[] = [];
  if (profile.email.trim()) contacts.push({ kind: "email", value: profile.email });
  if (profile.phone?.trim()) contacts.push({ kind: "phone", value: profile.phone });

  return {
    contacts,
    name: profile.name,
    responsibility: profile.dynamicResponsibility?.trim() || "未填写责任",
  };
}
