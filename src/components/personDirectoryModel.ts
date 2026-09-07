import type { PersonOption } from "../data/sharedTypes";

export type PersonDirectory = {
  byId: ReadonlyMap<string, PersonOption>;
  byUniqueName: ReadonlyMap<string, PersonOption>;
};

export function createPersonDirectory(members: PersonOption[]): PersonDirectory {
  const byId = new Map<string, PersonOption>();
  const nameCounts = new Map<string, number>();

  members.forEach((member) => {
    byId.set(member.id, member);
    nameCounts.set(member.name, (nameCounts.get(member.name) ?? 0) + 1);
  });

  const byUniqueName = new Map<string, PersonOption>();
  members.forEach((member) => {
    if (nameCounts.get(member.name) === 1) byUniqueName.set(member.name, member);
  });

  return { byId, byUniqueName };
}

export function findPersonProfile(directory: PersonDirectory, identity: string | undefined) {
  if (!identity) return undefined;
  return directory.byId.get(identity) ?? directory.byUniqueName.get(identity);
}

const placeholderNames = new Set(["未分配", "未选择", "暂未设置"]);

export function resolvePersonProfile(directory: PersonDirectory, { identity, name, profile }: { identity?: string; name: string; profile?: PersonOption | null }) {
  if (profile === null || placeholderNames.has(name)) return undefined;
  if (profile) return profile;

  return findPersonProfile(directory, identity ?? name) ?? {
    email: "",
    id: identity ?? name,
    name,
    role: "",
  };
}
