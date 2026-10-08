import { useGlobalUi } from "../i18n/globalUi";
import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import type { TagDefinition } from "../data/tagGroups";
import { TagManagementPage } from "./TagManagementPage";
import { Dialog, DialogContent, DialogDescription } from "./ui/dialog";

type PersonalTagsContextValue = {
  tags: TagDefinition[];
  onManage: (returnFocus?: HTMLElement | null) => void;
};
const PersonalTagsContext = createContext<PersonalTagsContextValue | null>(null);
export const usePersonalTags = () => useContext(PersonalTagsContext);

export function PersonalTagsProvider({ children, tags, onChange }: { children: ReactNode; tags: TagDefinition[]; onChange: (tags: TagDefinition[]) => void }) {
  const ui = useGlobalUi();
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  return <PersonalTagsContext.Provider value={{ tags, onManage: (trigger) => { returnFocus.current = trigger ?? null; setOpen(true); } }}>
    {children}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="personal-tags-dialog" finalFocus={() => returnFocus.current?.isConnected ? returnFocus.current : false}>
        <DialogDescription className="sr-only">{ui("管理你添加任务标签时可使用的个人标签。")}</DialogDescription>
        <TagManagementPage embedded tags={tags} onChange={onChange} />
      </DialogContent>
    </Dialog>
  </PersonalTagsContext.Provider>;
}
