import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { PersonOption } from "../data/sharedTypes";
import { createPersonDirectory, findPersonProfile, resolvePersonProfile, type PersonDirectory } from "./personDirectoryModel";

const emptyDirectory = createPersonDirectory([]);
const PersonDirectoryContext = createContext<PersonDirectory>(emptyDirectory);

export function PersonDirectoryProvider({ children, members }: { children: ReactNode; members: PersonOption[] }) {
  const directory = useMemo(() => createPersonDirectory(members), [members]);
  return <PersonDirectoryContext.Provider value={directory}>{children}</PersonDirectoryContext.Provider>;
}

export function usePersonProfile(identity: string | undefined) {
  return findPersonProfile(useContext(PersonDirectoryContext), identity);
}

export function useResolvedPersonProfile(input: { identity?: string; name: string; profile?: PersonOption | null }) {
  return resolvePersonProfile(useContext(PersonDirectoryContext), input);
}

export function usePersonOptions(identities: string[]) {
  const directory = useContext(PersonDirectoryContext);
  return useMemo(() => Array.from(new Set(identities)).map(identity =>
    resolvePersonProfile(directory, { identity, name: identity }) ?? { id: identity, name: identity, email: "", role: "" },
  ), [directory, identities]);
}
