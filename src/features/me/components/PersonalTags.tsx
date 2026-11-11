import { createContext, useContext, type ReactNode } from "react";
import type { TagDefinition } from "@/shared/model/task-model";

type PersonalTagsContextValue = {
  tags: TagDefinition[];
  onManage: (returnFocus?: HTMLElement | null) => void;
  canManage?: boolean;
  canCreate?: boolean;
};
const PersonalTagsContext = createContext<PersonalTagsContextValue | null>(null);
export const usePersonalTags = () => useContext(PersonalTagsContext);

export function PersonalTagsProvider({ children, tags, onManage, canManage, canCreate }: PersonalTagsContextValue & { children: ReactNode }) {
  return <PersonalTagsContext.Provider value={{ tags, onManage, canManage, canCreate }}>{children}</PersonalTagsContext.Provider>;
}
